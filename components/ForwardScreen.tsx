import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, get, push, update, serverTimestamp } from 'firebase/database';
import type { User, Chat, Message } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = ({ className = "w-4 h-4"}: { className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
// Modal Icons
const HideSenderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.543-3.397M7.81 7.81a9.97 9.97 0 014.19-1.81 10.022 10.022 0 014.42 0 10.05 10.05 0 014.28 2.38M3 3l18 18" /></svg>;
const ChangeRecipientIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const ApplyChangesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DoNotForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

interface ForwardScreenProps {
  messages: Message[];
  currentUser: User;
  onClose: () => void;
  onSelectChat: (chat: Chat) => void;
}

const getChatDisplayInfo = (chat: Chat, currentUserId: string): { name: string, photoURL: string | null, user?: Partial<User> } => {
      if (chat.type === ChatType.Group || chat.type === ChatType.Channel) {
          return {
              name: chat.name || 'Unnamed Group',
              photoURL: chat.photoURL
          }
      }
      const otherUserId = Object.keys(chat.participants || {}).find(uid => uid !== currentUserId);
      if (!otherUserId) {
        return { name: 'Unknown User', photoURL: null };
      }
      const otherUser = chat.participantInfo?.[otherUserId];
      if (!otherUser) {
          return { name: 'Unknown User', photoURL: null };
      }
      return { 
          name: otherUser.displayName || 'Unknown User', 
          photoURL: otherUser.photoURL,
          user: otherUser
      };
}

const NameWithBadges: React.FC<{ user: Partial<User> | null, name?: string, textClass?: string }> = ({ user, name, textClass="font-semibold text-black dark:text-white" }) => {
    const displayName = user?.displayName || name || 'Unknown';
    if (!user) return <p className={`${textClass} truncate`}>{displayName}</p>;
    
    return (
        <div className="flex items-center gap-1.5">
            <p className={`${textClass} truncate`}>{displayName}</p>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-4 h-4 flex-shrink-0" title="Profile Badge" />
            )}
            {user.nameplateStatusUrl && (
                <img src={user.nameplateStatusUrl} alt="status" className="w-4 h-4 flex-shrink-0" title="Status" />
            )}
        </div>
    );
};


const ForwardOptionsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onApply: (hideSender: boolean) => void,
    onCancelForwarding: () => void,
    initialHideSender: boolean,
    messagePreview: React.ReactNode
}> = ({ isOpen, onClose, onApply, onCancelForwarding, initialHideSender, messagePreview }) => {
    const [isHidingSender, setIsHidingSender] = useState(initialHideSender);

    useEffect(() => {
        setIsHidingSender(initialHideSender);
    }, [initialHideSender, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={onClose}>
            <style>{`
                @keyframes slide-up-forward-modal {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up-forward-modal { animation: slide-up-forward-modal 0.3s ease-out forwards; }
            `}</style>
            <div className="w-full max-w-md bg-white dark:bg-[#2a2a2a] rounded-t-2xl p-4 flex flex-col space-y-4 animate-slide-up-forward-modal" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-black dark:text-white">Forward message</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recipients will see that it was forwarded</p>
                </div>
                <div className="max-h-32 overflow-y-auto bg-gray-100 dark:bg-black/20 p-2 rounded-lg">
                    {messagePreview}
                </div>
                <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-xl overflow-hidden">
                    <button onClick={() => setIsHidingSender(prev => !prev)} className="w-full flex items-center justify-between p-3 text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10">
                        <div className="flex items-center space-x-3">
                            <HideSenderIcon />
                            <span>Hide Sender Name</span>
                        </div>
                        {isHidingSender && <ApplyChangesIcon />}
                    </button>
                    <button onClick={onClose} className="w-full flex items-center space-x-3 p-3 text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10">
                        <ChangeRecipientIcon />
                        <span>Change Recipient</span>
                    </button>
                     <button onClick={() => onApply(isHidingSender)} className="w-full flex items-center space-x-3 p-3 text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10">
                        <ApplyChangesIcon />
                        <span>Apply Changes</span>
                    </button>
                    <div className="h-px bg-black/10 dark:bg-white/10 mx-2"></div>
                    <button onClick={onCancelForwarding} className="w-full flex items-center space-x-3 p-3 text-left text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10">
                        <DoNotForwardIcon />
                        <span>Do Not Forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ForwardScreen: React.FC<ForwardScreenProps> = ({ messages, currentUser, onClose, onSelectChat }) => {
    const [userChats, setUserChats] = useState<Chat[]>([]);
    const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
    const [hideSender, setHideSender] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [isForwarding, setIsForwarding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    
    useEffect(() => {
        const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
        const listener = onValue(userChatsRef, (snapshot) => {
            if (!snapshot.exists()) {
                setUserChats([]);
                setLoading(false);
                return;
            }
            const chatIds = Object.keys(snapshot.val());
            const chatPromises = chatIds.map(chatId => get(ref(db, `chats/${chatId}`)));

            Promise.all(chatPromises).then(chatSnaps => {
                const chatsData = chatSnaps
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.key, ...snap.val() } as Chat))
                    .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
                setUserChats(chatsData);
                setLoading(false);
            });
        }, (error) => {
            console.error(error);
            setLoading(false);
        });
        return () => off(userChatsRef, 'value', listener);
    }, [currentUser.uid]);
    
    const canForwardToChat = (chat: Chat): boolean => {
        if (chat.type === ChatType.Private) {
            return true;
        }

        const isOwner = currentUser.uid === chat.ownerId;
        const isAdmin = !!chat.admins?.[currentUser.uid];
        const isPrivileged = isOwner || isAdmin;
        
        const canMemberSend = chat.permissions?.canSendMessages !== false;

        return isPrivileged || canMemberSend;
    };

    const toggleSelection = (chatId: string) => {
        setSelectedChats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chatId)) newSet.delete(chatId);
            else newSet.add(chatId);
            return newSet;
        });
    };
    
    const handleForward = async () => {
        if (selectedChats.size === 0 || isForwarding) return;
        setIsForwarding(true);

        try {
            const updates: { [key: string]: any } = {};

            const senderIds = [...new Set(messages.map(m => m.senderId))];
            const senderInfoSnapshots = await Promise.all(senderIds.map(id => get(ref(db, `users/${id}`))));
            const senderInfoMap: Map<string, Partial<User>> = new Map(senderInfoSnapshots.map((snap, i) => [
                senderIds[i],
                snap.exists() ? snap.val() as User : { displayName: 'Unknown User', photoURL: null }
            ]));

            const messagesToSend: any[] = [];

            if (customMessage.trim()) {
                messagesToSend.push({ text: customMessage.trim() });
            }
            
            messages.forEach(message => {
                const senderInfo = senderInfoMap.get(message.senderId);

                let forwardInfoPayload: Message['forwardedFrom'] = {};
                
                if (!hideSender) {
                    const privacySetting = senderInfo?.privacySettings?.forwardedMessages || 'everybody';

                    if (privacySetting === 'everybody' || privacySetting === 'contacts') {
                        // Linkable profile
                        forwardInfoPayload = {
                            senderId: message.senderId,
                            senderName: senderInfo?.displayName ?? null,
                            photoURL: senderInfo?.photoURL ?? null,
                            handle: senderInfo?.handle ?? null,
                            profileBadgeUrl: senderInfo?.profileBadgeUrl ?? null,
                            nameplateStatusUrl: senderInfo?.nameplateStatusUrl ?? null,
                            isPremium: senderInfo?.isPremium ?? false,
                        };
                    } else { // 'nobody'
                        // Unlinked profile
                        forwardInfoPayload = {
                            senderName: senderInfo?.displayName ?? null,
                            photoURL: senderInfo?.photoURL ?? null,
                            profileBadgeUrl: senderInfo?.profileBadgeUrl ?? null,
                            nameplateStatusUrl: senderInfo?.nameplateStatusUrl ?? null,
                            isPremium: senderInfo?.isPremium ?? false,
                        };
                    }
                }
                
                const forwardedMessagePayload: any = {
                    ...message,
                    id: null,
                    senderId: null,
                    timestamp: null,
                    readBy: null,
                    reactions: null, // Don't forward reactions
                    forwardedFrom: forwardInfoPayload,
                };
                messagesToSend.push(forwardedMessagePayload);
            });

            if (messagesToSend.length === 0) return;

            for (const chatId of selectedChats) {
                const targetChat = userChats.find(c => c.id === chatId);
                if (!targetChat || !canForwardToChat(targetChat)) continue;

                messagesToSend.forEach(msgPayload => {
                    const newMessageRef = push(ref(db, `messages/${chatId}`));
                    if (newMessageRef.key) {
                        updates[`/messages/${chatId}/${newMessageRef.key}`] = {
                            ...msgPayload,
                            senderId: currentUser.uid,
                            timestamp: serverTimestamp(),
                            readBy: { [currentUser.uid]: Date.now() },
                        };
                    }
                });

                const lastMessagePayload = messagesToSend[messagesToSend.length - 1];
                let lastMessageText = '';
                if (lastMessagePayload.stickerUrl) {
                    lastMessageText = 'Sticker';
                } else if (lastMessagePayload.gifUrl) {
                    lastMessageText = '📷 GIF';
                } else if (lastMessagePayload.imageUrl || lastMessagePayload.imageUrls) {
                    lastMessageText = `📷 ${lastMessagePayload.text || 'Image'}`;
                } else {
                    lastMessageText = lastMessagePayload.text || '';
                }
                
                updates[`/chats/${chatId}/lastMessage`] = lastMessageText.substring(0, 100);
                updates[`/chats/${chatId}/lastMessageTimestamp`] = serverTimestamp();
                Object.keys(targetChat.participants).forEach(uid => {
                    if (uid !== currentUser.uid) {
                        const currentUnread = targetChat.unreadCounts?.[uid] || 0;
                        updates[`/chats/${chatId}/unreadCounts/${uid}`] = currentUnread + messagesToSend.length;
                    }
                });
            }
            
            if (Object.keys(updates).length > 0) {
                await update(ref(db), updates);
            }

            if (selectedChats.size === 1) {
                const selectedChatId = selectedChats.values().next().value;
                const chatToOpen = userChats.find(c => c.id === selectedChatId);
                if (chatToOpen) onSelectChat(chatToOpen);
            } else {
                onClose();
            }

        } catch (error) {
            console.error("Failed to forward messages:", error);
        } finally {
            setIsForwarding(false);
        }
    };


    const filteredChats = userChats.filter(chat => {
        const info = getChatDisplayInfo(chat, currentUser.uid);
        return info.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    const messagePreview = useMemo(() => messages.map((msg, index) => (
        <div key={index} className="flex items-start space-x-2 text-sm p-1 rounded-md bg-white/5 dark:bg-black/20">
            <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} sizeClass="w-6 h-6"/>
            <div className="min-w-0">
                <p className="font-bold text-black dark:text-white">{hideSender ? currentUser.displayName : 'Original Sender'}</p>
                <p className="text-gray-500 dark:text-gray-300 truncate">{msg.text || (msg.imageUrl || msg.imageUrls ? 'Image' : (msg.stickerUrl ? 'Sticker' : '...'))}</p>
            </div>
        </div>
    )), [messages, currentUser, hideSender]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <h1 className="text-xl font-bold ml-4">Forward To...</h1>
            </header>

            <div className="p-2">
                <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
            </div>
            
            <div className="flex-1 overflow-y-auto pb-32">
                 {loading ? <p className="text-center text-gray-500 dark:text-gray-400 p-4">Loading chats...</p> : (
                    filteredChats.map(chat => {
                        const displayInfo = getChatDisplayInfo(chat, currentUser.uid);
                        const isSelected = selectedChats.has(chat.id);
                        const canForward = canForwardToChat(chat);
                        return (
                            <div 
                                key={chat.id} 
                                onClick={() => canForward && toggleSelection(chat.id)} 
                                className={`flex items-center p-3 ${canForward ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <div className="mr-3">
                                    <Avatar photoURL={displayInfo.photoURL} name={displayInfo.name} sizeClass="w-12 h-12" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <NameWithBadges user={displayInfo.user} name={displayInfo.name} />
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                                    !canForward 
                                        ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600'
                                        : isSelected 
                                            ? 'bg-[var(--theme-color-primary)] border-[var(--theme-color-primary)]' 
                                            : 'border-gray-400 dark:border-gray-500'
                                }`}>
                                    {canForward && isSelected && <CheckIcon className="text-[var(--theme-text-color)]" />}
                                </div>
                            </div>
                        )
                    })
                 )}
            </div>

            {selectedChats.size > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/80 dark:bg-black/50 border-t border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    <button onClick={() => setIsOptionsModalOpen(true)} className="w-full bg-gray-100 dark:bg-black/20 p-2 rounded-lg mb-2 text-left">
                        <p className="font-semibold text-sm text-black dark:text-white">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Tap to change options</p>
                    </button>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            placeholder="Add a message..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#2f2f2f] rounded-lg text-black dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                        />
                        <button 
                            onClick={handleForward}
                            disabled={isForwarding}
                            className="w-14 h-14 rounded-full bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] flex items-center justify-center shadow-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 flex-shrink-0"
                        >
                             {isForwarding ? <div className="w-6 h-6 border-2 border-[var(--theme-text-color)] border-t-transparent rounded-full animate-spin"></div> : <SendIcon />}
                        </button>
                    </div>
                </div>
            )}
            
            <ForwardOptionsModal 
                isOpen={isOptionsModalOpen}
                onClose={() => setIsOptionsModalOpen(false)}
                onApply={(shouldHide) => {
                    setHideSender(shouldHide);
                    setIsOptionsModalOpen(false);
                }}
                onCancelForwarding={onClose}
                initialHideSender={hideSender}
                messagePreview={messagePreview}
            />
        </div>
    );
};

export default ForwardScreen;
