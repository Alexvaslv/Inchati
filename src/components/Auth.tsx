import React from "react";
import { signInWithGoogle, logout, auth, registerWithEmail, signInWithEmail } from "../lib/firebase";
import { LogIn, LogOut, Instagram, Mail, Lock, User } from "lucide-react";
import { motion } from "motion/react";

export const Auth: React.FC = () => {
  const [user, setUser] = React.useState(auth.currentUser);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

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
    <div className="w-full max-w-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          className="w-full py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all"
        >
          {isRegistering ? "Register" : "Sign In"}
        </button>
      </form>
      
      <div className="text-center text-sm">
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-purple-600 hover:underline">
          {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
      >
        <LogIn className="w-5 h-5" />
        Sign in with Google
      </motion.button>
    </div>
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
