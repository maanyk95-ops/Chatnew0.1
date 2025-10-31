import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, get, push, update, serverTimestamp } from 'firebase/database';
import type { User, Chat } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

interface NewMessageScreenProps {
  currentUser: User;
  onBack: () => void;
  onNavigate: (view: string, payload?: any) => void;
  onSelectChat: (chat: Chat) => void;
}

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const NewGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const NewContactIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
const NewChannelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.514C18.358 1.88 18.668 1.5 19 1.5v12.428c0 .538-.214 1.055-.595 1.436l-1.49 1.49a2.37 2.37 0 01-3.352 0l-2.828-2.828a2.37 2.37 0 00-3.352 0M10 5.25a2.25 2.25 0 00-4.5 0v2.25a2.25 2.25 0 004.5 0v-2.25z" /></svg>;
const AddContactFabIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM18 9v3m0 0v3m0-3h3m-3 0h-3" /></svg>;

const formatLastSeenForList = (timestamp?: number): string => {
    if (!timestamp) return 'last seen a long time ago';
    
    const now = new Date();
    const lastSeenDate = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

    if (diffSeconds < 60) return 'last seen just now';
    
    const timeString = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (now.toDateString() === lastSeenDate.toDateString()) {
        return `last seen at ${timeString}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === lastSeenDate.toDateString()) {
        return `last seen yesterday at ${timeString}`;
    }

    return `last seen on ${lastSeenDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

const MenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
    <div onClick={onClick} className="flex items-center px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
        <div className="mr-6 text-gray-500 dark:text-gray-300">{icon}</div>
        <span className="font-medium text-lg text-black dark:text-white">{label}</span>
    </div>
);

const NameWithBadges: React.FC<{ user: Partial<User> | null, textClass?: string }> = ({ user, textClass="font-semibold text-black dark:text-white" }) => {
    if (!user) return null;
    return (
        <div className="flex items-center gap-1.5">
            <p className={`${textClass} truncate`}>{user.displayName}</p>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-4 h-4 flex-shrink-0" title="Profile Badge" />
            )}
            {user.nameplateStatusUrl && (
                <img src={user.nameplateStatusUrl} alt="status" className="w-4 h-4 flex-shrink-0" title="Status" />
            )}
        </div>
    );
};

const NewMessageScreen: React.FC<NewMessageScreenProps> = ({ currentUser, onBack, onNavigate, onSelectChat }) => {
    const [contacts, setContacts] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
            const userChatsSnap = await get(userChatsRef);
            if (!userChatsSnap.exists()) {
                setContacts([]);
                setLoading(false);
                return;
            }

            const chatIds = Object.keys(userChatsSnap.val());
            const contactUserIds = new Set<string>();

            for (const chatId of chatIds) {
                const chatSnap = await get(ref(db, `chats/${chatId}`));
                if (chatSnap.exists()) {
                    const chat = chatSnap.val() as Chat;
                    if (chat.type === ChatType.Private) {
                        const otherUserId = Object.keys(chat.participants).find(p => p !== currentUser.uid);
                        if (otherUserId) contactUserIds.add(otherUserId);
                    }
                }
            }

            if (contactUserIds.size === 0) {
                 setContacts([]);
                 setLoading(false);
                 return;
            }

            const userPromises = Array.from(contactUserIds).map(uid => get(ref(db, `users/${uid}`)));
            const userSnapshots = await Promise.all(userPromises);

            const fetchedContacts = userSnapshots
                .filter(snap => snap.exists())
                .map(snap => snap.val() as User)
                .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

            setContacts(fetchedContacts);
            setLoading(false);
        };

        fetchContacts();
    }, [currentUser.uid]);
    
    const handleSelectContact = async (selectedUser: User) => {
        const user1 = currentUser;
        const user2 = selectedUser;
    
        // Securely find the chat by checking only the current user's chats
        const user1ChatsSnap = await get(ref(db, `user-chats/${user1.uid}`));
        if (user1ChatsSnap.exists()) {
            const user1ChatIds = Object.keys(user1ChatsSnap.val());
    
            for (const chatId of user1ChatIds) {
                const chatSnap = await get(ref(db, `chats/${chatId}`));
                if (chatSnap.exists()) {
                    const chatData = chatSnap.val();
                    if (chatData.type === ChatType.Private && chatData.participants[user2.uid] && Object.keys(chatData.participants || {}).length === 2) {
                        onSelectChat({ id: chatId, ...chatData });
                        return;
                    }
                }
            }
        }
    
        // If no chat is found, create a new one
        const newChatRef = push(ref(db, 'chats'));
        const newChatId = newChatRef.key;
        if (!newChatId) return;
    
        const newChatData = {
            type: ChatType.Private,
            participants: { [user1.uid]: true, [user2.uid]: true },
            participantInfo: {
                [user1.uid]: {
                    displayName: user1.displayName || '',
                    photoURL: user1.photoURL || null,
                    handle: user1.handle || '',
                    profileBadgeUrl: user1.profileBadgeUrl,
                    nameplateStatusUrl: user1.nameplateStatusUrl,
                    isPremium: user1.isPremium,
                },
                [user2.uid]: {
                    displayName: user2.displayName || 'Unknown User',
                    photoURL: user2.photoURL || null,
                    handle: user2.handle || '',
                    profileBadgeUrl: user2.profileBadgeUrl,
                    nameplateStatusUrl: user2.nameplateStatusUrl,
                    isPremium: user2.isPremium,
                }
            },
            lastMessage: '',
            lastMessageTimestamp: serverTimestamp(),
            unreadCounts: { [user1.uid]: 0, [user2.uid]: 0 }
        };
        
        const updates: { [key: string]: any } = {};
        updates[`/chats/${newChatId}`] = newChatData;
        updates[`/user-chats/${user1.uid}/${newChatId}`] = true;
        updates[`/user-chats/${user2.uid}/${newChatId}`] = true;
        
        await update(ref(db), updates);
        onSelectChat({ id: newChatId, ...newChatData, unreadCounts: { [user1.uid]: 0, [user2.uid]: 0 } } as Chat);
    };

    const filteredContacts = contacts.filter(contact =>
        contact.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.handle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white relative">
            <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                {isSearching ? (
                    <>
                        <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="flex-1 mx-4 bg-transparent text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
                        />
                    </>
                ) : (
                    <>
                        <div className="flex items-center space-x-4">
                            <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                            <h1 className="text-xl font-bold">New Message</h1>
                        </div>
                        <button onClick={() => setIsSearching(true)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><SearchIcon /></button>
                    </>
                )}
            </header>

            <div className="flex-1 overflow-y-auto">
                {!isSearching && (
                    <div className="py-2">
                        <MenuItem icon={<NewGroupIcon />} label="New Group" onClick={() => onNavigate('create_chat', { type: ChatType.Group })} />
                        <MenuItem icon={<NewContactIcon />} label="New Contact" onClick={() => onNavigate('new_contact')} />
                        <MenuItem icon={<NewChannelIcon />} label="New Channel" onClick={() => onNavigate('create_chat', { type: ChatType.Channel })} />
                    </div>
                )}

                <div className="px-4 pt-4 pb-2 font-bold text-gray-500 dark:text-gray-400 text-sm">
                    {isSearching ? 'CONTACTS' : 'SORTED BY LAST SEEN TIME'}
                </div>

                {loading ? <p className="text-center p-4 text-gray-500 dark:text-gray-400">Loading contacts...</p> : (
                    filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                            <div key={contact.uid} onClick={() => handleSelectContact(contact)} className="flex items-center px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                                <div className="mr-4">
                                    <Avatar photoURL={contact.photoURL} name={contact.displayName} sizeClass="w-14 h-14" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <NameWithBadges user={contact} />
                                    <p className="text-gray-500 dark:text-gray-400 truncate text-sm">
                                        {contact.isOnline ? <span className="text-blue-500 dark:text-blue-400">online</span> : formatLastSeenForList(contact.lastSeen)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center p-8 text-gray-500">{searchTerm ? `No results for "${searchTerm}"` : 'You have no contacts yet.'}</p>
                    )
                )}
            </div>

            <button 
                onClick={() => onNavigate('new_contact')}
                className="absolute bottom-6 right-6 bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--theme-color-primary)]/40 hover:scale-105 transition-transform"
                aria-label="Add new contact"
            >
                <AddContactFabIcon />
            </button>
        </div>
    );
};

export default NewMessageScreen;