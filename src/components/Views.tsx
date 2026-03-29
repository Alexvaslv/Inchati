import React from "react";
import { Search as SearchIcon, Grid, UserPlus, Bookmark, Instagram, Heart, LogOut, Loader2, MessageCircle, CheckCircle, Star, ShieldCheck, Shield, PenTool, Sparkles, LifeBuoy, ArrowLeft, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db, logout, handleFirestoreError, OperationType } from "../lib/firebase";
import { cn, formatDate } from "../lib/utils";
import { collection, query, where, orderBy, onSnapshot, doc } from "firebase/firestore";
import { Post, UserProfile } from "../types";
import { AdminPanel } from "./AdminPanel";
import { EditProfile } from "./EditProfile";

export const SearchView: React.FC<{ onSelectUser: (uid: string) => void, user: FirebaseUser | null }> = ({ onSelectUser, user }) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [results, setResults] = React.useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserProfile[]>([]);
  const [admins, setAdmins] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setAllUsers([]);
      setAdmins([]);
      return;
    }
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      const filteredUsers = users.filter(u => u.uid !== user.uid);
      setAllUsers(filteredUsers);
      setAdmins(filteredUsers.filter(u => u.isAdmin || u.isModerator || u.role === 'admin' || u.role === 'moderator'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return unsubscribe;
  }, [user]);

  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const filtered = allUsers.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setResults(filtered);
    setLoading(false);
  }, [searchTerm, allUsers]);
  
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="relative group">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for people..." 
          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-gray-100 focus:border-gray-200 transition-all outline-none text-sm font-medium"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
          </div>
        ) : searchTerm ? (
          results.length > 0 ? (
            results.map((user) => (
              <UserItem key={user.uid} user={user} onSelectUser={onSelectUser} />
            ))
          ) : (
            <div className="text-center py-32 text-gray-400">
              <p className="text-sm">No users found for "{searchTerm}"</p>
            </div>
          )
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 px-2">Administration</h3>
              {admins.map((admin) => (
                <UserItem key={admin.uid} user={admin} onSelectUser={onSelectUser} showReportButton />
              ))}
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 px-2">Recommended Users</h3>
              {allUsers.slice(0, 5).map((user) => (
                <UserItem key={user.uid} user={user} onSelectUser={onSelectUser} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const UserItem: React.FC<{ user: UserProfile; onSelectUser: (uid: string) => void; showReportButton?: boolean }> = ({ user, onSelectUser, showReportButton }) => {
  const [imgError, setImgError] = React.useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 hover:border-gray-100 transition-all shadow-sm cursor-pointer group"
    >
      <div className="flex items-center gap-4" onClick={() => onSelectUser(user.uid)}>
        <div className="relative p-0.5 rounded-2xl instagram-gradient">
          {!imgError ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center border-2 border-white">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight group-hover:underline">{user.username}</span>
            {user.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />}
          </div>
          <p className="text-xs text-gray-400 font-medium">{user.displayName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showReportButton && (
          <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Report">
            <LifeBuoy className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={() => onSelectUser(user.uid)}
          className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95"
        >
          View Profile
        </button>
      </div>
    </motion.div>
  );
};

export const ActivityView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-serif font-bold italic px-2">Activity</h1>
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-gray-200" />
        </div>
        <div className="space-y-2">
          <p className="font-bold text-gray-900 text-lg">Activity On Your Posts</p>
          <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">When someone likes or comments on one of your posts, you'll see it here.</p>
        </div>
      </div>
    </div>
  );
};

export const SupportView: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-12 px-4"
    >
      <div className="text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto text-purple-600">
          <LifeBuoy className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">How can we help?</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Our support team is available 24/7 to help you with any issues or questions you might have.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Live Chat</h4>
              <p className="text-sm text-gray-400">Average response time: 2 mins</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Safety Center</h4>
              <p className="text-sm text-gray-400">Report issues or learn about security</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Help Center</h4>
              <p className="text-sm text-gray-400">Browse articles and tutorials</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 p-8 bg-gray-50 rounded-3xl text-center">
        <p className="text-sm text-gray-500 mb-4">Still need help?</p>
        <button className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors">
          Contact Support
        </button>
      </div>
    </motion.div>
  );
};

export const UserProfileView: React.FC<{ uid: string; onBack?: () => void }> = ({ uid, onBack }) => {
  const [userPosts, setUserPosts] = React.useState<Post[]>([]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const currentUser = auth.currentUser;

  React.useEffect(() => {
    if (!uid) return;
    
    let unsubscribeFirestore: () => void;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      setLoading(true);
      // Fetch profile
      const profileUnsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      });

      // Fetch user posts
      const qPosts = query(
        collection(db, "posts"), 
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      
      const postsUnsubscribe = onSnapshot(qPosts, (snapshot) => {
        setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "posts");
        setLoading(false);
      });

      unsubscribeFirestore = () => {
        profileUnsubscribe();
        postsUnsubscribe();
      };
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-gray-100" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors font-bold uppercase tracking-widest text-[10px]">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>
      )}

      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 px-4">
        <div className="relative">
          <div className="p-1 rounded-full instagram-gradient">
            <img 
              src={profile.photoURL} 
              alt="Profile" 
              className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          {profile.isVip && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 p-2 rounded-full border-4 border-white shadow-md">
              <Star className="w-4 h-4 text-white fill-current" />
            </div>
          )}
        </div>
        
        <div className="space-y-8 flex-1 text-center md:text-left pt-2">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h2 className="text-3xl font-light text-gray-900 tracking-tight">@{profile.username}</h2>
                <div className="flex items-center gap-1.5">
                  {profile.isVerified && <CheckCircle className="w-6 h-6 text-blue-500 fill-current" />}
                  {profile.isVip && <Star className="w-6 h-6 text-yellow-500 fill-current" />}
                  {profile.isAdmin && <ShieldCheck className="w-6 h-6 text-purple-500" />}
                </div>
              </div>
              <p className="text-lg font-medium text-gray-400 tracking-tight">{profile.displayName}</p>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button className="px-8 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm">
                Follow
              </button>
              <button className="px-8 py-2 bg-white border border-gray-100 text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm">
                Message
              </button>
            </div>
          </div>
          
          <div className="flex justify-center md:justify-start gap-12">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">{userPosts.length}</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">posts</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">1.2k</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">followers</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">482</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">following</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${profile.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
              {profile.isOnline && <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</span>}
            </div>
            {profile.bio && (
              <p className="mt-3 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed max-w-md">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="flex justify-center gap-16">
          <button className="flex items-center gap-2 py-5 border-t-2 border-black -mt-[2px] text-[10px] font-bold uppercase tracking-[0.2em] text-black">
            <Grid className="w-4 h-4" strokeWidth={2.5} />
            Posts
          </button>
        </div>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Instagram className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">No Posts Yet</h3>
              <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                When @{profile.username} shares photos, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-8">
            {userPosts.map((post) => (
              <motion.div 
                key={post.id}
                whileHover={{ y: -4 }}
                className="aspect-square bg-gray-50 relative group cursor-pointer overflow-hidden rounded-xl shadow-sm"
              >
                <img 
                  src={post.imageUrl} 
                  alt="Post" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-8 text-white font-bold backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-1">
                    <Heart className="w-6 h-6 fill-current" />
                    <span className="text-xs">{post.likeCount}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <MessageCircle className="w-6 h-6 fill-current" />
                    <span className="text-xs">{post.commentCount}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export const ProfileView: React.FC = () => {
  const user = auth.currentUser;
  const [userPosts, setUserPosts] = React.useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = React.useState<any[]>([]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"posts" | "saved">("posts");

  React.useEffect(() => {
    let unsubscribeFirestore: () => void;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;
      
      // Fetch profile
      const profileUnsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });

      // Fetch user posts
      const qPosts = query(
        collection(db, "posts"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      
      const postsUnsubscribe = onSnapshot(qPosts, (snapshot) => {
        setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "posts");
        setLoading(false);
      });

      // Fetch saved posts
      const qSaved = query(
        collection(db, `users/${user.uid}/saved`),
        orderBy("savedAt", "desc")
      );
      const savedUnsubscribe = onSnapshot(qSaved, (snapshot) => {
        setSavedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/saved`);
      });

      unsubscribeFirestore = () => {
        profileUnsubscribe();
        postsUnsubscribe();
        savedUnsubscribe();
      };
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const displayPosts = activeTab === "posts" ? userPosts : savedPosts;

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <AnimatePresence>
        {isEditing && (
          <EditProfile 
            profile={profile} 
            onClose={() => setIsEditing(false)} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 px-4">
        <div className="relative">
          <div className="p-1 rounded-full instagram-gradient">
            <img 
              src={user?.photoURL || ""} 
              alt="Profile" 
              className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          {profile?.isVip && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 p-2 rounded-full border-4 border-white shadow-md">
              <Star className="w-4 h-4 text-white fill-current" />
            </div>
          )}
        </div>
        
        <div className="space-y-8 flex-1 text-center md:text-left pt-2">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h2 className="text-3xl font-light text-gray-900 tracking-tight">@{profile?.username || user?.displayName}</h2>
                <div className="flex items-center gap-1.5">
                  {profile?.isVerified && <CheckCircle className="w-6 h-6 text-blue-500 fill-current" />}
                  {profile?.isVip && <Star className="w-6 h-6 text-yellow-500 fill-current" />}
                  {profile?.isAdmin && <ShieldCheck className="w-6 h-6 text-purple-500" />}
                  {profile?.isModerator && <Shield className="w-6 h-6 text-orange-500" />}
                  {profile?.isEditor && <PenTool className="w-6 h-6 text-blue-500" />}
                  {profile?.isCreator && <Sparkles className="w-6 h-6 text-pink-500" />}
                  {/* Fallback for legacy role-based badges */}
                  {!profile?.isAdmin && profile?.role === 'admin' && <ShieldCheck className="w-6 h-6 text-purple-500" />}
                  {!profile?.isModerator && profile?.role === 'moderator' && <Shield className="w-6 h-6 text-orange-500" />}
                  {!profile?.isEditor && profile?.role === 'editor' && <PenTool className="w-6 h-6 text-blue-500" />}
                  {!profile?.isCreator && profile?.role === 'creator' && <Sparkles className="w-6 h-6 text-pink-500" />}
                </div>
              </div>
              <p className="text-lg font-medium text-gray-400 tracking-tight">{profile?.displayName}</p>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-8 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => logout()}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors md:hidden"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-center md:justify-start gap-12">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">{userPosts.length}</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">posts</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">1.2k</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">followers</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-lg font-bold">482</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">following</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
              {profile?.isOnline && <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                {[
                  profile?.isAdmin || profile?.role === 'admin' ? 'Administrator' : null,
                  profile?.isModerator || profile?.role === 'moderator' ? 'Moderator' : null,
                  profile?.isEditor || profile?.role === 'editor' ? 'Editor' : null,
                  profile?.isCreator || profile?.role === 'creator' ? 'Creator' : null,
                ].filter(Boolean).join(' • ') || 'Digital creator'}
              </p>
              {profile?.isAdmin && <ShieldCheck className="w-3 h-3 text-purple-500" />}
              {profile?.isModerator && <Shield className="w-3 h-3 text-orange-500" />}
              {profile?.isEditor && <PenTool className="w-3 h-3 text-blue-500" />}
              {profile?.isCreator && <Sparkles className="w-3 h-3 text-pink-500" />}
            </div>
            {profile?.bio && (
              <p className="mt-3 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed max-w-md">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="flex justify-center gap-16">
          <button 
            onClick={() => setActiveTab("posts")}
            className={cn(
              "flex items-center gap-2 py-5 border-t-2 -mt-[2px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
              activeTab === "posts" ? "border-black text-black" : "border-transparent text-gray-300 hover:text-gray-400"
            )}
          >
            <Grid className="w-4 h-4" strokeWidth={2.5} />
            Posts
          </button>
          <button 
            onClick={() => setActiveTab("saved")}
            className={cn(
              "flex items-center gap-2 py-5 border-t-2 -mt-[2px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
              activeTab === "saved" ? "border-black text-black" : "border-transparent text-gray-300 hover:text-gray-400"
            )}
          >
            <Bookmark className="w-4 h-4" strokeWidth={2.5} />
            Saved
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-gray-100" />
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              {activeTab === "posts" ? <Instagram className="w-8 h-8 text-gray-200" /> : <Bookmark className="w-8 h-8 text-gray-200" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{activeTab === "posts" ? "Share Your First Post" : "Save Posts"}</h3>
              <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                {activeTab === "posts" 
                  ? "When you share photos, they will appear on your profile for your followers to see."
                  : "Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-8">
            {displayPosts.map((post) => (
              <motion.div 
                key={post.id}
                whileHover={{ y: -4 }}
                className="aspect-square bg-gray-50 relative group cursor-pointer overflow-hidden rounded-xl shadow-sm"
              >
                <img 
                  src={post.imageUrl} 
                  alt="Post" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-8 text-white font-bold backdrop-blur-[2px]">
                  {activeTab === "posts" ? (
                    <>
                      <div className="flex flex-col items-center gap-1">
                        <Heart className="w-6 h-6 fill-current" />
                        <span className="text-xs">{post.likeCount}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <MessageCircle className="w-6 h-6 fill-current" />
                        <span className="text-xs">{post.commentCount}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Bookmark className="w-6 h-6 fill-current" />
                      <span className="text-xs">Saved</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
