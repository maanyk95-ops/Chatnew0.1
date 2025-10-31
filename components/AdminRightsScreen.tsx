import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, update } from 'firebase/database';
import type { User, Chat, AdminPermissions } from '../types';
import Avatar from './Avatar';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!checked)} className={`relative w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${disabled ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-700' : 'cursor-pointer'} ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

const defaultPermissions: AdminPermissions = {
    canChangeInfo: false,
    canDeleteMessages: false,
    canBanUsers: false,
    canInviteUsers: true,
    canPinMessages: false,
    canManageVideoChats: false,
    canAddAdmins: false,
    isAnonymous: false,
    customTitle: 'Admin',
};

const NameWithBadges: React.FC<{ user: Partial<User> | null, textClass?: string }> = ({ user, textClass="text-lg font-bold" }) => {
    if (!user) return null;
    return (
        <div className="flex items-center gap-1.5">
            <p className={textClass}>{user.displayName}</p>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-5 h-5 flex-shrink-0" title="Profile Badge" />
            )}
            {user.nameplateStatusUrl && (
                <img src={user.nameplateStatusUrl} alt="status" className="w-5 h-5 flex-shrink-0" title="Status" />
            )}
        </div>
    );
};


interface AdminRightsScreenProps {
    chat: Chat;
    user: User;
    currentUser: User;
    onBack: () => void;
}

const AdminRightsScreen: React.FC<AdminRightsScreenProps> = ({ chat, user, currentUser, onBack }) => {
    const [permissions, setPermissions] = useState<AdminPermissions>(defaultPermissions);
    const [isSaving, setIsSaving] = useState(false);

    const isOwner = currentUser.uid === chat.ownerId;

    useEffect(() => {
        const existingPerms = chat.admins?.[user.uid];
        setPermissions(existingPerms || defaultPermissions);
    }, [chat, user]);

    const handlePermissionChange = (key: keyof AdminPermissions, value: boolean) => {
        setPermissions(prev => ({ ...prev, [key]: value }));
    };
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPermissions(prev => ({...prev, customTitle: e.target.value}));
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const finalPermissions = { ...permissions };
            // Ensure non-owners cannot grant the canAddAdmins permission
            if (!isOwner) {
                finalPermissions.canAddAdmins = false;
            }
            await update(ref(db), { [`/chats/${chat.id}/admins/${user.uid}`]: finalPermissions });
            onBack();
        } catch (error) {
            console.error("Failed to save admin rights:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const PERMISSION_MAP: { key: keyof AdminPermissions; label: string; disabled?: boolean }[] = [
        { key: 'canChangeInfo', label: 'Change Group Info' },
        { key: 'canDeleteMessages', label: 'Delete Messages' },
        { key: 'canBanUsers', label: 'Ban Users' },
        { key: 'canInviteUsers', label: 'Invite Users via Link' },
        { key: 'canPinMessages', label: 'Pin Messages' },
        { key: 'canManageVideoChats', label: 'Manage Live Streams' },
        { key: 'canAddAdmins', label: 'Add New Admins', disabled: !isOwner },
        { key: 'isAnonymous', label: 'Remain Anonymous' },
    ];
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            <header className="flex items-center justify-between p-3 flex-shrink-0 sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><BackIcon /></button>
                <h1 className="text-xl font-bold">Admin Rights</h1>
                <button onClick={handleSave} disabled={isSaving} className="p-2 rounded-full text-blue-500 dark:text-blue-400 hover:bg-black/10 dark:hover:bg-white/10">{isSaving ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <CheckIcon />}</button>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 flex items-center space-x-3 border-b border-gray-200 dark:border-gray-800">
                    <Avatar photoURL={user.photoURL} name={user.displayName} sizeClass="w-12 h-12" />
                    <div>
                        <NameWithBadges user={user} />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.isOnline ? 'online' : 'last seen recently'}</p>
                    </div>
                </div>

                <div className="p-4">
                    <h2 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">What can this admin do?</h2>
                    <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-lg">
                        {PERMISSION_MAP.map(({ key, label, disabled }, index) => (
                            <div key={key} className={`flex items-center justify-between p-3 ${index < PERMISSION_MAP.length - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}`}>
                                <span className={`font-medium ${disabled ? 'text-gray-500' : ''}`}>{label}</span>
                                <Toggle checked={!!permissions[key]} onChange={(val) => handlePermissionChange(key as keyof AdminPermissions, val)} disabled={disabled} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4">
                    <h2 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">Custom title</h2>
                    <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-lg p-3">
                         <input
                            type="text"
                            value={permissions.customTitle || ''}
                            onChange={handleTitleChange}
                            placeholder="Admin"
                            className="w-full bg-transparent focus:outline-none"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">A title that members will see instead of 'Admin'.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminRightsScreen;