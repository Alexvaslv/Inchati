import React from "react";
import { X, Image as ImageIcon, Sparkles, Loader2, Video, Type, FileText, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDropzone } from "react-dropzone";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { cn } from "../lib/utils";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const [image, setImage] = React.useState<string | null>(null);
  const [video, setVideo] = React.useState<string | null>(null);
  const [postType, setPostType] = React.useState<"text" | "image" | "video">("image");
  const [caption, setCaption] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type.startsWith("video/")) {
          setVideo(reader.result as string);
          setPostType("video");
        } else {
          setImage(reader.result as string);
          setPostType("image");
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "video/*": [] },
    multiple: false,
  } as any);

  const generateCaption = async () => {
    if (!image) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const base64Data = image.split(",")[1];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Write a short, engaging Instagram caption for this image. Use emojis." },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ]
      });
      setCaption(response.text || "");
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (postType !== "text" && !image && !video) return;

    setIsUploading(true);
    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhoto: user.photoURL || "",
        imageUrl: image || "",
        videoUrl: video || "",
        type: postType,
        caption,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      });
      onClose();
      setImage(null);
      setVideo(null);
      setCaption("");
      setPostType("image");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "posts");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
          >
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="font-bold text-base tracking-tight">Create New Post</h2>
              <button
                disabled={(postType !== "text" && !image && !video) || isUploading}
                onClick={handleUpload}
                className="px-4 py-1.5 bg-gray-900 text-white text-sm font-bold rounded-xl disabled:opacity-20 hover:bg-gray-800 transition-all active:scale-95"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="flex justify-center gap-4 mb-4">
                <button 
                  onClick={() => setPostType("image")}
                  className={cn("p-3 rounded-2xl transition-all", postType === "image" ? "bg-black text-white" : "bg-gray-50 text-gray-400")}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPostType("video")}
                  className={cn("p-3 rounded-2xl transition-all", postType === "video" ? "bg-black text-white" : "bg-gray-50 text-gray-400")}
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPostType("text")}
                  className={cn("p-3 rounded-2xl transition-all", postType === "text" ? "bg-black text-white" : "bg-gray-50 text-gray-400")}
                >
                  <Type className="w-5 h-5" />
                </button>
              </div>

              {postType !== "text" && !image && !video ? (
                <div
                  {...getRootProps()}
                  className={`aspect-square border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300 ${
                    isDragActive ? "border-gray-900 bg-gray-50 scale-[0.98]" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {postType === "image" ? <ImageIcon className="w-8 h-8 text-gray-300" /> : <Video className="w-8 h-8 text-gray-300" />}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-gray-900 font-bold">Upload a {postType === "image" ? "Photo" : "Video"}</p>
                    <p className="text-gray-400 text-sm">Drag and drop or click to browse</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {postType === "image" && image && (
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner group">
                      <img src={image} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <button
                        onClick={() => setImage(null)}
                        className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-xl hover:bg-black/60 backdrop-blur-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {postType === "video" && video && (
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-900 shadow-inner group flex items-center justify-center">
                      <video src={video} className="w-full h-full object-cover" controls />
                      <button
                        onClick={() => setVideo(null)}
                        className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-xl hover:bg-black/60 backdrop-blur-md transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {postType === "text" ? "Post Content" : "Caption"}
                      </label>
                      {postType === "image" && image && (
                        <button
                          onClick={generateCaption}
                          disabled={isGenerating}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider">AI Magic</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={postType === "text" ? "What's the news?" : "What's on your mind?"}
                      className="w-full p-5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-gray-100 focus:border-gray-200 transition-all outline-none text-sm font-medium leading-relaxed h-32 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
