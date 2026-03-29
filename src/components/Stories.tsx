import React from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, where, limit } from "firebase/firestore";
import { UserProfile } from "../types";
import { Plus, X, Loader2, Camera, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Story {
  id: string;
  userId: string;
  username: string;
  photoURL: string;
  imageUrl: string;
  createdAt: any;
  expiresAt: any;
}

export const Stories: React.FC = () => {
  const [stories, setStories] = React.useState<Story[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedStory, setSelectedStory] = React.useState<Story | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newStoryUrl, setNewStoryUrl] = React.useState("");
  const user = auth.currentUser;

  React.useEffect(() => {
    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", new Date().toISOString()),
      orderBy("expiresAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      // Group by user
      const uniqueStories = storyList.reduce((acc, current) => {
        const x = acc.find(item => item.userId === current.userId);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as Story[]);
      
      setStories(uniqueStories);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "stories");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStoryUrl.trim()) return;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, "stories"), {
        userId: user.uid,
        username: user.email?.split("@")[0] || "anonymous",
        photoURL: user.photoURL || "",
        imageUrl: newStoryUrl.trim(),
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
      });

      setIsCreating(false);
      setNewStoryUrl("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "stories");
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Delete this story?")) return;
    try {
      await deleteDoc(doc(db, "stories", storyId));
      setSelectedStory(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  if (loading) return null;

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
        {/* Add Story Button */}
        <button 
          onClick={() => setIsCreating(true)}
          className="flex flex-col items-center gap-2 flex-shrink-0 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center group-hover:border-black transition-colors relative overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover opacity-50 rounded-2xl" alt="" referrerPolicy="no-referrer" />
            ) : (
              <Camera className="w-6 h-6 text-gray-300" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-black" />
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Story</span>
        </button>

        {stories.map((story) => (
          <button 
            key={story.id}
            onClick={() => setSelectedStory(story)}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-3xl p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shadow-lg shadow-red-500/10 active:scale-95 transition-transform">
              <div className="w-full h-full rounded-3xl border-2 border-white overflow-hidden bg-gray-100">
                <img 
                  src={story.photoURL} 
                  className="w-full h-full object-cover rounded-2xl" 
                  alt={story.username}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-900 truncate w-16 text-center">
              {story.username}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setSelectedStory(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={selectedStory.imageUrl} 
                className="w-full h-full object-cover" 
                alt=""
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedStory.photoURL} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-white font-bold text-sm">@{selectedStory.username}</p>
                    <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Active Now</p>
                  </div>
                </div>
                {user?.uid === selectedStory.userId && (
                  <button 
                    onClick={() => handleDeleteStory(selectedStory.id)}
                    className="p-2 bg-white/10 hover:bg-red-500/20 text-white rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold tracking-tight">Add to Story</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateStory} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
                  <input 
                    type="url"
                    required
                    value={newStoryUrl}
                    onChange={(e) => setNewStoryUrl(e.target.value)}
                    placeholder="https://picsum.photos/seed/story/1080/1920"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>

                {newStoryUrl && (
                  <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={newStoryUrl} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                >
                  Share Story
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
