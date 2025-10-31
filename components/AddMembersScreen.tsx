import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';
import type { User, Chat } from '../types';
import Avatar from './Avatar';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

interface AddMembersScreenProps {
    currentUser: User;
    chat: Chat;
    onBack: () => void;
}

const AddMembersScreen: React.FC<AddMembersScreenProps> = ({ currentUser, chat, onBack }) => {
    const [contacts, setContacts] = useState<User[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                    const chatData = chatSnap.val() as Chat;
                    if (chatData.type === 'private') {
                        const otherUserId = Object.keys(chatData.participants).find(p => p !== currentUser.uid);
                        if (otherUserId && !chat.participants[otherUserId]) {
                            contactUserIds.add(otherUserId);
                        }
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
                .map(snap => snap.val() as User);
                
            setContacts(fetchedContacts);
            setLoading(false);
        };
        
        fetchContacts();
    }, [currentUser.uid, chat.participants]);

    const toggleMember = (member: User) => {
        setSelectedMembers(prev => 
            prev.find(m => m.uid === member.uid)
                ? prev.filter(m => m.uid !== member.uid)
                : [...prev, member]
        );
    };

    const handleAdd = async () => {
        if (selectedMembers.length === 0 || saving) return;
        setSaving(true);
        
        try {
            const updates: { [key: string]: any } = {};
            const namesAdded: string[] = [];

            selectedMembers.forEach(member => {
                updates[`/chats/${chat.id}/participants/${member.uid}`] = true;
                updates[`/chats/${chat.id}/participantInfo/${member.uid}`] = {
                    displayName: member.displayName || 'Unknown User',
                    photoURL: member.photoURL || null,
                    handle: member.handle || '',
                    profileBadgeUrl: member.profileBadgeUrl,
                    nameplateStatusUrl: member.nameplateStatusUrl,
                    isPremium: member.isPremium,
                    joinedAt: serverTimestamp()
                };
                updates[`/user-chats/${member.uid}/${chat.id}`] = true;
                namesAdded.push(member.displayName || 'user');
            });
            
            const messageText = `${currentUser.displayName} added ${namesAdded.join(', ')}`;
            const newMessageRef = push(ref(db, `messages/${chat.id}`));
            updates[`/messages/${chat.id}/${newMessageRef.key}`] = {
                senderId: 'system',
                text: messageText,
                timestamp: serverTimestamp(),
                isSystemMessage: true
            };

            await update(ref(db), updates);
            onBack();

        } catch (error) {
            console.error("Failed to add members:", error);
            // Consider adding user-facing error feedback
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white">
            <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2" disabled={saving}>
                    <BackIcon />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">Add Members</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMembers.length} selected</p>
                </div>
                <button onClick={handleAdd} disabled={saving || selectedMembers.length === 0} className="p-2 rounded-full text-[var(--theme-color-primary)] hover:bg-black/10 dark:hover:bg-white/10 disabled:text-gray-500 dark:disabled:text-gray-600">
                    {saving ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <CheckIcon />}
                </button>
            </header>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 p-8">Loading contacts...</p>
                ) : contacts.length > 0 ? (
                    contacts.map(contact => {
                        const isSelected = selectedMembers.some(m => m.uid === contact.uid);
                        return (
                             <div key={contact.uid} onClick={() => toggleMember(contact)} className="flex items-center p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
                                <div className="mr-3">
                                    <Avatar photoURL={contact.photoURL} name={contact.displayName} sizeClass="w-12 h-12" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-black dark:text-white truncate">{contact.displayName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">@{contact.handle}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-[var(--theme-color-primary)] border-[var(--theme-color-primary)]' : 'border-gray-400 dark:border-gray-500'}`}>
                                    {isSelected && <CheckIcon className="text-[var(--theme-text-color)]"/>}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 p-8">No contacts to add.</p>
                )}
            </div>
        </div>
    );
};

export default AddMembersScreen;