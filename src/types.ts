export interface UserProfile {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  photoURL: string;
  bio?: string;
  username: string;
  createdAt: any;
  role?: 'admin' | 'moderator' | 'editor' | 'creator' | 'user';
  isVerified?: boolean;
  isVip?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  isEditor?: boolean;
  isCreator?: boolean;
  isBanned?: boolean;
  isMuted?: boolean;
  isFrozen?: boolean;
  isOnline?: boolean;
  lastSeen?: any;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto: string;
  imageUrl: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}
