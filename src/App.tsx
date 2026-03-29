import React from "react";
import { auth, db, OperationType, handleFirestoreError } from "./lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { Post, UserProfile } from "./types";
import { Navbar } from "./components/Navbar";
import { PostCard } from "./components/PostCard";
import { CreatePostModal } from "./components/CreatePostModal";
import { LoginView } from "./components/Auth";
import { SearchView, ActivityView, ProfileView, SupportView, UserProfileView } from "./components/Views";
import { ChatView } from "./components/ChatView";
import { Stories } from "./components/Stories";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Instagram, Ban } from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const [user, setUser] = React.useState(auth.currentUser);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState("home");
  const [selectedProfileUid, setSelectedProfileUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        const isAdminEmail = u.email === "alexeivasilev270819942@gmail.com";
        
        if (!userSnap.exists()) {
          const role = isAdminEmail ? "admin" : "user";
          
          // Generate valid username (5-15 chars, alphanumeric, 3-15 for admins)
          const minLen = isAdminEmail ? 3 : 5;
          let baseUsername = (u.email?.split("@")[0] || "").replace(/[^a-zA-Z0-9]/g, "");
          if (baseUsername.length < minLen) {
            baseUsername = (baseUsername + u.uid.slice(0, minLen)).slice(0, minLen);
          }
          if (baseUsername.length > 15) {
            baseUsername = baseUsername.slice(0, 15);
          }
          
          let finalUsername = baseUsername.toLowerCase();
          
          // Try to reserve username
          try {
            const usernameRef = doc(db, "usernames", finalUsername);
            const usernameSnap = await getDoc(usernameRef);
            if (usernameSnap.exists()) {
              finalUsername = (finalUsername.slice(0, 10) + u.uid.slice(0, 5)).toLowerCase();
            }
            await setDoc(doc(db, "usernames", finalUsername), { uid: u.uid });
          } catch (e) {
            console.error("Error reserving username:", e);
          }

          const nameParts = (u.displayName || "").split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName || "Anonymous",
            firstName,
            lastName,
            email: u.email || "",
            photoURL: u.photoURL || "",
            username: finalUsername,
            role: role,
            isVerified: role === "admin",
            isAdmin: role === "admin",
            isModerator: role === "admin",
            isEditor: role === "admin",
            isCreator: role === "admin",
            isVip: role === "admin",
            isOnline: true,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        } else {
          const updateData: any = { isOnline: true, lastSeen: new Date().toISOString() };
          if (isAdminEmail && userSnap.data().role !== "admin") {
            updateData.role = "admin";
            updateData.isVerified = true;
            updateData.isAdmin = true;
            updateData.isModerator = true;
            updateData.isEditor = true;
            updateData.isCreator = true;
            updateData.isVip = true;
          }
          await updateDoc(userRef, updateData);
        }

        // Listen to profile changes for moderation
        onSnapshot(userRef, (profileSnap) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        });
      } else {
        setProfile(null);
      }
    });

    // Handle offline status on window close
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        updateDoc(userRef, { isOnline: false, lastSeen: new Date().toISOString() });
      } else if (document.visibilityState === 'visible' && auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        updateDoc(userRef, { isOnline: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  React.useEffect(() => {
    if (!isAuthReady || !user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "posts");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Instagram className="w-12 h-12 text-pink-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderContent = () => {
    if (profile?.isBanned) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <Ban className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Account Banned</h2>
            <p className="text-gray-500 max-w-sm mx-auto">Your account has been suspended for violating our community guidelines. Please contact support if you believe this is a mistake.</p>
          </div>
          <button onClick={() => setCurrentTab("support")} className="bg-black text-white px-8 py-3 rounded-xl font-bold">
            Contact Support
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case "search":
        return selectedProfileUid ? (
          <UserProfileView 
            uid={selectedProfileUid} 
            onBack={() => setSelectedProfileUid(null)} 
          />
        ) : (
          <SearchView onSelectUser={(uid) => setSelectedProfileUid(uid)} />
        );
      case "chat":
        return <ChatView />;
      case "activity":
        return <ActivityView />;
      case "support":
        return <SupportView />;
      case "profile":
        return <ProfileView />;
      default:
        return (
          <div className="space-y-6">
            <Stories />
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-gray-100" />
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Loading Feed</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-32 space-y-6 max-w-sm mx-auto">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-50">
                  <Instagram className="w-8 h-8 text-gray-200" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Welcome to InstaClone</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">Your feed is empty. Be the first to share a moment with the community!</p>
                </div>
                <button 
                  onClick={() => {
                    if (profile?.isFrozen) {
                      alert("Your account is currently frozen. You cannot create new posts.");
                    } else {
                      setIsCreateOpen(true);
                    }
                  }}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </AnimatePresence>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0 md:pt-16">
      <Navbar 
        onOpenCreate={() => setIsCreateOpen(true)} 
        currentTab={currentTab}
        setTab={setCurrentTab}
      />
      
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className={cn(currentTab === "home" ? "max-w-lg mx-auto" : "w-full")}>
          {renderContent()}
        </div>
      </main>

      <CreatePostModal 
        isOpen={isCreateOpen && !profile?.isFrozen} 
        onClose={() => setIsCreateOpen(false)} 
      />
    </div>
  );
}
