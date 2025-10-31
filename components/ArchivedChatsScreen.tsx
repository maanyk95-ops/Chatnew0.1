import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, get, update } from 'firebase/database';
import type { User, Chat } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

interface ArchivedChatsScreenProps {
  currentUser: User;
  onSelectChat: (chat: Chat) => void;
  onBack: () => void;
  onTriggerUndo: (message: string, onConfirm: () => Promise<void>, onUndo?: () => void) => void;
}

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const SingleTickIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
const DoubleTickIcon = ({ isRead }: { isRead: boolean }) => <svg className={`w-5 h-5 ${isRead ? 'text-[#4FC3F7]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7m-3-4l-8.5 8.5"></path></svg>;
const MuteIcon = () => <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>;
const PhotoIcon = () => <svg className="w-4 h-4 text-gray-400 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const UnarchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;


const getChatDisplayInfo = (chat: Chat, currentUserId: string) => {
    if (chat.type === ChatType.Group || chat.type === ChatType.Channel) {
        return { name: chat.name || 'Unnamed Group', photoURL: chat.photoURL }
    }
    const otherUserId = Object.keys(chat.participants || {}).find(uid => uid !== currentUserId);
    if (!otherUserId) return { name: 'Unknown User', photoURL: null };
    const otherUser = chat.participantInfo?.[otherUserId];
    if (!otherUser) return { name: 'Unknown User', photoURL: null };
    return { name: otherUser.displayName || 'Unknown User', photoURL: otherUser.photoURL };
}

const ChatListItemSkeleton = () => (
    <div className="flex items-center px-4 py-3 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-gray-700 mr-4"></div>
        <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
    </div>
);

const ArchivedChatsScreen: React.FC<ArchivedChatsScreenProps> = ({ currentUser, onSelectChat, onBack, onTriggerUndo }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!currentUser.uid) return;

        const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
        const listener = onValue(userChatsRef, (snapshot) => {
            if (!snapshot.exists()) {
                setChats([]);
                setLoading(false);
                return;
            }

            const userChatsData = snapshot.val();
            const chatIds = Object.keys(userChatsData);
            const chatPromises = chatIds.map(chatId => get(ref(db, `chats/${chatId}`)));

            Promise.all(chatPromises).then(chatSnaps => {
                const allChats = chatSnaps
                    .map(snap => {
                        if (!snap.exists()) return null;
                        const chat = { id: snap.key, ...snap.val() } as Chat;
                        const userChatInfo = userChatsData[chat.id];
                        chat.isArchived = typeof userChatInfo === 'object' && userChatInfo.isArchived;
                        chat.isMuted = typeof userChatInfo === 'object' && userChatInfo.isMuted;
                        return chat;
                    })
                    .filter((c): c is Chat => Boolean(c) && c.isArchived)
                    .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
                
                setChats(allChats);
                setLoading(false);
            });
        }, (error) => {
            console.error("Error fetching user chats:", error);
            setLoading(false);
        });

        return () => off(userChatsRef, 'value', listener);
    }, [currentUser.uid]);

    const cancelSelectionMode = () => {
        setSelectionMode(false);
        setSelectedChats(new Set());
    };
    
    const handleToggleSelection = (chatId: string) => {
        const newSelection = new Set(selectedChats);
        if (newSelection.has(chatId)) {
            newSelection.delete(chatId);
        } else {
            newSelection.add(chatId);
        }
        if (newSelection.size === 0) {
            cancelSelectionMode();
        } else {
            setSelectedChats(newSelection);
        }
    };

    const handleLongPress = (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedChats(new Set([chatId]));
        }
    };

    const handleItemClick = (chat: Chat) => {
        if (selectionMode) {
            handleToggleSelection(chat.id);
        } else {
            onSelectChat(chat);
        }
    };
    
    const handleBulkUnarchive = async () => {
        const selectedArr = Array.from(selectedChats);
        const originalChats = [...chats];
    
        // Optimistic UI update
        setChats(prev => prev.filter(c => !selectedArr.includes(c.id)));
        cancelSelectionMode();
    
        try {
            const updates: { [key: string]: any } = {};
            selectedArr.forEach(chatId => {
                updates[`/user-chats/${currentUser.uid}/${chatId}/isArchived`] = null;
            });
            await update(ref(db), updates);
        } catch (error) {
            console.error("Failed to unarchive chats:", error);
            // Revert UI on failure
            setChats(originalChats);
            // TODO: Optionally show an error message to the user
        }
    };


    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
            <header className="p-4 flex items-center space-x-4 flex-shrink-0 sticky top-0 z-10 bg-[#1e1e1e]">
                {selectionMode ? (
                    <div className="flex items-center justify-between w-full">
                        <button onClick={cancelSelectionMode} className="p-1 rounded-full hover:bg-white/10 -ml-2"><CloseIcon /></button>
                        <span className="font-bold">{selectedChats.size} selected</span>
                        <button onClick={handleBulkUnarchive} className="p-2 rounded-full hover:bg-white/10"><UnarchiveIcon /></button>
                    </div>
                ) : (
                    <>
                        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10 -ml-2"><BackIcon /></button>
                        <h1 className="text-2xl font-bold text-white">Archived Chats</h1>
                    </>
                )}
            </header>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div>{[...Array(3)].map((_, i) => <ChatListItemSkeleton key={i} />)}</div>
                ) : chats.length === 0 ? (
                    <p className="text-center text-gray-400 mt-8 p-4">You can archive any chat from its context menu, it will show up here.</p>
                ) : (
                    chats.map(chat => {
                        const displayInfo = getChatDisplayInfo(chat, currentUser.uid);
                        const lastMessageDate = chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp) : null;
                        const time = lastMessageDate 
                            ? lastMessageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : '';
                        const unreadCount = chat.unreadCounts?.[currentUser.uid] || 0;
                        const isSentByMe = chat.lastMessageSenderId === currentUser.uid;
                        const otherUserId = chat.type === ChatType.Private ? Object.keys(chat.participants).find(p => p !== currentUser.uid) : undefined;
                        const isReadByOther = otherUserId ? (chat.unreadCounts?.[otherUserId] || 0) === 0 : false;
                        const isMedia = chat.lastMessage?.startsWith('📷');
                        const isSelected = selectedChats.has(chat.id);
                        
                        return (
                            <div 
                                key={chat.id} 
                                onClick={() => handleItemClick(chat)} 
                                onContextMenu={(e) => handleLongPress(e, chat.id)}
                                className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-blue-900/40' : 'hover:bg-[#2f2f2f]'}`}
                            >
                                <div className="relative mr-4">
                                    <Avatar photoURL={displayInfo.photoURL} name={displayInfo.name} sizeClass="w-14 h-14" />
                                    {isSelected && (
                                        <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-[#1e1e1e] flex items-center justify-center">
                                            <CheckCircleIcon />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white truncate">{displayInfo.name}</p>
                                    <p className="text-gray-400 truncate text-sm">
                                        {isMedia && <PhotoIcon />}
                                        {chat.lastMessage?.replace(/^📷\s*/, '') || 'No messages yet'}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end space-y-1 ml-2">
                                    <div className="flex items-center space-x-1">
                                        {isSentByMe && (isReadByOther ? <DoubleTickIcon isRead={true} /> : <SingleTickIcon />)}
                                        <p className="text-xs text-gray-400 whitespace-nowrap">{time}</p>
                                    </div>
                                    <div className="flex items-center justify-end space-x-1 h-5">
                                        {unreadCount > 0 && (
                                            <span className={`ml-1 inline-block text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${chat.isMuted ? 'bg-gray-600 text-gray-200' : 'bg-green-500 text-white'}`}>
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ArchivedChatsScreen;