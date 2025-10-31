import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';
import type { User, Chat } from '../types';
import { ChatType } from '../types';
import { uploadImage } from '../services/imageUploader';
import Avatar from './Avatar';

interface CreateChatScreenProps {
    currentUser: User;
    onBack: () => void;
    onChatCreated: (chat: Chat) => void;
    type: ChatType.Group | ChatType.Channel;
}

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M5 12h13" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


const CreateChatScreen: React.FC<CreateChatScreenProps> = ({ currentUser, onBack, onChatCreated, type }) => {
    const [step, setStep] = useState(type === ChatType.Group ? 1 : 2);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<User[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
    const [photoURL, setPhotoURL] = useState('');
    const [photoUploading, setPhotoUploading] = useState(false);
    const [contactsLoading, setContactsLoading] = useState(true);
    const [showUrlInput, setShowUrlInput] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            setContactsLoading(true);
            const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
            const userChatsSnap = await get(userChatsRef);
            if (!userChatsSnap.exists()) {
                setContacts([]);
                setContactsLoading(false);
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
                 setContactsLoading(false);
                 return;
            }
            const userPromises = Array.from(contactUserIds).map(uid => get(ref(db, `users/${uid}`)));
            const userSnapshots = await Promise.all(userPromises);
            const fetchedContacts = userSnapshots
                .filter(snap => snap.exists())
                .map(snap => snap.val() as User);
            setContacts(fetchedContacts);
            setContactsLoading(false);
        };
        if (type === ChatType.Group) {
            fetchContacts();
        }
    }, [currentUser.uid, type]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (!file) return;

        setPhotoUploading(true);
        setError('');
        try {
            const url = await uploadImage(file);
            setPhotoURL(url);
        } catch (err) {
            setError('Image upload failed. Please try again.');
        } finally {
            setPhotoUploading(false);
        }
    };

    const toggleMember = (member: User) => {
        setSelectedMembers(prev => 
            prev.find(m => m.uid === member.uid)
                ? prev.filter(m => m.uid !== member.uid)
                : [...prev, member]
        );
    };

    const handleBackStep = () => {
        if (type === ChatType.Group && step === 2) {
            setStep(1);
        } else {
            onBack();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError(`Please enter a ${type} name.`);
            return;
        }
        setError('');
        setLoading(true);

        try {
            const newChatRef = push(ref(db, 'chats'));
            const newChatId = newChatRef.key;
            if (!newChatId) throw new Error("Could not create chat ID.");

            const participantIds = [currentUser.uid, ...selectedMembers.map(m => m.uid)];
            const participants = participantIds.reduce((acc, uid) => ({...acc, [uid]: true }), {});
            const participantInfo = {
                [currentUser.uid]: {
                    displayName: currentUser.displayName || 'User',
                    photoURL: currentUser.photoURL || null,
                    handle: currentUser.handle || '',
                    profileBadgeUrl: currentUser.profileBadgeUrl || null,
                    nameplateStatusUrl: currentUser.nameplateStatusUrl || null,
                    isPremium: currentUser.isPremium || false,
                    joinedAt: serverTimestamp()
                },
                ...selectedMembers.reduce((acc, member) => {
                    acc[member.uid] = {
                        displayName: member.displayName || 'User',
                        photoURL: member.photoURL || null,
                        handle: member.handle || '',
                        profileBadgeUrl: member.profileBadgeUrl || null,
                        nameplateStatusUrl: member.nameplateStatusUrl || null,
                        isPremium: member.isPremium || false,
                        joinedAt: serverTimestamp()
                    };
                    return acc;
                }, {} as { [key: string]: any })
            };
            
            const unreadCounts = participantIds.reduce((acc, uid) => ({...acc, [uid]: 0 }), {});

            const newChatData: any = {
                type: type,
                name,
                description: type === ChatType.Channel ? description : '',
                isPublic: false,
                ownerId: currentUser.uid,
                admins: { [currentUser.uid]: { canChangeInfo: true, canDeleteMessages: true, canBanUsers: true, canInviteUsers: true, canPinMessages: true, canManageVideoChats: true, canAddAdmins: true, isAnonymous: false, customTitle: 'Owner' }},
                participants,
                participantInfo,
                unreadCounts,
                photoURL: photoURL,
                lastMessage: `${type.charAt(0).toUpperCase() + type.slice(1)} created by ${currentUser.displayName}`,
                lastMessageTimestamp: serverTimestamp(),
                permissions: {
                    canSendMessages: type === ChatType.Group,
                    canSendMedia: type === ChatType.Group,
                    canSendPolls: type === ChatType.Group,
                    canSendStickersAndGifs: type === ChatType.Group,
                    canEmbedLinks: type === ChatType.Group,
                    canAddUsers: true,
                    canPinMessages: false, // Only admins/owner
                    canChangeInfo: false, // Only admins/owner
                },
                topicsEnabled: false,
                chatHistoryVisibleForNewMembers: true,
                reactionsMode: 'all',
                signMessages: false,
            };

            const updates: { [key: string]: any } = {};
            updates[`/chats/${newChatId}`] = newChatData;
            participantIds.forEach(uid => {
                updates[`/user-chats/${uid}/${newChatId}`] = true;
            });
            
            const systemMessageText = type === ChatType.Channel ? 'Channel created' : 'Group was created';
            const systemMessageType = type === ChatType.Channel ? 'channel_created' : 'group_created';

            const systemMessageRef = push(ref(db, `messages/${newChatId}`));
            if (systemMessageRef.key) {
                updates[`/messages/${newChatId}/${systemMessageRef.key}`] = {
                    senderId: 'system',
                    text: systemMessageText,
                    timestamp: serverTimestamp(),
                    isSystemMessage: true,
                    systemMessageType: systemMessageType
                };
            }


            await update(ref(db), updates);
            onChatCreated({id: newChatId, ...newChatData});

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white relative">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <div className="ml-4">
                    <h1 className="text-xl font-bold">New Group</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">up to 200,000 members</p>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">
                {contactsLoading ? (
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
            {selectedMembers.length > 0 && (
                 <button 
                    onClick={() => setStep(2)}
                    className="absolute bottom-6 right-6 bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--theme-color-primary)]/40 hover:scale-105 transition-transform"
                    aria-label="Next"
                >
                    <ArrowRightIcon />
                </button>
            )}
        </div>
    );
    
    const renderStep2 = () => (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white">
            <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <button onClick={handleBackStep} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <h1 className="text-xl font-bold">New {type === ChatType.Group ? 'Group' : 'Channel'}</h1>
                <button type="submit" form="create-chat-form" disabled={loading || photoUploading} className="p-2 rounded-full text-[var(--theme-color-primary)] hover:bg-black/10 dark:hover:bg-white/10 disabled:text-gray-500 dark:disabled:text-gray-600">
                    {loading ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <CheckIcon />}
                </button>
            </header>
            <form id="create-chat-form" onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center space-x-4">
                    <label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-[#2f2f2f] flex items-center justify-center overflow-hidden">
                           {photoURL ? (
                                <img src={photoURL} alt="Chat" className="w-full h-full object-cover"/>
                           ) : (
                               <CameraIcon />
                           )}
                        </div>
                    </label>
                    <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={photoUploading} />
                    <div className="flex-1">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={type === ChatType.Group ? 'Enter group name' : 'Channel name'}
                            required
                            className="w-full bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-[var(--theme-color-primary)] text-xl font-semibold placeholder-gray-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <button type="button" onClick={() => setShowUrlInput(prev => !prev)} className="text-sm text-[var(--theme-color-primary)] hover:underline">
                        {showUrlInput ? 'Upload File Instead' : 'Set Photo via URL'}
                    </button>
                    {showUrlInput && (
                        <input
                            type="text"
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                            placeholder="Paste image URL here"
                            className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                        />
                    )}
                </div>

                {type === ChatType.Channel && (
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)] resize-none"
                    />
                )}

                {type === ChatType.Group && selectedMembers.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-500 dark:text-gray-300 mb-2">{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''}</h3>
                        <div className="flex flex-wrap gap-2">
                            {selectedMembers.map(member => (
                                <div key={member.uid} className="flex items-center space-x-2 bg-gray-100 dark:bg-[#2f2f2f] p-1.5 rounded-full">
                                    <Avatar photoURL={member.photoURL} name={member.displayName} sizeClass="w-6 h-6"/>
                                    <span className="text-sm font-medium">{member.displayName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
            </form>
        </div>
    );
    
    return step === 1 ? renderStep1() : renderStep2();
};

export default CreateChatScreen;
