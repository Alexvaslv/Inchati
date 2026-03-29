import React, { useRef } from "react";
import { auth, db, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserProfile } from "../types";
import { AdminPanel } from "./AdminPanel";
import { X, Camera, Loader2, Save, Shield, CheckCircle, Star, ShieldCheck, PenTool, Sparkles, Ban, VolumeX, Snowflake } from "lucide-react";
import { motion } from "motion/react";

interface EditProfileProps {
  profile: UserProfile | null;
  onClose: () => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ profile, onClose }) => {
  const [username, setUsername] = React.useState(profile?.username || "");
  const [firstName, setFirstName] = React.useState(profile?.firstName || "");
  const [lastName, setLastName] = React.useState(profile?.lastName || "");
  const [bio, setBio] = React.useState(profile?.bio || "");
  const [photoURL, setPhotoURL] = React.useState(profile?.photoURL || "");
  const [saving, setSaving] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && profile) {
      const file = e.target.files[0];
      setSaving(true);
      try {
        const storageRef = ref(storage, `avatars/${profile.uid}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        const userRef = doc(db, "users", profile.uid);
        await updateDoc(userRef, { photoURL: downloadURL });
        setPhotoURL(downloadURL);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `avatars/${profile.uid}`);
      } finally {
        setSaving(false);
      }
    }
  };

  const validateUsername = (val: string) => {
    const minLen = profile?.isVerified ? 3 : 5;
    const regex = new RegExp(`^[a-zA-Z0-9]{${minLen},15}$`);
    if (!regex.test(val)) {
      return `Username must be ${minLen}-15 characters and contain only English letters and numbers.`;
    }
    return "";
  };

  const handleSave = async () => {
    if (!profile) return;
    
    const error = validateUsername(username);
    if (error) {
      setUsernameError(error);
      return;
    }

    setSaving(true);
    setUsernameError("");
    try {
      const newUsername = username.toLowerCase().trim();
      const oldUsername = profile.username.toLowerCase();

      if (newUsername !== oldUsername) {
        // Check uniqueness
        const usernameRef = doc(db, "usernames", newUsername);
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
          setUsernameError("This username is already taken.");
          setSaving(false);
          return;
        }

        // Reserve new
        await setDoc(usernameRef, { uid: profile.uid });
        // Delete old if it exists (might not if it's the first time or legacy)
        try {
          await deleteDoc(doc(db, "usernames", oldUsername));
        } catch (e) {
          console.warn("Could not delete old username doc", e);
        }
      }

      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        username: newUsername,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim() || profile.displayName,
        bio: bio.trim(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-white z-[60] overflow-y-auto"
    >
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md py-2 z-10">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="text-blue-500 font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
            Done
          </button>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img 
              src={photoURL || profile?.photoURL} 
              alt="" 
              className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-100"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
          <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 text-sm font-bold">Change profile photo</button>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(profile?.isAdmin || profile?.role === 'admin') && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-600">Administrator</span>
            </div>
          )}
          {(profile?.isModerator || profile?.role === 'moderator') && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">Moderator</span>
            </div>
          )}
          {(profile?.isEditor || profile?.role === 'editor') && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
              <PenTool className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-600">Editor</span>
            </div>
          )}
          {(profile?.isCreator || profile?.role === 'creator') && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-50 rounded-full border border-pink-100">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-bold text-pink-600">Creator</span>
            </div>
          )}
          {profile?.isVerified && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
              <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
              <span className="text-xs font-bold text-blue-600">Verified</span>
            </div>
          )}
          {profile?.isVip && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <span className="text-xs font-bold text-amber-600">VIP</span>
            </div>
          )}
          {profile?.isMuted && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full border border-red-100">
              <VolumeX className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600">Muted</span>
            </div>
          )}
          {profile?.isFrozen && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
              <Snowflake className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-600">Frozen</span>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                  setUsernameError("");
                }}
                className={`w-full pl-8 pr-4 py-3 bg-gray-50 border ${usernameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} rounded-xl focus:ring-2 focus:border-transparent transition-all`}
                placeholder="username"
              />
            </div>
            {usernameError && <p className="text-xs text-red-500 ml-1 mt-1">{usernameError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="First Name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Last Name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Admin Section - Only for Admins */}
        {profile?.role === 'admin' && (
          <div className="pt-8 border-t border-gray-100 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold">Admin Controls</h3>
            </div>
            <AdminPanel />
          </div>
        )}
      </div>
    </motion.div>
  );
};
