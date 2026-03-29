import React from "react";
import { Home, Search, PlusSquare, Heart, User, Instagram, LifeBuoy, MessageCircle } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Auth } from "./Auth";
import { cn } from "../lib/utils";
import { doc, onSnapshot } from "firebase/firestore";
import { UserProfile } from "../types";

interface NavbarProps {
  onOpenCreate: () => void;
  currentTab: string;
  setTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreate, currentTab, setTab }) => {
  const user = auth.currentUser;
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsub();
  }, [user]);

  const NavButton = ({ tab, icon: Icon }: { tab: string, icon: any }) => (
    <button 
      onClick={() => setTab(tab)}
      className={cn(
        "p-2.5 rounded-xl transition-all active:scale-95",
        currentTab === tab ? "text-black bg-gray-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
      )}
    >
      <Icon className={cn("w-6 h-6", currentTab === tab && "fill-current")} strokeWidth={currentTab === tab ? 2.5 : 2} />
    </button>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto glass-nav z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          onClick={() => setTab("home")}
          className="hidden md:flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 instagram-gradient rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Instagram className="w-5 h-5" />
          </div>
          <span className="text-xl font-serif font-bold italic tracking-tight group-hover:opacity-80 transition-opacity">
            InstaClone
          </span>
        </div>

        <div className="flex-1 md:flex-initial flex items-center justify-around md:justify-end gap-1 md:gap-4 w-full">
          <NavButton tab="home" icon={Home} />
          <NavButton tab="search" icon={Search} />
          <NavButton tab="chat" icon={MessageCircle} />
          <button 
            onClick={() => {
              if (profile?.isFrozen) {
                alert("Your account is frozen.");
              } else {
                onOpenCreate();
              }
            }}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 rounded-xl transition-all active:scale-95"
          >
            <PlusSquare className="w-6 h-6" strokeWidth={2} />
          </button>
          <NavButton tab="activity" icon={Heart} />
          <NavButton tab="support" icon={LifeBuoy} />
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTab("profile")}
              className={cn(
                "p-0.5 rounded-2xl transition-all active:scale-95 border-2",
                currentTab === "profile" ? "border-black" : "border-transparent"
              )}
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-7 h-7 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </button>
            <div className="hidden md:block border-l border-gray-100 pl-4">
              <Auth />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
