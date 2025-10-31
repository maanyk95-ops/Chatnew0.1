import React, { useState, useEffect } from 'react';
import type { User, PremiumScreenSettings } from '../types';
import Avatar from './Avatar';
import { getStoredAccounts, type AccountInfo } from '../hooks/useAuth';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { ChatType } from '../types';
import { ref, onValue, off } from 'firebase/database';


interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onNavigate: (view: string, payload?: any) => void;
    theme: string;
    setTheme: (theme: string) => void;
    appSettings: {
        appName: string;
        premiumScreen?: PremiumScreenSettings;
    };
}

// Icons
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--theme-color, #facc15)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;

const PremiumIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
// FIX: Corrected SVG syntax for `NewItemIcon` component.
const NewItemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
// FIX: Corrected SVG syntax for `ContactsIcon` component.
const ContactsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
const CallsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
// FIX: Corrected SVG syntax for `ArchiveIcon` component.
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h16" /></svg>;
// FIX: Corrected SVG syntax for `SettingsIcon` component.
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 12h9.75M10.5 18h9.75M3.75 6a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM3.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM3.75 18a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" /></svg>;
const InviteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
// FIX: Corrected SVG syntax for `HelpIcon` component.
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const NameWithBadges: React.FC<{ user: Partial<User> | Partial<AccountInfo>, textClass?: string, className?: string }> = ({ user, textClass, className = '' }) => {
    if (!user) return null;
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <span className={`${textClass || 'font-bold text-lg'} truncate`}>{user.displayName}</span>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-5 h-5 flex-shrink-0" title="Profile Badge" />
            )}
            {(user as User).nameplateStatusUrl && (
                <img src={(user as User).nameplateStatusUrl} alt="status" className="w-5 h-5 flex-shrink-0" title="Status" />
            )}
        </div>
    );
};

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    hasNotification?: boolean;
}
const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, hasNotification }) => (
    <button onClick={onClick} className="w-full flex items-center space-x-6 px-4 py-3 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors duration-200">
        <span className="relative text-gray-600 dark:text-gray-300">
            {icon}
            {hasNotification && (
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 border border-gray-50 dark:border-[#1e1e1e]"></span>
            )}
        </span>
        <span className="font-medium">{label}</span>
    </button>
);

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, currentUser, onNavigate, theme, setTheme, appSettings }) => {
    const [accountsOpen, setAccountsOpen] = useState(true);
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [hasUnreadHelp, setHasUnreadHelp] = useState(false);

    const premiumIcon = appSettings.premiumScreen?.starIcon || 'premium';
    const PremiumDrawerIcon = () => {
        if (premiumIcon.startsWith('http')) {
            return <img src={premiumIcon} alt="premium" className="h-6 w-6 object-contain" />;
        }
        // Fallback to svg icon
        return <PremiumIcon />;
    };

    useEffect(() => {
        if (isOpen) {
            setAccounts(getStoredAccounts());
        }
    }, [isOpen]);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unreadRef = ref(db, `supportChats/${currentUser.uid}/unreadForUser`);
        const listener = onValue(unreadRef, (snapshot) => {
            setHasUnreadHelp(snapshot.val() === true);
        });

        return () => off(unreadRef, 'value', listener);
    }, [currentUser?.uid]);

    const handleSwitchAccount = async (email?: string) => {
        onClose(); // Close drawer before proceeding
        if (email) {
            sessionStorage.setItem('batchat_login_email', email);
        }
        try {
            await signOut(auth);
            // The onAuthStateChanged listener will handle redirecting to LoginScreen
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const menuItems: MenuItemProps[] = [
        { icon: <ProfileIcon />, label: "My Profile", onClick: () => onNavigate('settings') },
        { icon: <PremiumDrawerIcon />, label: currentUser.isPremium ? 'Premium Features' : `${appSettings.appName} Premium`, onClick: () => onNavigate('premium') },
        { icon: <NewItemIcon />, label: "New Group", onClick: () => onNavigate('create_chat', { type: ChatType.Group }) },
        { icon: <ContactsIcon />, label: "Contacts", onClick: () => onNavigate('new_message') },
        { icon: <CallsIcon />, label: "Calls", onClick: () => onNavigate('new_message') },
        { icon: <ArchiveIcon />, label: "Archived Chats", onClick: () => onNavigate('archived_chats') },
        { icon: <SettingsIcon />, label: "Settings", onClick: () => onNavigate('settings') },
    ];
    if (currentUser.isAdmin) {
        menuItems.push({ icon: <AdminIcon />, label: "Admin Panel", onClick: () => onNavigate('admin') });
    }

    const lowerMenuItems: MenuItemProps[] = [
        { icon: <InviteIcon />, label: "Invite Friends", onClick: () => onNavigate('global_search') },
        { icon: <HelpIcon />, label: "Help & Support", onClick: () => onNavigate('help_chat'), hasNotification: hasUnreadHelp },
    ];

    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/70 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose}
            />
            <div className={`fixed top-0 left-0 h-full w-4/5 max-w-sm bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <header className="p-4 bg-gray-100/50 dark:bg-black/20">
                        <div className="flex items-start justify-between">
                             <Avatar photoURL={currentUser.photoURL} name={currentUser.displayName} sizeClass="w-16 h-16" />
                             <button onClick={handleThemeToggle} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                 {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                            </button>
                        </div>
                        <div className="mt-2">
                            <NameWithBadges user={currentUser} />
                            <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.phoneNumber || 'No phone number'}</p>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto">
                        <div className="py-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setAccountsOpen(!accountsOpen)}>
                                <span className="font-semibold">Accounts</span>
                                <ChevronDownIcon />
                            </div>
                            {accountsOpen && (
                                <div>
                                    {accounts.map(account => (
                                        <div 
                                            key={account.uid} 
                                            onClick={() => account.uid !== currentUser.uid && handleSwitchAccount(account.email || undefined)} 
                                            className="flex items-center justify-between px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Avatar photoURL={account.photoURL} name={account.displayName} sizeClass="w-10 h-10" />
                                                <div>
                                                    <NameWithBadges user={account} textClass="font-semibold text-sm" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">@{account.handle}</p>
                                                </div>
                                            </div>
                                            {account.uid === currentUser.uid && <CheckIcon />}
                                        </div>
                                    ))}
                                    <button onClick={() => { onNavigate('add_account'); onClose(); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <PlusIcon />
                                        </div>
                                        <p className="font-semibold text-sm">Add Account</p>
                                    </button>
                                </div>
                            )}
                        </div>

                        <nav className="p-2">
                             {menuItems.map(item => <MenuItem key={item.label} {...item} />)}
                        </nav>
                        
                         <div className="border-t border-gray-200 dark:border-gray-700 mx-2 my-2"></div>
                        
                        <nav className="p-2">
                            {lowerMenuItems.map(item => <MenuItem key={item.label} {...item} />)}
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Drawer;