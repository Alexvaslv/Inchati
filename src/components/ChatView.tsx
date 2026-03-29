import React from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, limit } from "firebase/firestore";
import { UserProfile } from "../types";
import { Send, Search, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  otherUser?: UserProfile;
}

export const ChatView: React.FC = () => {
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = React.useState<Chat | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<UserProfile[]>([]);
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const user = auth.currentUser;

  React.useEffect(() => {
    if (!user) return;

    // Initialize socket
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Fetch chats
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data() as Chat;
        const otherUserId = data.participants.find(p => p !== user.uid);
        let otherUser: UserProfile | undefined;
        
        if (otherUserId) {
          const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", otherUserId), limit(1)));
          if (!userSnap.empty) {
            otherUser = userSnap.docs[0].data() as UserProfile;
          }
        }
        
        return { id: chatDoc.id, ...data, otherUser };
      }));
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chats");
      setLoading(false);
    });

    return () => {
      unsubscribe();
      newSocket.disconnect();
    };
  }, [user]);

  React.useEffect(() => {
    if (!selectedChat || !socket) return;

    socket.emit("join_room", selectedChat.id);

    const q = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    socket.on("receive_message", (data) => {
      // Real-time update handled by onSnapshot, but socket can be used for typing indicators etc.
      console.log("Socket message received:", data);
    });

    return () => {
      unsubscribe();
      socket.off("receive_message");
    };
  }, [selectedChat, socket]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const messageData = {
        chatId: selectedChat.id,
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        text,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), messageData);
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });

      socket?.emit("send_message", {
        roomId: selectedChat.id,
        message: text,
        senderId: user.uid,
        senderName: user.displayName,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${selectedChat.id}/messages`);
    }
  };

  const startNewChat = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
    if (existingChat) {
      setSelectedChat(existingChat);
      setSearchTerm("");
      setSearchResults([]);
      return;
    }

    try {
      const chatData = {
        participants: [user.uid, otherUser.uid],
        lastMessage: "Started a new conversation",
        lastMessageAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "chats"), chatData);
      setSelectedChat({ id: docRef.id, ...chatData, otherUser });
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "chats");
    }
  };

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const q = query(
      collection(db, "users"),
      where("username", ">=", val.toLowerCase()),
      where("username", "<=", val.toLowerCase() + "\uf8ff"),
      limit(5)
    );

    const snap = await getDocs(q);
    setSearchResults(snap.docs.map(d => d.data() as UserProfile).filter(u => u.uid !== user?.uid));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-gray-100" />
        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Loading Chats</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-120px)] bg-white rounded-3xl border border-gray-100 shadow-xl flex overflow-hidden">
      {/* Sidebar */}
      <div className={cn("w-full md:w-80 border-r border-gray-100 flex flex-col", selectedChat && "hidden md:flex")}>
        <div className="p-6 border-b border-gray-100 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchTerm ? (
            <div className="p-2 space-y-1">
              {searchResults.map(u => (
                <button 
                  key={u.uid}
                  onClick={() => startNewChat(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
                >
                  <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-bold text-sm">@{u.username}</p>
                    <p className="text-xs text-gray-400">{u.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-sm text-gray-400">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left",
                    selectedChat?.id === chat.id ? "bg-black text-white shadow-lg shadow-black/10" : "hover:bg-gray-50"
                  )}
                >
                  <img src={chat.otherUser?.photoURL} className="w-12 h-12 rounded-full object-cover border-2 border-white" alt="" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm truncate">@{chat.otherUser?.username}</p>
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", selectedChat?.id === chat.id ? "text-white/60" : "text-gray-400")}>
                      {chat.lastMessage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col bg-gray-50/30", !selectedChat && "hidden md:flex items-center justify-center")}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4">
              <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img src={selectedChat.otherUser?.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
              <div>
                <p className="font-bold text-sm">@{selectedChat.otherUser?.username}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-2xl text-sm shadow-sm",
                      isMe ? "bg-black text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-6 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-50">
              <MessageCircle className="w-10 h-10 text-gray-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Your Messages</h3>
              <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">Send private photos and messages to a friend or group.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
