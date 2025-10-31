import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, query, orderByChild, equalTo, get, set } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import type { User, PrivacySettings } from '../types';
import { uploadImage } from '../services/imageUploader';
import Avatar from './Avatar';

interface CompleteProfileScreenProps {
    currentUser: User;
    onProfileComplete: () => void;
}

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

const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const CompleteProfileScreen: React.FC<CompleteProfileScreenProps> = ({ currentUser, onProfileComplete }) => {
    const [displayName, setDisplayName] = useState(currentUser.displayName || '');
    const [handle, setHandle] = useState(currentUser.handle || '');
    const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(currentUser.photoURL);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(currentUser.handle ? 'available' : 'idle');
    const [handleError, setHandleError] = useState('');

    useEffect(() => {
        if (currentUser.handle || !handle) {
            setHandleStatus(currentUser.handle ? 'available' : 'idle');
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
            } catch (e: any) {
                console.error("Handle verification failed:", e);
                setHandleStatus('idle');
                let message = 'Could not verify handle. An index might be required in your Firebase rules.';
                if (e.message && e.message.toLowerCase().includes("permission denied")) {
                    message = 'Permission denied. Please check your Realtime Database security rules.';
                }
                setHandleError(message);
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [handle, currentUser.handle]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) {
            setError('Please enter a display name.');
            return;
        }
        if (handleStatus !== 'available') {
            setError('Please choose an available and valid handle.');
            return;
        }
        if (!phoneNumber.trim()) {
            setError('Please enter a phone number.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not found");

            let newPhotoURL: string | null = user.photoURL || null;
            if (photoFile) {
                newPhotoURL = await uploadImage(photoFile);
            }
            
            await updateProfile(user, { displayName, photoURL: newPhotoURL });
            
            const defaultPrivacySettings: PrivacySettings = {
                lastSeen: 'everybody',
                profilePhoto: 'everybody',
                phoneNumber: 'contacts',
            };

            const userRef = ref(db, `users/${currentUser.uid}`);
            await set(userRef, {
                uid: currentUser.uid,
                displayName,
                email: user.email,
                photoURL: newPhotoURL,
                handle: handle.toLowerCase(),
                phoneNumber,
                bio: '',
                birthday: '',
                privacySettings: defaultPrivacySettings,
                isPremium: false,
                isAdmin: false,
                role: 'user',
                status: 1,
                isPublic: true,
            });

            onProfileComplete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderHandleStatus = () => {
        if (!handle) return null;
        switch(handleStatus) {
            case 'checking': return <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>;
            case 'available': return <CheckCircleIcon />;
            case 'taken':
            case 'invalid': return <ExclamationCircleIcon />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-white dark:bg-[#1e1e1e] text-black dark:text-white overflow-y-auto">
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Just a few more details to get started.</p>

            <form onSubmit={handleSave} className="w-full max-w-sm">
                <div className="flex justify-center mb-6">
                    <label className="relative cursor-pointer group">
                        <Avatar photoURL={photoPreview} name={displayName} sizeClass="w-32 h-32" />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CameraIcon />
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                </div>
                
                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
                
                 <div className="relative mb-4">
                     <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); }}
                      placeholder="Handle (e.g. @john)"
                      required
                      className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{renderHandleStatus()}</div>
                 </div>
                {handleError && <p className="text-red-400 text-xs -mt-3 mb-3 text-center">{handleError}</p>}
                
                 <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone Number"
                  required
                  className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />

                <button type="submit" disabled={loading || handleStatus !== 'available'} className="w-full bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg shadow-lg shadow-[var(--theme-color-primary)]/20 hover:opacity-90 transition-all duration-300 disabled:bg-gray-200 dark:disabled:bg-[#2f2f2f] disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed">
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
            </form>
        </div>
    );
};

export default CompleteProfileScreen;