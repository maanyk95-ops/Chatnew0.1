

import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import Avatar from './Avatar';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { ref, update, get } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { uploadImage } from '../services/imageUploader';
import { removeStoredAccount, getStoredAccounts } from '../hooks/useAuth';


interface SettingsScreenProps {
    currentUser: User;
    onBack: () => void;
    onNavigate: (view: string, payload?: any) => void;
}

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const PrivacyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const StickerSettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const PremiumIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;


const SettingsListItem: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center p-4 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <div className="mr-6 text-gray-500 dark:text-gray-400">{icon}</div>
        <span className="font-medium flex-1 text-left">{label}</span>
        <ChevronRightIcon />
    </button>
);

const MenuItem: React.FC<{ label: string; onClick?: () => void, isDestructive?: boolean }> = ({ label, onClick, isDestructive }) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-3 text-sm hover:bg-black/10 dark:hover:bg-white/10 ${isDestructive ? 'text-red-500 dark:text-red-400' : 'text-black dark:text-white'}`}>
    {label}
  </button>
);

const NameWithBadges: React.FC<{ user: Partial<User> | null, textClass?: string }> = ({ user, textClass="text-2xl font-bold" }) => {
    if (!user) return null;
    return (
        <div className="flex items-center gap-1.5">
            <h1 className={textClass}>{user.displayName}</h1>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-6 h-6 flex-shrink-0" title="Profile Badge" />
            )}
            {user.nameplateStatusUrl && (
                <img src={user.nameplateStatusUrl} alt="status" className="w-6 h-6 flex-shrink-0" title="Status" />
            )}
        </div>
    );
};


const PremiumStatusCard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!currentUser.isPremium || !currentUser.premiumExpiryTimestamp) return;

        const calculateTimeLeft = () => {
            const remaining = currentUser.premiumExpiryTimestamp! - Date.now();
            if (remaining <= 0) {
                setTimeLeft('Expired');
                return;
            }
            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            if (days === 0 && minutes > 0) timeString += `${minutes}m`;

            setTimeLeft(timeString.trim() || 'Expires soon');
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [currentUser.isPremium, currentUser.premiumExpiryTimestamp]);

    if (currentUser.isPremium) {
        return (
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <PremiumIcon />
                        <span className="font-bold text-lg">Premium Member</span>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{timeLeft}</p>
                        <p className="text-xs opacity-80">Remaining</p>
                    </div>
                </div>
            </div>
        );
    }
    
    if (currentUser.paymentRequestStatus) {
        const statusConfig = {
            pending: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/50',
                text: 'text-yellow-800 dark:text-yellow-300',
                message: 'Your premium request is pending approval.'
            },
            rejected: {
                bg: 'bg-red-100 dark:bg-red-900/50',
                text: 'text-red-800 dark:text-red-300',
                message: 'Your request was rejected. You can submit a new one.'
            },
            hold: {
                bg: 'bg-blue-100 dark:bg-blue-900/50',
                text: 'text-blue-800 dark:text-blue-300',
                message: 'Your request is on hold. Please contact support.'
            }
        }[currentUser.paymentRequestStatus];

        if (statusConfig) {
            return (
                <div className={`${statusConfig.bg} ${statusConfig.text} p-3 rounded-lg text-sm font-medium`}>
                    {statusConfig.message}
                </div>
            );
        }
    }

    return null; // No status to show
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onBack, onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        try {
          removeStoredAccount(currentUser.uid);
          const remainingAccounts = getStoredAccounts();
          if (remainingAccounts.length > 0) {
              sessionStorage.setItem('batchat_login_email', remainingAccounts[0].email || '');
          } else {
              sessionStorage.removeItem('batchat_login_email');
          }
          await signOut(auth);
        } catch (error) {
          console.error('Error signing out: ', error);
        }
    };
    
    const handleSetProfilePhoto = () => {
        setIsMenuOpen(false);
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth.currentUser) return;
        setIsUploading(true);
        try {
          const url = await uploadImage(file);
          
          const fanOutUpdates: { [key: string]: any } = {};
          fanOutUpdates[`users/${currentUser.uid}/photoURL`] = url;

          const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
          const userChatsSnap = await get(userChatsRef);
          if (userChatsSnap.exists()) {
              const chatIds = Object.keys(userChatsSnap.val());
              for (const chatId of chatIds) {
                  fanOutUpdates[`chats/${chatId}/participantInfo/${currentUser.uid}/photoURL`] = url;
              }
          }

          await update(ref(db), fanOutUpdates);
          await updateProfile(auth.currentUser, { photoURL: url });

        } catch (error) {
          console.error('Failed to update profile photo', error);
          alert('Failed to update photo. Please try again.');
        } finally {
          setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-black dark:text-white">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={isUploading} />
            {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />}
            
            <header className="flex items-center justify-between p-4 flex-shrink-0 sticky top-0 z-20 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2">
                    <BackIcon />
                </button>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                            <MoreVertIcon />
                        </button>
                         {isMenuOpen && (
                            <div className="absolute top-12 right-0 bg-white dark:bg-[#2f2f2f] rounded-lg shadow-xl z-20 w-56 py-1">
                                <MenuItem label="Edit Info" onClick={() => { onNavigate('edit_profile'); setIsMenuOpen(false); }} />
                                <MenuItem label="Set Profile Photo" onClick={handleSetProfilePhoto} />
                                <div className="h-px bg-black/10 dark:bg-white/10 my-1"></div>
                                <MenuItem label="Log Out" onClick={handleLogout} isDestructive />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center p-4">
                    <div className="relative mb-4">
                        {isUploading ? (
                            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} sizeClass="w-32 h-32" textClass="text-5xl" />
                        )}
                        <button 
                            onClick={handleSetProfilePhoto}
                            disabled={isUploading}
                            className="absolute bottom-1 right-1 bg-[var(--theme-color)] text-[var(--theme-text-color)] p-2.5 rounded-full border-2 border-gray-50 dark:border-black hover:scale-105 transition-transform"
                        >
                            <CameraIcon />
                        </button>
                    </div>
                    <NameWithBadges user={currentUser} />
                    <p className="text-gray-500 dark:text-gray-400">
                        {currentUser.isOnline ? <span className="text-blue-500 dark:text-blue-400">online</span> : 'offline'}
                    </p>
                </div>
                
                <div className="px-4 mb-4">
                    <PremiumStatusCard currentUser={currentUser} />
                </div>

                <div className="py-2">
                    <div className="px-4 py-2">
                        <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">ACCOUNT</p>
                    </div>
                    <div 
                        className="bg-white dark:bg-[#1e1e1e] rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        onClick={() => onNavigate('edit_profile')}
                    >
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 pointer-events-none">
                             <p className="text-black dark:text-white">{currentUser.phoneNumber || 'Tap to add phone number'}</p>
                             <p className="text-xs text-gray-500 mt-1">Phone Number</p>
                        </div>
                         <div className="p-4 border-b border-gray-200 dark:border-gray-800 pointer-events-none">
                             <p className="text-black dark:text-white">@{currentUser.handle || 'none'}</p>
                             <p className="text-xs text-gray-500 mt-1">Username</p>
                        </div>
                         <div className="p-4 pointer-events-none">
                             <p className="text-black dark:text-white">{currentUser.bio || 'Add a few words about yourself'}</p>
                             <p className="text-xs text-gray-500 mt-1">Bio</p>
                        </div>
                    </div>
                </div>

                <div className="py-2">
                    <div className="px-4 py-2">
                        <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">SETTINGS</p>
                    </div>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg">
                        <SettingsListItem icon={<StickerSettingsIcon />} label="Stickers and Emoji" onClick={() => onNavigate('sticker_store')} />
                        <SettingsListItem icon={<PrivacyIcon />} label="Privacy and Security" onClick={() => onNavigate('privacy_security')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;