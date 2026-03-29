import React from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { UserProfile } from "../types";
import { Shield, CheckCircle, Star, User as UserIcon, Loader2, X, Ban, VolumeX, Snowflake, Trash2, ShieldAlert, ShieldCheck, PenTool, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  const toggleStatus = async (userId: string, field: keyof UserProfile, currentValue: any) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [field]: !currentValue
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const setRole = async (userId: string, role: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="font-bold text-lg">System Administration</h3>
        </div>
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-md">
          {users.length} Users
        </span>
      </div>
      
      <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
        {users.map((u) => (
          <div key={u.uid} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={u.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${u.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">@{u.username || u.displayName}</p>
                  {u.isVerified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
                  {u.isVip && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                </div>
                <p className="text-xs text-gray-400 font-medium">{u.displayName} • {u.email}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Role Selector */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                <select 
                  value={u.role || 'user'}
                  onChange={(e) => setRole(u.uid, e.target.value)}
                  className="text-xs font-bold bg-transparent border-none focus:ring-0 py-1 pl-2 pr-8"
                >
                  <option value="user">User</option>
                  <option value="creator">Creator</option>
                  <option value="editor">Editor</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1" />

              {/* Moderation Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleStatus(u.uid, 'isBanned', u.isBanned)}
                  className={`p-2 rounded-xl transition-all ${u.isBanned ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                  title="Ban User"
                >
                  <Ban className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isMuted', u.isMuted)}
                  className={`p-2 rounded-xl transition-all ${u.isMuted ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'}`}
                  title="Mute User"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isFrozen', u.isFrozen)}
                  className={`p-2 rounded-xl transition-all ${u.isFrozen ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500'}`}
                  title="Freeze User"
                >
                  <Snowflake className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteUser(u.uid)}
                  className="p-2 rounded-xl bg-gray-100 text-gray-400 hover:bg-red-600 hover:text-white transition-all"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1" />

              {/* Badges */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleStatus(u.uid, 'isVerified', u.isVerified)}
                  className={`p-2 rounded-xl transition-all ${u.isVerified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Verify"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isVip', u.isVip)}
                  className={`p-2 rounded-xl transition-all ${u.isVip ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}
                  title="VIP"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isAdmin', u.isAdmin)}
                  className={`p-2 rounded-xl transition-all ${u.isAdmin ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Admin Badge"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isModerator', u.isModerator)}
                  className={`p-2 rounded-xl transition-all ${u.isModerator ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Moderator Badge"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isEditor', u.isEditor)}
                  className={`p-2 rounded-xl transition-all ${u.isEditor ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Editor Badge"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleStatus(u.uid, 'isCreator', u.isCreator)}
                  className={`p-2 rounded-xl transition-all ${u.isCreator ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Creator Badge"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
