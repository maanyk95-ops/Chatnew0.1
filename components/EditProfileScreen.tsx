import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { uploadImage } from '../services/imageUploader';
import type { User } from '../types';
import Avatar from './Avatar';

interface EditProfileScreenProps {
    currentUser: User;
    onBack: () => void;
}

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ExclamationCircleIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ currentUser, onBack }) => {
    const [displayName, setDisplayName] = useState(currentUser.displayName || '');
    const [bio, setBio] = useState(currentUser.bio || '');
    const [handle, setHandle] = useState(currentUser.handle || '');
    const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(currentUser.handle ? 'available' : 'idle');
    const [handleError, setHandleError] = useState('');

    useEffect(() => {
        if (!handle) {
            setHandleStatus('idle');
            setHandleError('');
            return;
        }
        
        if (handle.toLowerCase() === (currentUser.handle || '').toLowerCase()) {
            setHandleStatus('available');
            setHandleError('');
            return;
        }

        const regex = /^[a-zA-Z0-9_]{3,15}$/;
        if (!regex.test(handle)) {
            setHandleStatus('invalid');
            setHandleError('3-15 chars, letters, numbers, or _');
            return;
        }

        setHandleStatus('checking');
        setHandleError('');
        const debounce = setTimeout(async () => {
            try {
                const handleLower = handle.toLowerCase();
                const usersQuery = query(ref(db, 'users'), orderByChild('handle'), equalTo(handleLower));
                const chatsQuery = query(ref(db, 'chats'), orderByChild('handle'), equalTo(handleLower));
                const [userSnap, chatSnap] = await Promise.all([get(usersQuery), get(chatsQuery)]);

                if (userSnap.exists() || chatSnap.exists()) {
                    setHandleStatus('taken');
                    setHandleError('This handle is already taken.');
                } else {
                    setHandleStatus('available');
                    setHandleError('');
                }
            } catch (e) {
                console.error("Handle verification failed:", e);
                setHandleStatus('idle');
                setHandleError('Could not verify handle.');
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [handle, currentUser.handle]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            setPhotoFile(file);
            setPhotoURL(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (handleStatus !== 'available') {
            setError(handleError || 'Please choose an available and valid handle.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const updates: { [key: string]: any } = {};
            let newPhotoURL = currentUser.photoURL || null;

            updates[`users/${currentUser.uid}/displayName`] = displayName;
            updates[`users/${currentUser.uid}/bio`] = bio;

            if (photoFile) {
                newPhotoURL = await uploadImage(photoFile);
                updates[`users/${currentUser.uid}/photoURL`] = newPhotoURL;
            }

            const fanOutUpdates: { [key: string]: any } = {};
            let handleChanged = false;

            if (handle.toLowerCase() !== (currentUser.handle || '').toLowerCase()) {
                handleChanged = true;
                const newHandle = handle.toLowerCase();
                updates[`users/${currentUser.uid}/handle`] = newHandle;
            }

            // Fan-out updates to all chats
            const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
            const userChatsSnap = await get(userChatsRef);
            if (userChatsSnap.exists()) {
                const chatIds = Object.keys(userChatsSnap.val());
                for (const chatId of chatIds) {
                    if (handleChanged) {
                        fanOutUpdates[`chats/${chatId}/participantInfo/${currentUser.uid}/handle`] = handle.toLowerCase();
                    }
                    if (displayName !== currentUser.displayName) {
                        fanOutUpdates[`chats/${chatId}/participantInfo/${currentUser.uid}/displayName`] = displayName;
                    }
                    if (newPhotoURL !== currentUser.photoURL) {
                        fanOutUpdates[`chats/${chatId}/participantInfo/${currentUser.uid}/photoURL`] = newPhotoURL;
                    }
                }
            }
            
            await update(ref(db), { ...updates, ...fanOutUpdates });

            // Update Firebase Auth profile
            const authUser = auth.currentUser;
            if (authUser) {
                await updateProfile(authUser, { 
                    displayName, 
                    photoURL: newPhotoURL 
                });
            }
            
            onBack();
        } catch (err) {
            console.error(err);
            setError('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };
    
    const renderHandleStatus = () => {
        if (!handle || handle.toLowerCase() === (currentUser.handle || '').toLowerCase()) return null;
        switch(handleStatus) {
            case 'checking': return <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>;
            case 'available': return <CheckCircleIcon />;
            case 'taken':
            case 'invalid': return <ExclamationCircleIcon />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-black dark:text-white">
            <header className="flex items-center justify-between p-3 flex-shrink-0 sticky top-0 z-10 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold">Edit Profile</h1>
                <button onClick={handleSave} disabled={loading || handleStatus !== 'available'} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[var(--theme-color-primary)] disabled:text-gray-500">
                    {loading ? <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <CheckIcon />}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex justify-center">
                    <label className="relative cursor-pointer group">
                        <Avatar photoURL={photoURL} name={displayName} sizeClass="w-32 h-32" />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CameraIcon />
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-[var(--theme-color-primary)] mb-1">Name</label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1e1e1e] border-b-2 border-gray-200 dark:border-gray-700 focus:border-[var(--theme-color-primary)] rounded-t-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors"
                    />
                </div>
                
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="bio" className="block text-sm font-medium text-[var(--theme-color-primary)]">Bio</label>
                        <span className="text-sm text-gray-500">{70 - bio.length}</span>
                    </div>
                    <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={70}
                        rows={2}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1e1e1e] border-b-2 border-gray-200 dark:border-gray-700 focus:border-[var(--theme-color-primary)] rounded-t-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors resize-none"
                        placeholder="A few words about yourself..."
                    />
                     <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">You can add a few lines about yourself. Choose who can see your bio in Settings.</p>
                </div>
                
                 <div>
                    <label className="block text-sm font-medium text-[var(--theme-color-primary)] mb-1">Username</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); }}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1e1e1e] border-b-2 border-gray-200 dark:border-gray-700 focus:border-[var(--theme-color-primary)] rounded-t-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{renderHandleStatus()}</div>
                    </div>
                    {handleError && <p className="text-xs text-red-400 mt-1">{handleError}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">You can set a public username on Batchat. This username can be used to find you.</p>
                </div>

            </div>
        </div>
    );
};

export default EditProfileScreen;
