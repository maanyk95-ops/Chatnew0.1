import React, { useState, useEffect, useRef, useMemo, TouchEvent } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, get, off, push, update, serverTimestamp, set } from 'firebase/database';
import type { User, Chat, Message, PrivacySettings } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const MuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg>;
const UnmuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--theme-color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const BlockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ReplyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" /></svg>;

const ProfilePhotoViewer: React.FC<{
    photoURL: string | null;
    name: string | null;
    onClose: () => void;
}> = ({ photoURL, name, onClose }) => {
    if (!photoURL) return null;

    const handleDownload = () => {
        fetch(photoURL)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${(name || 'user').replace(/\s+/g, '_')}_profile_photo.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                     <p className="font-bold">{name}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><CloseIcon /></button>
            </header>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-2">
                <img src={photoURL} alt="profile photo" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <footer className="flex justify-around p-3">
                 <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-white"><DownloadIcon /><span>Download</span></button>
            </footer>
        </div>
    );
};

const FullscreenMediaViewer: React.FC<{
    media: {messages: Message[], startIndex: number}, 
    onClose: () => void, 
    onForward?: (msg: Message) => void, 
    onReply?: (msg: Message) => void, 
    currentUser: User, 
    chat: Chat, 
    onGoToMessage: (chat: Chat, messageId: string) => void
}> = ({ media, onClose, onForward, onReply, currentUser, chat, onGoToMessage }) => {
    const flatMedia = useMemo(() => media.messages.flatMap(msg => (msg.imageUrls || []).filter(Boolean).map(url => ({ url, message: msg }))), [media.messages]);
    const [currentIndex, setCurrentIndex] = useState(media.startIndex);
    const [touchState, setTouchState] = useState({ startX: 0, deltaX: 0, isSwiping: false });
    
    useEffect(() => {
        setCurrentIndex(media.startIndex);
    }, [media.startIndex]);
    
    const currentItem = flatMedia[currentIndex];
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') setCurrentIndex(p => Math.max(0, p - 1));
            if (e.key === 'ArrowRight') setCurrentIndex(p => Math.min(flatMedia.length - 1, p + 1));
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flatMedia.length, onClose]);

    if (!currentItem) return null;
    const sender = chat.participantInfo[currentItem.message.senderId];
    
    const handleDownload = () => {
        fetch(currentItem.url)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `media_${new Date().toISOString()}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1) {
            setTouchState({ startX: e.touches[0].clientX, deltaX: 0, isSwiping: true });
        }
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (touchState.isSwiping && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - touchState.startX;
            setTouchState(s => ({ ...s, deltaX }));
        }
    };

    const handleTouchEnd = () => {
        if (touchState.isSwiping) {
            const swipeThreshold = 50; // Min pixels to be considered a swipe
            if (touchState.deltaX > swipeThreshold && currentIndex > 0) {
                setCurrentIndex(p => p - 1);
            } else if (touchState.deltaX < -swipeThreshold && currentIndex < flatMedia.length - 1) {
                setCurrentIndex(p => p + 1);
            }
            setTouchState({ startX: 0, deltaX: 0, isSwiping: false });
        }
    };


    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                    <Avatar photoURL={sender?.photoURL} name={sender?.displayName} sizeClass="w-10 h-10"/>
                    <div>
                        <p className="font-bold">{sender?.displayName}</p>
                        <p className="text-sm text-gray-400">{new Date(currentItem.message.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><CloseIcon /></button>
            </header>
            <div 
                className="flex-1 flex items-center justify-center relative overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img 
                    src={currentItem.url} 
                    alt="media" 
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                        transform: `translateX(${touchState.deltaX}px)`,
                        transition: touchState.isSwiping ? 'none' : 'transform 0.3s ease-out',
                        cursor: touchState.isSwiping ? 'grabbing' : 'grab'
                    }}
                />
                {currentIndex > 0 && <button onClick={() => setCurrentIndex(p=>p-1)} className="absolute left-4 p-3 bg-black/50 rounded-full text-white font-bold text-lg hidden md:block">{'<'}</button>}
                {currentIndex < flatMedia.length - 1 && <button onClick={() => setCurrentIndex(p=>p+1)} className="absolute right-4 p-3 bg-black/50 rounded-full text-white font-bold text-lg hidden md:block">{'>'}</button>}
            </div>
            <footer className="flex justify-around p-3">
                 <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-white"><DownloadIcon/><span>Download</span></button>
                 {onReply && <button onClick={() => onReply(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ReplyIcon /><span>Reply</span></button>}
                 <button onClick={() => onGoToMessage(chat, currentItem.message.id)} className="flex flex-col items-center space-y-1 text-white"><ChatBubbleIcon /><span>Go to Message</span></button>
                 {onForward && <button onClick={() => onForward(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ForwardIcon /><span>Forward</span></button>}
            </footer>
        </div>
    );
};


interface UserProfileScreenProps {
    userId: string;
    currentUser: User;
    onBack: () => void;
    onNavigate: (view: string, payload?: any) => void;
    onSelectChat: (chat: Chat, messageId?: string, options?: { replyToId?: string }) => void;
    onTriggerToast: (message: string) => void;
}

const canSeeInfo = (
    infoType: keyof PrivacySettings,
    viewedUser: User | null,
    isContact: boolean
): boolean => {
    if (!viewedUser) return false;
    // Default to 'everybody' if not set
    const setting = viewedUser.privacySettings?.[infoType] || 'everybody';
    if (setting === 'everybody') return true;
    if (setting === 'nobody') return false;
    if (setting === 'contacts') return isContact;
    return true; // Permissive default
};

const NameWithBadges: React.FC<{ user: Partial<User> | null, className?: string }> = ({ user, className = '' }) => {
    if (!user) return null;
    return (
        <div className={`flex items-center justify-center gap-1.5 ${className}`}>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          {user.isPremium && user.profileBadgeUrl && (
            <img src={user.profileBadgeUrl} alt="badge" className="w-6 h-6 flex-shrink-0" title="Profile Badge" />
          )}
          {user.nameplateStatusUrl && (
            <img src={user.nameplateStatusUrl} alt="status" className="w-6 h-6 flex-shrink-0" title="Status" />
          )}
        </div>
    );
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ userId, currentUser, onBack, onNavigate, onSelectChat, onTriggerToast }) => {
    const [viewedUser, setViewedUser] = useState<User | null>(null);
    const [sharedChat, setSharedChat] = useState<Chat | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const [activeTab, setActiveTab] = useState<'media' | 'links' | 'groups'>('media');
    const [sharedContent, setSharedContent] = useState<{ media: Message[], links: Message[], groups: Chat[] }>({ media: [], links: [], groups: [] });
    const [contentLoading, setContentLoading] = useState(true);

    const [isBlocked, setIsBlocked] = useState(false); // current user blocked viewedUser
    const [amIBlocked, setAmIBlocked] = useState(false); // viewedUser blocked current user

    const [viewingMedia, setViewingMedia] = useState<{ messages: Message[], startIndex: number } | null>(null);
    const [isProfilePhotoViewerOpen, setIsProfilePhotoViewerOpen] = useState(false);

    useEffect(() => {
        const userRef = ref(db, `users/${userId}`);
        const listener = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                setViewedUser({ uid: snapshot.key, ...snapshot.val() });
            }
            setLoading(false);
        });
        return () => off(userRef, 'value', listener);
    }, [userId]);

    useEffect(() => {
        if (!currentUser.uid || !userId) return;
        // Check if I blocked them
        const myBlockRef = ref(db, `users/${currentUser.uid}/blockedUsers/${userId}`);
        const myBlockListener = onValue(myBlockRef, snap => setIsBlocked(snap.exists()));
    
        // Check if they blocked me
        const theirBlockRef = ref(db, `users/${userId}/blockedUsers/${currentUser.uid}`);
        const theirBlockListener = onValue(theirBlockRef, snap => setAmIBlocked(snap.exists()));
    
        return () => {
            off(myBlockRef, 'value', myBlockListener);
            off(theirBlockRef, 'value', theirBlockListener);
        };
    }, [currentUser.uid, userId]);

    useEffect(() => {
        const findSharedChat = async () => {
            const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
            const snapshot = await get(userChatsRef);
            if (snapshot.exists()) {
                const chatIds = Object.keys(snapshot.val());
                for (const chatId of chatIds) {
                    const chatRef = ref(db, `chats/${chatId}`);
                    const chatSnap = await get(chatRef);
                    if (chatSnap.exists()) {
                        const chatData = chatSnap.val();
                        if (chatData.type === ChatType.Private && chatData.participants[userId]) {
                            const fullChat = { id: chatId, ...chatData };
                            setSharedChat(fullChat);
                            setIsMuted(snapshot.val()[chatId]?.muted || false);
                            fetchSharedContent(fullChat);
                            return;
                        }
                    }
                }
            }
            setContentLoading(false);
        };

        const fetchSharedContent = async (sharedChat: Chat) => {
            if (!sharedChat) return;
            setContentLoading(true);

            // 1. Fetch all messages
            const messagesSnap = await get(ref(db, `messages/${sharedChat.id}`));
            const allMessages: Message[] = [];
            if(messagesSnap.exists()) {
                messagesSnap.forEach(child => {
                    allMessages.push({ id: child.key!, ...child.val() });
                });
            }
            allMessages.sort((a,b) => b.timestamp - a.timestamp);

            const media = allMessages.filter(m => m.imageUrls && m.imageUrls.length > 0);
            
            const urlRegex = /(\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)|(\b\+?[0-9][0-9-.\s()]{7,}[0-9]\b)/gi;
            const links = allMessages.filter(m => m.text && urlRegex.test(m.text));

            // 2. Fetch common groups
            const currentUserChatsSnap = await get(ref(db, `user-chats/${currentUser.uid}`));
            const viewedUserChatsSnap = await get(ref(db, `user-chats/${userId}`));
            const commonGroupChats: Chat[] = [];
            if (currentUserChatsSnap.exists() && viewedUserChatsSnap.exists()) {
                const currentUserChatIds = new Set(Object.keys(currentUserChatsSnap.val()));
                const viewedUserChatIds = Object.keys(viewedUserChatsSnap.val());
                const commonIds = viewedUserChatIds.filter(id => currentUserChatIds.has(id) && id !== sharedChat.id);

                const groupPromises = commonIds.map(id => get(ref(db, `chats/${id}`)));
                const groupSnaps = await Promise.all(groupPromises);
                groupSnaps.forEach((snap, i) => {
                    if (snap.exists() && snap.val().type !== ChatType.Private) {
                        commonGroupChats.push({ id: commonIds[i], ...snap.val() });
                    }
                });
            }

            setSharedContent({ media, links, groups: commonGroupChats });
            setContentLoading(false);
        };

        if (currentUser.uid && userId) {
            findSharedChat();
        }
    }, [currentUser.uid, userId]);


    const handleMessage = async () => {
        if (sharedChat) {
            onSelectChat(sharedChat);
        } else if (viewedUser) {
            const newChatRef = push(ref(db, 'chats'));
            const newChatId = newChatRef.key;
            if (!newChatId) return;

            const newChatData: Omit<Chat, 'id'> = {
                type: ChatType.Private,
                participants: { [currentUser.uid]: true, [viewedUser.uid]: true },
                participantInfo: {
                    [currentUser.uid]: { displayName: currentUser.displayName || '', photoURL: currentUser.photoURL || null, handle: currentUser.handle, isPremium: currentUser.isPremium },
                    [viewedUser.uid]: { displayName: viewedUser.displayName || '', photoURL: viewedUser.photoURL || null, handle: viewedUser.handle, isPremium: viewedUser.isPremium },
                },
                lastMessageTimestamp: serverTimestamp(),
                lastMessage: '',
                unreadCounts: {},
            };

            const updates: { [key: string]: any } = {};
            updates[`/chats/${newChatId}`] = newChatData;
            updates[`/user-chats/${currentUser.uid}/${newChatId}`] = true;
            updates[`/user-chats/${viewedUser.uid}/${newChatId}`] = true;

            await update(ref(db), updates);
            onSelectChat({ id: newChatId, ...newChatData } as Chat);
        }
    };
    
    const handleCall = () => {
        if (!viewedUser) return;
    
        const isContact = !!sharedChat;
        const canSeePhoneNumber = canSeeInfo('phoneNumber', viewedUser, isContact);
    
        if (canSeePhoneNumber && viewedUser.phoneNumber) {
            window.location.href = `tel:${viewedUser.phoneNumber}`;
        } else if (viewedUser.phoneNumber) { // number exists but is private
            onTriggerToast("This user's phone number is private.");
        } else { // no number provided
            onTriggerToast("This user has not provided a phone number.");
        }
    };

    const handleToggleMute = async () => {
        if (!sharedChat) return;
        const newMutedState = !isMuted;
        const userChatRef = ref(db, `user-chats/${currentUser.uid}/${sharedChat.id}`);
        await update(userChatRef, { muted: newMutedState });
        setIsMuted(newMutedState);
    };

    const handleToggleBlock = async () => {
        const blockRef = ref(db, `users/${currentUser.uid}/blockedUsers/${userId}`);
        if (isBlocked) {
            await set(blockRef, null);
        } else {
            await set(blockRef, true);
        }
        setIsMenuOpen(false);
    };

    const handleMediaClick = (clickedMessage: Message, imageIndex: number = 0) => {
        const mediaMessages = sharedContent.media;
        let precedingImagesCount = 0;
        for (const msg of mediaMessages) {
            if (msg.id === clickedMessage.id) {
                break;
            }
            precedingImagesCount += msg.imageUrls?.length || 0;
        }
        const startIndex = precedingImagesCount + imageIndex;

        if (mediaMessages.length > 0) {
            setViewingMedia({ messages: mediaMessages, startIndex });
        }
    };

    const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void, isMuted?: boolean }> = ({ icon, label, onClick, isMuted }) => (
        <div className="flex flex-col items-center space-y-1 text-center">
            <button onClick={onClick} className={`w-14 h-14 ${isMuted ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-[#2f2f2f]'} rounded-full flex items-center justify-center`}>{icon}</button>
            <span className={`text-xs font-medium ${isMuted ? 'text-[var(--theme-color-primary)]' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
        </div>
    );

    const TabButton: React.FC<{label: string, value: typeof activeTab, count: number}> = ({label, value, count}) => (
        <button 
            onClick={() => setActiveTab(value)}
            className={`flex-1 pb-2 font-semibold text-center border-b-2 ${activeTab === value ? 'text-[var(--theme-color-primary)] border-[var(--theme-color-primary)]' : 'text-gray-500 border-transparent'}`}
        >
            {label} <span className="text-xs">{count}</span>
        </button>
    );

    if (loading) {
        return <div className="flex items-center justify-center h-full bg-white dark:bg-black text-black dark:text-white">Loading...</div>;
    }

    if (!viewedUser) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
                 <header className="flex items-center p-3 flex-shrink-0 sticky top-0 z-10 bg-white dark:bg-black">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                    <h1 className="text-xl font-bold mx-auto">User Not Found</h1>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <p>This user does not exist.</p>
                </div>
            </div>
        );
    }
    
    const isCurrentlyBlocked = isBlocked || amIBlocked;
    const isContact = !!sharedChat;
    const canSeeProfilePhoto = canSeeInfo('profilePhoto', viewedUser, isContact);
    const canSeeLastSeen = canSeeInfo('lastSeen', viewedUser, isContact);
    const canSeePhoneNumber = canSeeInfo('phoneNumber', viewedUser, isContact);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            <header className="flex items-center justify-between p-3 flex-shrink-0 sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <h1 className="text-xl font-bold">{viewedUser.displayName}</h1>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><MoreVertIcon /></button>
                    {isMenuOpen && (
                        <div ref={menuRef} className="absolute top-12 right-0 bg-white dark:bg-[#2f2f2f] rounded-lg shadow-xl z-20 w-56 py-1">
                            <button className="w-full flex items-center space-x-3 text-left px-4 py-3 hover:bg-black/10 dark:hover:bg-white/10"><ShareIcon /><span>Share Contact</span></button>
                            <button onClick={handleToggleBlock} className="w-full flex items-center space-x-3 text-left px-4 py-3 text-red-500 dark:text-red-400 hover:bg-black/10 dark:hover:bg-white/10"><BlockIcon /><span>{isBlocked ? 'Unblock User' : 'Block User'}</span></button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center p-4">
                    <button onClick={() => setIsProfilePhotoViewerOpen(true)}>
                        <Avatar photoURL={isCurrentlyBlocked ? null : (canSeeProfilePhoto ? viewedUser.photoURL : null)} name={viewedUser.displayName} sizeClass="w-32 h-32 mb-4" />
                    </button>
                    <NameWithBadges user={viewedUser} />
                    <p className="text-gray-500 dark:text-gray-400">
                        {isCurrentlyBlocked ? 'last seen a long time ago' : (
                            canSeeLastSeen ? 
                            (viewedUser.isOnline ? <span className="text-blue-500 dark:text-blue-400">online</span> : `last seen recently`)
                            : `last seen a long time ago`
                        )}
                    </p>
                </div>
                
                <div className="flex justify-center space-x-6 py-4 border-t border-b border-gray-200 dark:border-gray-800">
                    <ActionButton icon={<MessageIcon />} label="Message" onClick={handleMessage} />
                    <ActionButton icon={<CallIcon />} label="Call" onClick={handleCall} />
                    <ActionButton icon={isMuted ? <UnmuteIcon /> : <MuteIcon />} label={isMuted ? 'Unmute' : 'Mute'} onClick={handleToggleMute} isMuted={isMuted} />
                </div>

                <div className="p-4">
                    <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-lg">
                        {viewedUser.bio && !isCurrentlyBlocked && (
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 mb-1">Bio</p>
                                <p className="text-black dark:text-white">{viewedUser.bio}</p>
                            </div>
                        )}
                         {canSeePhoneNumber && viewedUser.phoneNumber && !isCurrentlyBlocked && (
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 mb-1">Phone</p>
                                <p className="text-black dark:text-white">{viewedUser.phoneNumber}</p>
                            </div>
                        )}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                             <p className="text-xs text-gray-500 mb-1">Username</p>
                             <p className="text-black dark:text-white">@{viewedUser.handle || 'none'}</p>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-black dark:text-white">Notifications</p>
                                <p className="text-xs text-gray-500 mt-1">{isMuted ? 'Off' : 'On'}</p>
                            </div>
                             <BellIcon />
                        </div>
                    </div>
                </div>

                <div className="sticky top-[73px] bg-white/80 dark:bg-black/80 backdrop-blur-sm z-10 px-4 pt-2">
                    <div className="flex">
                        <TabButton label="Media" value="media" count={sharedContent.media.length} />
                        <TabButton label="Links" value="links" count={sharedContent.links.length} />
                        <TabButton label="Groups" value="groups" count={sharedContent.groups.length} />
                    </div>
                </div>

                <div className="p-4">
                    {contentLoading ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">Loading shared content...</p> : (
                        <>
                            {activeTab === 'media' && (
                                sharedContent.media.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1">
                                        {sharedContent.media.flatMap(msg => (msg.imageUrls || []).map((url, index) => (
                                            <button key={`${msg.id}-${index}`} onClick={() => handleMediaClick(msg, index)} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-sm">
                                                <img src={url} alt="shared media" className="w-full h-full object-cover" />
                                            </button>
                                        )))}
                                    </div>
                                ) : <p className="text-center text-gray-500 py-8">No shared media yet.</p>
                            )}
                             {activeTab === 'links' && (
                                sharedContent.links.length > 0 ? (
                                    <div className="space-y-3">
                                        {sharedContent.links.map(msg => (
                                            <button key={msg.id} onClick={() => sharedChat && onSelectChat(sharedChat, msg.id)} className="block w-full text-left p-3 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg">
                                                <p className="font-semibold text-blue-500 dark:text-blue-400 truncate">{msg.text}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                                            </button>
                                        ))}
                                    </div>
                                ) : <p className="text-center text-gray-500 py-8">No shared links yet.</p>
                            )}
                             {activeTab === 'groups' && (
                                sharedContent.groups.length > 0 ? (
                                    <div className="space-y-2">
                                        {sharedContent.groups.map(group => (
                                            <div key={group.id} className="flex items-center p-2 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg">
                                                <Avatar photoURL={group.photoURL} name={group.name} sizeClass="w-12 h-12" />
                                                <div className="ml-3">
                                                    <p className="font-semibold">{group.name}</p>
                                                    <p className="text-sm text-gray-500">{Object.keys(group.participants).length} members</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-center text-gray-500 py-8">No groups in common.</p>
                            )}
                        </>
                    )}
                </div>
            </div>
            {viewingMedia && sharedChat && (
                <FullscreenMediaViewer
                    media={viewingMedia}
                    onClose={() => setViewingMedia(null)}
                    onForward={(msg) => onNavigate('forwarding', { messages: [msg] })}
                    onReply={(msg) => onSelectChat(sharedChat, undefined, { replyToId: msg.id })}
                    currentUser={currentUser}
                    chat={sharedChat}
                    onGoToMessage={(targetChat, messageId) => {
                        onSelectChat(targetChat, messageId);
                        setViewingMedia(null);
                    }}
                />
            )}
            {isProfilePhotoViewerOpen && viewedUser && (
                <ProfilePhotoViewer
                    photoURL={isCurrentlyBlocked ? null : (canSeeProfilePhoto ? viewedUser.photoURL : null)}
                    name={viewedUser.displayName}
                    onClose={() => setIsProfilePhotoViewerOpen(false)}
                />
            )}
        </div>
    );
};

export default UserProfileScreen;