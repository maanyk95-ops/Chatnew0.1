import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, push, update, serverTimestamp, query, limitToLast, onDisconnect, set, get } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { User, SupportMessage, SupportChat } from '../types';
import Avatar from './Avatar';

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const AttachFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;

interface HelpChatScreenProps {
  payload: { chatId: string; isGuest: boolean; guestName?: string };
  currentUser?: User | null;
  onBack: () => void;
  isAdminMode?: boolean;
  supportChatInfo?: SupportChat['userInfo'];
}

const HelpChatScreen: React.FC<HelpChatScreenProps> = ({ payload, currentUser, onBack, isAdminMode = false, supportChatInfo }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [chatInfo, setChatInfo] = useState<SupportChat['userInfo'] | null>(isAdminMode ? supportChatInfo || null : null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const senderId = isAdminMode ? 'admin_support' : payload.chatId;
    const senderName = isAdminMode ? 'Support Team' : (payload.isGuest ? payload.guestName : currentUser?.displayName) || 'User';

    useEffect(() => {
        const chatRef = ref(db, `supportChats/${payload.chatId}`);
        const messagesQuery = query(ref(db, `supportChats/${payload.chatId}/messages`), limitToLast(100));

        const setupAndListen = async () => {
             // Setup for logged-in user on first entry
            if (!isAdminMode && !payload.isGuest && currentUser) {
                const chatSnap = await get(chatRef);
                const userInfoPayload = {
                    name: currentUser.displayName || 'Unnamed User',
                    phoneNumber: currentUser.phoneNumber || 'No Phone',
                    uid: currentUser.uid,
                    photoURL: currentUser.photoURL || null,
                    isGuest: false,
                };
                if (!chatSnap.exists()) {
                    await set(chatRef, {
                        userInfo: userInfoPayload,
                        lastMessageTimestamp: serverTimestamp(),
                        unreadForAdmin: false,
                        unreadForUser: false
                    });
                } else {
                    await update(ref(db, `supportChats/${payload.chatId}/userInfo`), userInfoPayload);
                }
            }

            const infoListener = onValue(ref(db, `supportChats/${payload.chatId}/userInfo`), (snapshot) => {
                if (snapshot.exists()) setChatInfo(snapshot.val());
            });

            const messagesListener = onValue(messagesQuery, (snapshot) => {
                const msgs: SupportMessage[] = [];
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        msgs.push({ id: child.key!, ...child.val() });
                    });
                }
                setMessages(msgs);
                setLoading(false);
            });
            
            // Mark messages as read
            if(isAdminMode) {
                update(chatRef, { unreadForAdmin: false });
            } else {
                update(chatRef, { unreadForUser: false });
            }
            
            // Online status
            const onlineRef = ref(db, `supportChats/${payload.chatId}/userInfo/isOnline`);
            const lastSeenRef = ref(db, `supportChats/${payload.chatId}/userInfo/lastSeen`);
            const connectedRef = ref(db, '.info/connected');

            let onlineListener: any;
            if (!isAdminMode) {
                onlineListener = onValue(connectedRef, (snap) => {
                    if (snap.val() === true) {
                        set(onlineRef, true);
                        onDisconnect(onlineRef).set(false);
                        onDisconnect(lastSeenRef).set(serverTimestamp());
                    }
                });
            }

            return { infoListener, messagesListener, onlineListener, connectedRef, onlineRef, lastSeenRef };
        }

        const listenersPromise = setupAndListen();

        return () => {
            listenersPromise.then(({ infoListener, messagesListener, onlineListener, connectedRef, onlineRef, lastSeenRef }) => {
                off(messagesQuery, 'value', messagesListener);
                off(ref(db, `supportChats/${payload.chatId}/userInfo`), 'value', infoListener);
                if (onlineListener) {
                    onDisconnect(onlineRef).cancel();
                    onDisconnect(lastSeenRef).cancel();
                    off(connectedRef, 'value', onlineListener);
                }
            });
        };
    }, [payload.chatId, isAdminMode, currentUser, payload.isGuest]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        if ((!text && !imageUrl) || isSending) return;
        setIsSending(true);
        try {
            const messageData: Omit<SupportMessage, 'id'> = {
                senderId: senderId,
                senderName: senderName || 'User',
                text: text,
                timestamp: serverTimestamp() as any,
                ...(imageUrl && { imageUrl }),
            };

            const messagesRef = ref(db, `supportChats/${payload.chatId}/messages`);
            const newMessageRef = push(messagesRef);
            
            const updates: { [key: string]: any } = {};
            updates[`/supportChats/${payload.chatId}/messages/${newMessageRef.key}`] = messageData;
            updates[`/supportChats/${payload.chatId}/lastMessage`] = text || 'Image';
            updates[`/supportChats/${payload.chatId}/lastMessageTimestamp`] = serverTimestamp();
            
            if(isAdminMode) {
                updates[`/supportChats/${payload.chatId}/unreadForUser`] = true;
            } else {
                updates[`/supportChats/${payload.chatId}/unreadForAdmin`] = true;
            }

            await update(ref(db), updates);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsSending(true);
        try {
            const url = await uploadImage(file);
            await handleSendMessage('', url);
        } catch (error) {
            console.error("Image upload failed", error);
        } finally {
            setIsSending(false);
        }
    };

    const headerText = isAdminMode ? chatInfo?.name : 'Support Chat';
    const subHeaderText = isAdminMode ? (chatInfo?.isOnline ? 'Online' : 'Offline') : 'We typically reply within a few hours';

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-black text-black dark:text-white">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm">
                <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <div className="ml-4">
                    <h1 className="font-bold">{headerText}</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{subHeaderText}</p>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <p className="text-center text-gray-500">Loading chat...</p>}
                {messages.map(msg => {
                    const isMyMessage = msg.senderId === senderId;
                    return (
                        <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isMyMessage ? 'bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] rounded-br-none' : 'bg-white dark:bg-[#2f2f2f] rounded-bl-none'}`}>
                                {!isMyMessage && <p className="font-bold text-sm text-blue-500 dark:text-blue-400 mb-1">{msg.senderName}</p>}
                                {msg.imageUrl ? <img src={msg.imageUrl} alt="attachment" className="rounded-lg max-w-full h-auto" /> : <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                                <p className={`text-xs mt-1 ${isMyMessage ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'} text-right`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    );
                })}
                 <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-gray-200 dark:border-gray-700 p-2 flex items-center space-x-2 bg-white dark:bg-[#1e1e1e]">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10" disabled={isSending}><AttachFileIcon /></button>
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(newMessage.trim()))}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
                <button onClick={() => handleSendMessage(newMessage.trim())} disabled={isSending || !newMessage.trim()} className="w-10 h-10 bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] rounded-full flex items-center justify-center disabled:bg-gray-500">
                    {isSending ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <SendIcon />}
                </button>
            </footer>
        </div>
    );
};

export default HelpChatScreen;