import React from "react";
import { signInWithGoogle, logout, auth } from "../lib/firebase";
import { LogIn, LogOut, Instagram } from "lucide-react";
import { motion } from "motion/react";

export const Auth: React.FC = () => {
  const [user, setUser] = React.useState(auth.currentUser);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (user) {
    return (
      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
    >
      <LogIn className="w-5 h-5" />
      Sign in with Google
    </motion.button>
  );
};

export const LoginView: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl shadow-lg">
            <Instagram className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">InstaClone AI</h1>
          <p className="text-gray-500">Connect with friends and share your moments.</p>
        </div>
        <div className="flex justify-center pt-4">
          <Auth />
        </div>
      </motion.div>
    </div>
  );
};
