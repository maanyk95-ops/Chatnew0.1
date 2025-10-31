import React, { useState, useEffect } from 'react';
import type { User, PrivacySettings } from '../types';
import { db } from '../services/firebase';
import { ref, set } from 'firebase/database';

interface PrivacySecurityScreenProps {
    currentUser: User;
    onBack: () => void;
}

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!checked)} className={`relative w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${disabled ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-700' : 'cursor-pointer'} ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

const PrivacyListItem: React.FC<{ label: string, value: string, onClick?: () => void, border?: boolean }> = ({ label, value, onClick, border = true }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 text-white hover:bg-white/5 transition-colors ${border ? 'border-b border-gray-800' : ''}`}>
        <span className="font-medium">{label}</span>
        <div className="flex items-center space-x-2">
            <span className="text-gray-400 capitalize">{value}</span>
            <ChevronRightIcon />
        </div>
    </button>
);

const PrivacyOptionModal: React.FC<{
    title: string;
    descriptions: Record<string, string>;
    options: Array<'everybody' | 'contacts' | 'nobody'>;
    currentValue: 'everybody' | 'contacts' | 'nobody';
    onClose: () => void;
    onSave: (newValue: 'everybody' | 'contacts' | 'nobody') => void;
}> = ({ title, descriptions, options, currentValue, onClose, onSave }) => {
    const [selectedValue, setSelectedValue] = useState(currentValue);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-[#2a2a2a] rounded-lg w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-lg mb-4 text-white">{title}</h2>
                <div className="space-y-4">
                    {options.map(option => (
                        <label key={option} className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="radio"
                                name="privacy-option"
                                value={option}
                                checked={selectedValue === option}
                                onChange={() => setSelectedValue(option)}
                                className="mt-1 h-5 w-5 rounded-full text-[var(--theme-color)] bg-gray-700 border-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[var(--theme-color)]"
                            />
                            <div>
                                <p className="font-medium capitalize">{option}</p>
                                <p className="text-xs text-gray-400">{descriptions[option]}</p>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10 font-semibold">
                        Cancel
                    </button>
                    <button onClick={() => onSave(selectedValue)} className="px-4 py-2 rounded-lg bg-[var(--theme-color)] text-[var(--theme-text-color)] hover:opacity-90 font-semibold">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

const fieldInfo: Record<keyof Omit<PrivacySettings, 'forwardedMessages'>, { title: string; descriptions: Record<string, string> }> = {
    phoneNumber: {
        title: 'Who can see my phone number?',
        descriptions: {
            everybody: 'Everyone will be able to see your phone number on your profile.',
            contacts: 'Only your contacts will see your phone number.',
            nobody: 'Nobody will be able to see your phone number.'
        }
    },
    lastSeen: {
        title: 'Who can see my Last Seen time?',
        descriptions: {
            everybody: 'Everyone will be able to see your last seen time.',
            contacts: 'Only your contacts will see your last seen time.',
            nobody: 'Nobody will be able to see your last seen time.'
        }
    },
    profilePhoto: {
        title: 'Who can see my Profile Photo?',
        descriptions: {
            everybody: 'Everyone can see your profile photo.',
            contacts: 'Only your contacts can see your profile photo.',
            nobody: 'No one will see your profile photo.'
        }
    },
};


const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({ currentUser, onBack }) => {
    const [privacySettings, setPrivacySettings] = useState(currentUser.privacySettings || {
        lastSeen: 'everybody', profilePhoto: 'everybody', phoneNumber: 'contacts'
    });
    const [isPublic, setIsPublic] = useState(currentUser.isPublic !== false);
    const [editingField, setEditingField] = useState<keyof Omit<PrivacySettings, 'forwardedMessages'> | null>(null);

    useEffect(() => {
        setPrivacySettings(currentUser.privacySettings || {
            lastSeen: 'everybody', profilePhoto: 'everybody', phoneNumber: 'contacts'
        });
        setIsPublic(currentUser.isPublic !== false);
    }, [currentUser.privacySettings, currentUser.isPublic]);

    const handleSavePrivacySetting = async (field: keyof Omit<PrivacySettings, 'forwardedMessages'>, value: any) => {
        const userPrivacyRef = ref(db, `users/${currentUser.uid}/privacySettings/${field}`);
        await set(userPrivacyRef, value);
        setEditingField(null);
    };

    const handleTogglePublicProfile = async (isPublicValue: boolean) => {
        setIsPublic(isPublicValue);
        const userPublicRef = ref(db, `users/${currentUser.uid}/isPublic`);
        await set(userPublicRef, isPublicValue);
    };

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <header className="flex items-center p-3 border-b border-gray-800 flex-shrink-0 bg-black sticky top-0 z-10">
                 <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold">Privacy and Security</h1>
            </header>

            <div className="flex-1 overflow-y-auto">
                 <div className="py-2">
                    <div className="px-4 pt-4 pb-2">
                        <p className="font-bold text-[var(--theme-color, #facc15)] text-sm">ACCOUNT PRIVACY</p>
                    </div>
                    <div className="bg-[#1e1e1e] rounded-lg">
                        <div className="p-4 flex items-center justify-between">
                            <span className="font-medium">Public Profile</span>
                            <Toggle checked={isPublic} onChange={handleTogglePublicProfile} />
                        </div>
                    </div>
                     <p className="text-xs text-gray-500 mt-2 px-4">
                        {isPublic 
                            ? "Your profile is public. Other users can find you by your handle in global search." 
                            : "Your profile is private. Other users will not be able to find you in global search."
                        }
                     </p>
                </div>
                 <div className="py-2">
                    <div className="px-4 pt-4 pb-2">
                        <p className="font-bold text-[var(--theme-color, #facc15)] text-sm">PRIVACY</p>
                    </div>
                    <div className="bg-[#1e1e1e] rounded-lg">
                        <PrivacyListItem label="Phone Number" value={privacySettings.phoneNumber} onClick={() => setEditingField('phoneNumber')} />
                        <PrivacyListItem label="Last Seen & Online" value={privacySettings.lastSeen} onClick={() => setEditingField('lastSeen')} />
                        <PrivacyListItem label="Profile Photos" value={privacySettings.profilePhoto} border={false} onClick={() => setEditingField('profilePhoto')} />
                    </div>
                </div>

                {editingField && (
                    <PrivacyOptionModal
                        title={fieldInfo[editingField].title}
                        descriptions={fieldInfo[editingField].descriptions}
                        options={['everybody', 'contacts', 'nobody']}
                        currentValue={privacySettings[editingField]}
                        onClose={() => setEditingField(null)}
                        onSave={(newValue) => handleSavePrivacySetting(editingField, newValue)}
                    />
                )}
            </div>
        </div>
    );
};

export default PrivacySecurityScreen;