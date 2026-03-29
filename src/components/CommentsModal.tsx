import React from "react";
import { X, Send, Loader2, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, increment, doc, updateDoc, getDoc } from "firebase/firestore";
import { Comment, UserProfile } from "../types";
import { formatDate } from "../lib/utils";

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ postId, onClose }) => {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const user = auth.currentUser;

  React.useEffect(() => {
    if (user) {
      const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubProfile();
    }
  }, [user]);

  React.useEffect(() => {
    const q = query(
      collection(db, `posts/${postId}/comments`),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
    });
    return unsubscribe;
  }, [postId]);

  const handleSend = async () => {
    if (!user || !newComment.trim()) return;
    if (profile?.isMuted) {
      alert("Your account is muted. You cannot comment.");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        postId,
        userId: user.uid,
        userName: profile?.username || user.displayName || "Anonymous",
        userPhoto: user.photoURL || "",
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(1)
      });
      setNewComment("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/comments`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-100"
      >
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="font-bold text-base tracking-tight">Comments</h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-sm">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <img 
                  src={(comment as any).userPhoto || ""} 
                  alt="" 
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">@{comment.userName}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                  <Heart className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-50 bg-white">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 focus-within:bg-white focus-within:ring-4 focus-within:ring-gray-100 focus-within:border-gray-200 border border-transparent transition-all">
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent outline-none text-sm py-1.5"
            />
            <button 
              onClick={handleSend}
              disabled={!newComment.trim() || sending}
              className="text-blue-500 font-bold text-sm disabled:opacity-30 hover:scale-105 transition-transform"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
