import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle, Star, ShieldCheck, Shield, PenTool, Sparkles, Play, FileText } from "lucide-react";
import { Post, UserProfile, Comment } from "../types";
import { formatDate, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, OperationType, handleFirestoreError } from "../lib/firebase";
import { doc, setDoc, deleteDoc, getDoc, updateDoc, increment, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { CommentsModal } from "./CommentsModal";

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(false);
  const [recentComments, setRecentComments] = React.useState<Comment[]>([]);
  const [authorProfile, setAuthorProfile] = React.useState<UserProfile | null>(null);
  const user = auth.currentUser;

  React.useEffect(() => {
    // Fetch author profile for badges
    const unsubProfile = onSnapshot(doc(db, "users", post.userId), (snap) => {
      if (snap.exists()) setAuthorProfile(snap.data() as UserProfile);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${post.userId}`);
    });

    if (!user) return () => unsubProfile();
    const checkState = async () => {
      const likeRef = doc(db, `posts/${post.id}/likes/${user.uid}`);
      const saveRef = doc(db, `users/${user.uid}/saved/${post.id}`);
      
      const [likeSnap, saveSnap] = await Promise.all([
        getDoc(likeRef),
        getDoc(saveRef)
      ]);
      
      setIsLiked(likeSnap.exists());
      setIsSaved(saveSnap.exists());
    };
    checkState();
  }, [post.id, user]);

  React.useEffect(() => {
    const q = query(
      collection(db, `posts/${post.id}/comments`),
      orderBy("createdAt", "desc"),
      limit(2)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${post.id}/comments`);
    });
    return unsubscribe;
  }, [post.id]);

  const handleSave = async () => {
    if (!user) return;
    const saveRef = doc(db, `users/${user.uid}/saved/${post.id}`);
    try {
      if (isSaved) {
        await deleteDoc(saveRef);
        setIsSaved(false);
      } else {
        await setDoc(saveRef, { 
          postId: post.id, 
          savedAt: new Date().toISOString(),
          imageUrl: post.imageUrl,
          authorName: post.authorName
        });
        setIsSaved(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/saved`);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    const likeRef = doc(db, `posts/${post.id}/likes/${user.uid}`);
    const postRef = doc(db, "posts", post.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likeCount: increment(-1) });
        setIsLiked(false);
      } else {
        await setDoc(likeRef, { userId: user.uid, createdAt: new Date().toISOString() });
        await updateDoc(postRef, { likeCount: increment(1) });
        setIsLiked(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${post.id}/likes`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-8 card-shadow"
    >
      <AnimatePresence>
        {isCommentsOpen && (
          <CommentsModal 
            postId={post.id} 
            onClose={() => setIsCommentsOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="relative p-0.5 rounded-2xl instagram-gradient">
            <img 
              src={post.authorPhoto} 
              alt={post.authorName} 
              className="w-8 h-8 rounded-2xl object-cover border-2 border-white"
              referrerPolicy="no-referrer"
            />
            {authorProfile?.isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">@{authorProfile?.username || post.authorName}</span>
              {authorProfile?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />}
              {authorProfile?.isVip && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
              {authorProfile?.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
              {authorProfile?.isModerator && <Shield className="w-3.5 h-3.5 text-orange-500" />}
              {authorProfile?.isEditor && <PenTool className="w-3.5 h-3.5 text-blue-500" />}
              {authorProfile?.isCreator && <Sparkles className="w-3.5 h-3.5 text-pink-500" />}
              {/* Fallback for legacy role-based badges */}
              {!authorProfile?.isAdmin && authorProfile?.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
              {!authorProfile?.isModerator && authorProfile?.role === 'moderator' && <Shield className="w-3.5 h-3.5 text-orange-500" />}
              {!authorProfile?.isEditor && authorProfile?.role === 'editor' && <PenTool className="w-3.5 h-3.5 text-blue-500" />}
              {!authorProfile?.isCreator && authorProfile?.role === 'creator' && <Sparkles className="w-3.5 h-3.5 text-pink-500" />}
            </div>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Sponsored</span>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-50 relative group overflow-hidden min-h-[200px] flex items-center justify-center">
        {post.type === "video" ? (
          <div className="relative w-full aspect-square bg-black flex items-center justify-center group">
            <video 
              src={post.videoUrl} 
              className="w-full h-full object-cover" 
              controls={false}
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
            </div>
          </div>
        ) : post.type === "text" ? (
          <div className="w-full p-12 text-center space-y-6 bg-gradient-to-br from-gray-50 to-white">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xl font-serif italic text-gray-800 leading-relaxed">
              "{post.caption}"
            </p>
            <div className="h-px w-12 bg-gray-100 mx-auto" />
          </div>
        ) : (
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onDoubleClick={handleLike}
          />
        )}
        
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <AnimatePresence>
            {isLiked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-white drop-shadow-2xl"
              >
                <Heart className="w-24 h-24 fill-current" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={cn("transition-all active:scale-125", isLiked ? "text-red-500" : "text-gray-800 hover:text-gray-400")}
            >
              <Heart className={cn("w-6 h-6", isLiked && "fill-current")} strokeWidth={2} />
            </button>
            <button 
              onClick={() => setIsCommentsOpen(true)}
              className="text-gray-800 hover:text-gray-400 transition-colors"
            >
              <MessageCircle className="w-6 h-6" strokeWidth={2} />
            </button>
            <button className="text-gray-800 hover:text-gray-400 transition-colors">
              <Send className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className={cn("transition-all active:scale-125", isSaved ? "text-black" : "text-gray-800 hover:text-gray-400")}
          >
            <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} strokeWidth={2} />
          </button>
        </div>

        {/* Likes */}
        <div className="font-bold text-sm tracking-tight">
          {post.likeCount.toLocaleString()} likes
        </div>

        {/* Caption */}
        {post.type !== "text" && (
          <div className="text-sm leading-relaxed">
            <span className="font-bold mr-2">{post.authorName}</span>
            <span className="text-gray-700">{post.caption}</span>
          </div>
        )}

        {/* Recent Comments */}
        {recentComments.length > 0 && (
          <div className="space-y-1 pt-1">
            {recentComments.map(comment => (
              <div key={comment.id} className="text-sm">
                <span className="font-bold mr-2">{comment.userName}</span>
                <span className="text-gray-600">{comment.text}</span>
              </div>
            ))}
            {post.commentCount > 2 && (
              <button 
                onClick={() => setIsCommentsOpen(true)}
                className="text-gray-400 text-xs font-medium hover:text-gray-600 transition-colors"
              >
                View all {post.commentCount} comments
              </button>
            )}
          </div>
        )}

        {/* Date */}
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-1">
          {formatDate(post.createdAt)}
        </div>
      </div>
    </motion.div>
  );
};
