import React, { useState, useEffect, useRef, useMemo, TouchEvent } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, update, get, query, orderByChild, equalTo, serverTimestamp, set } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { User, Chat, AdminPermissions, MemberPermissions, Message } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const AddMemberIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
const LeaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
const EmojiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const GroupTypeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ChatHistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4" /></svg>;
const AdministratorsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.6-3.751A11.959 11.959 0 0112 2.75c-2.176 0-4.205.6-5.942 1.684z" /></svg>;
const MembersIcon = GroupTypeIcon;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;

// --- Context Menu Icons ---
const PromoteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 1.75L3 5.75v6c0 5.25 3.8 10.25 9 11.5 5.2-1.25 9-6.25 9-11.5v-6L12 1.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.75l1.62 3.25 3.63.5-2.62 2.5  .62 3.5-3.25-1.75-3.25 1.75 .62-3.5-2.62-2.5 3.63-.5L12 8.75z" /></svg>;
const DemoteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 1.75L3 5.75v6c0 5.25 3.8 10.25 9 11.5 5.2-1.25 9-6.25 9-11.5v-6L12 1.75z" /><path d="M9 12h6" /></svg>;
const ChangePermissionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 13.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5z M21 10h-1V8c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2z" /></svg>;
const RemoveFromGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const ExclamationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

// New icons for viewer
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ReplyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" /></svg>;


interface GroupInfoScreenProps {
    chat: Chat;
    currentUser: User;
    onBack: () => void;
    onNavigate: (view: string, payload?: any) => void;
    onSelectChat: (chat: Chat, messageId?: string, options?: { replyToId?: string }) => void;
    onTriggerUndo: (message: string, onConfirm: () => Promise<void>, onUndo?: () => void) => void;
}

const ContextMenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, isDestructive?: boolean }> = ({ icon, label, onClick, isDestructive }) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 text-left px-4 py-3 hover:bg-black/10 dark:hover:bg-white/10 ${isDestructive ? 'text-red-500 dark:text-red-400' : 'text-black dark:text-white'}`}>
        {icon}
        <span>{label}</span>
    </button>
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

const defaultMemberPermissions: MemberPermissions = {
    canSendMessages: true,
    canSendMedia: true,
    canSendPolls: true,
    canSendStickersAndGifs: true,
    canEmbedLinks: true,
    canAddUsers: true,
    canPinMessages: false,
    canChangeInfo: false,
};

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!checked)} className={`relative w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${disabled ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-700' : 'cursor-pointer'} ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

const ProfilePhotoViewer: React.FC<{
    photoURL: string | null;
    name: string | null;
    onClose: () => void;
}> = ({ photoURL, name, onClose }) => {
    if (!photoURL) return null;

    const handleDownload = () => {
        fetch(photoURL)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${(name || 'group').replace(/\s+/g, '_')}_photo.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                     <p className="font-bold">{name}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><CloseIcon /></button>
            </header>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-2">
                <img src={photoURL} alt="profile photo" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <footer className="flex justify-around p-3">
                 <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-white"><DownloadIcon /><span>Download</span></button>
            </footer>
        </div>
    );
};


const FullscreenMediaViewer: React.FC<{
    media: {messages: Message[], startIndex: number}, 
    onClose: () => void, 
    onForward?: (msg: Message) => void, 
    onReply?: (msg: Message) => void, 
    currentUser: User, 
    chat: Chat, 
    onGoToMessage: (chat: Chat, messageId: string) => void
}> = ({ media, onClose, onForward, onReply, currentUser, chat, onGoToMessage }) => {
    const flatMedia = useMemo(() => media.messages.flatMap(msg => (msg.imageUrls || []).filter(Boolean).map(url => ({ url, message: msg }))), [media.messages]);
    const [currentIndex, setCurrentIndex] = useState(media.startIndex);
    const [touchState, setTouchState] = useState({ startX: 0, deltaX: 0, isSwiping: false });
    
    useEffect(() => {
        setCurrentIndex(media.startIndex);
    }, [media.startIndex]);
    
    const currentItem = flatMedia[currentIndex];
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') setCurrentIndex(p => Math.max(0, p - 1));
            if (e.key === 'ArrowRight') setCurrentIndex(p => Math.min(flatMedia.length - 1, p + 1));
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flatMedia.length, onClose]);

    if (!currentItem) return null;
    const sender = chat.participantInfo[currentItem.message.senderId];
    
    const handleDownload = () => {
        fetch(currentItem.url)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `media_${new Date().toISOString()}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1) {
            setTouchState({ startX: e.touches[0].clientX, deltaX: 0, isSwiping: true });
        }
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (touchState.isSwiping && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - touchState.startX;
            setTouchState(s => ({ ...s, deltaX }));
        }
    };

    const handleTouchEnd = () => {
        if (touchState.isSwiping) {
            const swipeThreshold = 50; // Min pixels to be considered a swipe
            if (touchState.deltaX > swipeThreshold && currentIndex > 0) {
                setCurrentIndex(p => p - 1);
            } else if (touchState.deltaX < -swipeThreshold && currentIndex < flatMedia.length - 1) {
                setCurrentIndex(p => p + 1);
            }
            setTouchState({ startX: 0, deltaX: 0, isSwiping: false });
        }
    };


    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                    <Avatar photoURL={sender?.photoURL} name={sender?.displayName} sizeClass="w-10 h-10"/>
                    <div>
                        <p className="font-bold">{sender?.displayName}</p>
                        <p className="text-sm text-gray-400">{new Date(currentItem.message.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><CloseIcon /></button>
            </header>
            <div 
                className="flex-1 flex items-center justify-center relative overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img 
                    src={currentItem.url} 
                    alt="media" 
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                        transform: `translateX(${touchState.deltaX}px)`,
                        transition: touchState.isSwiping ? 'none' : 'transform 0.3s ease-out',
                        cursor: touchState.isSwiping ? 'grabbing' : 'grab'
                    }}
                />
                {currentIndex > 0 && <button onClick={() => setCurrentIndex(p=>p-1)} className="absolute left-4 p-3 bg-black/50 rounded-full text-white font-bold text-lg hidden md:block">{'<'}</button>}
                {currentIndex < flatMedia.length - 1 && <button onClick={() => setCurrentIndex(p=>p+1)} className="absolute right-4 p-3 bg-black/50 rounded-full text-white font-bold text-lg hidden md:block">{'>'}</button>}
            </div>
            <footer className="flex justify-around p-3">
                 <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-white"><DownloadIcon/><span>Download</span></button>
                 {onReply && <button onClick={() => onReply(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ReplyIcon /><span>Reply</span></button>}
                 <button onClick={() => onGoToMessage(chat, currentItem.message.id)} className="flex flex-col items-center space-y-1 text-white"><ChatBubbleIcon /><span>Go to Message</span></button>
                 {onForward && <button onClick={() => onForward(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ForwardIcon /><span>Forward</span></button>}
            </footer>
        </div>
    );
};

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

const GroupInfoScreen: React.FC<GroupInfoScreenProps> = ({ chat: initialChat, currentUser, onBack, onNavigate, onSelectChat, onTriggerUndo }) => {
    type View = 'main' | 'edit' | 'admins';
    const [view, setView] = useState<View>('main');
    const [chat, setChat] = useState<Chat>(initialChat);
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, user: User } | null>(null);
    const [userToRemove, setUserToRemove] = useState<User | null>(null);
    const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferOwnership, setShowTransferOwnership] = useState(false);
    const [creationDate, setCreationDate] = useState<number | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Edit state
    const [editedName, setEditedName] = useState(initialChat?.name || '');
    const [editedDescription, setEditedDescription] = useState(initialChat?.description || '');
    const [editedPhoto, setEditedPhoto] = useState<File | null>(null);
    const [editedPhotoPreview, setEditedPhotoPreview] = useState(initialChat?.photoURL || '');
    const [isSaving, setIsSaving] = useState(false);
    const [editedHandle, setEditedHandle] = useState(initialChat?.handle || '');
    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(initialChat?.handle ? 'available' : 'idle');
    const [handleError, setHandleError] = useState('');
    const [editedPermissions, setEditedPermissions] = useState<MemberPermissions>({ ...defaultMemberPermissions, ...initialChat?.permissions });

    // Shared Content State
    const [activeTab, setActiveTab] = useState<'members' | 'media' | 'links'>('members');
    const [sharedContent, setSharedContent] = useState<{ media: Message[], links: Message[] }>({ media: [], links: [] });
    const [contentLoading, setContentLoading] = useState(true);
    const [viewingMedia, setViewingMedia] = useState<{ messages: Message[], startIndex: number } | null>(null);
    const [isProfilePhotoViewerOpen, setIsProfilePhotoViewerOpen] = useState(false);

    if (!initialChat) {
        useEffect(() => {
            onBack();
        }, [onBack]);
        return (
            <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-black">
                <p>Loading...</p>
            </div>
        );
    }

    const isMember = !!initialChat.participants[currentUser.uid];
    const isChannel = chat.type === ChatType.Channel;
    const isOwner = currentUser.uid === chat.ownerId;
    const currentAdminPerms = chat.admins?.[currentUser.uid];
    const isPrivileged = isOwner || !!currentAdminPerms;
    const canEdit = isOwner || !!currentAdminPerms?.canChangeInfo;
    const canAddMembers = isOwner || !!currentAdminPerms?.canInviteUsers || chat.permissions?.canAddUsers;
    const canManageMembers = isOwner || !!currentAdminPerms?.canBanUsers;
    const canManageAdmins = isOwner || !!currentAdminPerms?.canAddAdmins;
    
    useEffect(() => {
        if (!isMember) return;
        const userChatRef = ref(db, `user-chats/${currentUser.uid}/${chat.id}`);
        const listener = onValue(userChatRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setIsMuted(typeof data === 'object' && data.muted === true);
            }
        });
        return () => off(userChatRef, 'value', listener);
    }, [chat.id, currentUser.uid, isMember]);

    const handleToggleMute = async () => {
        const userChatRef = ref(db, `user-chats/${currentUser.uid}/${chat.id}`);
        const snapshot = await get(userChatRef);
        const currentData = snapshot.val();
        const newMutedState = !isMuted;
        const updatePayload = (typeof currentData === 'object' && currentData !== null) 
            ? { ...currentData, muted: newMutedState }
            : { muted: newMutedState };
        await set(userChatRef, updatePayload);
    };
    
    useEffect(() => {
        const fetchSharedContent = async () => {
            if (!chat) {
                setSharedContent({ media: [], links: [] });
                setContentLoading(false);
                return;
            }
            setContentLoading(true);
    
            const messagesSnap = await get(ref(db, `messages/${chat.id}`));
            const allMessages: Message[] = [];
            if(messagesSnap.exists()) {
                messagesSnap.forEach(child => {
                    allMessages.push({ id: child.key!, ...child.val() });
                });
            }
            allMessages.sort((a,b) => b.timestamp - a.timestamp);
    
            const media = allMessages.filter(m => m.imageUrls && m.imageUrls.length > 0 && !m.deletedFor?.[currentUser.uid]);
            const urlRegex = /(\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
            const links = allMessages.filter(m => m.text && urlRegex.test(m.text) && !m.deletedFor?.[currentUser.uid]);
    
            setSharedContent({ media, links });
            setContentLoading(false);
        };
    
        fetchSharedContent();
    }, [chat, currentUser.uid]);

    useEffect(() => {
        const findCreationDate = async () => {
            const messagesRef = ref(db, `messages/${initialChat.id}`);
            const q = query(messagesRef, orderByChild('systemMessageType'), equalTo(isChannel ? 'channel_created' : 'group_created'));
            const snapshot = await get(q);
            if (snapshot.exists()) {
                const messagesData = snapshot.val();
                const creationMessage = Object.values(messagesData)[0] as Message;
                if (creationMessage && creationMessage.timestamp) {
                    setCreationDate(creationMessage.timestamp);
                }
            }
        };
        findCreationDate();
    }, [initialChat.id, isChannel]);

    useEffect(() => {
        const chatRef = ref(db, `chats/${initialChat.id}`);
        const listener = onValue(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                const newChatData = { id: snapshot.key, ...snapshot.val() } as Chat;
                setChat(newChatData);
                if (view !== 'edit') {
                    setEditedName(newChatData.name || '');
                    setEditedDescription(newChatData.description || '');
                    setEditedPhotoPreview(newChatData.photoURL || '');
                    setEditedHandle(newChatData.handle || '');
                    setEditedPermissions({ ...defaultMemberPermissions, ...newChatData.permissions });
                }
            }
        });
        return () => off(chatRef, 'value', listener);
    }, [initialChat.id, view]);

    useEffect(() => {
        if (view !== 'edit' || !chat.isPublic) {
            setHandleStatus('idle'); 
            setHandleError('');
            return;
        }
    
        if (!editedHandle) {
            setHandleStatus('invalid');
            setHandleError(`A public link is required for public ${isChannel ? 'channels' : 'groups'}.`);
            return;
        }
    
        if (editedHandle.toLowerCase() === (chat.handle || '').toLowerCase()) {
            setHandleStatus('available');
            setHandleError('');
            return;
        }
    
        const regex = /^[a-zA-Z0-9_]{5,32}$/;
        if (!regex.test(editedHandle)) {
            setHandleStatus('invalid');
            setHandleError('5-32 chars, letters, numbers, or underscores.');
            return;
        }
    
        setHandleStatus('checking');
        setHandleError('');
        const debounce = setTimeout(async () => {
            try {
                const handleLower = editedHandle.toLowerCase();
                const usersQuery = query(ref(db, 'users'), orderByChild('handle'), equalTo(handleLower));
                const chatsQuery = query(ref(db, 'chats'), orderByChild('handle'), equalTo(handleLower));
                
                const [userSnap, chatSnap] = await Promise.all([get(usersQuery), get(chatsQuery)]);
    
                if (userSnap.exists() || (chatSnap.exists() && Object.keys(chatSnap.val())[0] !== chat.id)) {
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
    }, [editedHandle, chat.id, chat.handle, chat.isPublic, view, isChannel]);

    useEffect(() => {
        setLoading(true);
        const participantIds = Object.keys(chat.participants);
        const userPromises = participantIds.map(uid => get(ref(db, `users/${uid}`)));
        Promise.all(userPromises).then(userSnaps => {
            const usersData = userSnaps
                .filter(snap => snap.exists())
                .map(snap => ({ uid: snap.key, ...snap.val() } as User));
            setMembers(usersData);
        }).finally(() => setLoading(false));
    }, [chat.participants]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditedPhoto(file);
            setEditedPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!editedName.trim()) return;
        if (chat.isPublic && handleStatus !== 'available') {
            alert(handleError || 'Please fix the public link before saving.');
            return;
        }
        setIsSaving(true);
        try {
            const updates: { [key: string]: any } = {};
            if (editedPhoto) {
                updates[`/chats/${chat.id}/photoURL`] = await uploadImage(editedPhoto);
            }
            if (editedName !== chat.name) updates[`/chats/${chat.id}/name`] = editedName;
            if (editedDescription !== chat.description) updates[`/chats/${chat.id}/description`] = editedDescription;
            if (chat.isPublic && editedHandle.toLowerCase() !== (chat.handle || '').toLowerCase()) {
                updates[`/chats/${chat.id}/handle`] = editedHandle.toLowerCase();
            }
            
            updates[`/chats/${chat.id}/permissions`] = editedPermissions;
            
            if (Object.keys(updates).length > 0) await update(ref(db), updates);
            setView('main');

        } catch (error) { console.error("Failed to save group info", error); } 
        finally { setIsSaving(false); setEditedPhoto(null); }
    };
    
    const confirmRemoveFromGroup = async (blockUser: boolean) => {
        if (!userToRemove) return;
        const user = { ...userToRemove };
        const originalMembers = [...members];
    
        // 1. Optimistic UI update
        setMembers(prev => prev.filter(m => m.uid !== user.uid));
        setUserToRemove(null);
    
        const performFirebaseRemove = async () => {
            const updates: { [key: string]: any } = {};
            updates[`/chats/${chat.id}/participants/${user.uid}`] = null;
            updates[`/chats/${chat.id}/participantInfo/${user.uid}`] = null;
            updates[`/chats/${chat.id}/admins/${user.uid}`] = null;
            updates[`/user-chats/${user.uid}/${chat.id}`] = null;
            if (blockUser) {
                updates[`/chats/${chat.id}/blockedUsers/${user.uid}`] = true;
            }
            await update(ref(db), updates);
        };
    
        const undoRemove = () => {
            setMembers(originalMembers);
        };
    
        // 2. Trigger undo snackbar
        onTriggerUndo(
            `${user.displayName} removed`,
            performFirebaseRemove,
            undoRemove
        );
    };
    
    const handleDemoteAdmin = async (user: User) => {
        setContextMenu(null);
        await update(ref(db), { [`/chats/${chat.id}/admins/${user.uid}`]: null });
    };

    const handleSaveVisibilitySettings = async (settings: { isPublic: boolean, historyVisible: boolean }) => {
        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}/isPublic`] = settings.isPublic;
        updates[`/chats/${chat.id}/chatHistoryVisibleForNewMembers`] = settings.historyVisible;
        await update(ref(db), updates);
        setIsVisibilityModalOpen(false);
    };
    
    const handleMemberLongPress = (e: React.MouseEvent, user: User) => {
        const isTargetAdmin = !!chat.admins?.[user.uid];
        const canManageTarget = (canManageMembers && user.uid !== currentUser.uid && user.uid !== chat.ownerId) || (canManageAdmins && isTargetAdmin && user.uid !== chat.ownerId);

        if (!canManageTarget) return;

        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 240;
        const menuHeight = 180;
        
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }
        
        setContextMenu({ x, y, user });
    };

    const handleLeaveOrDeleteClick = () => {
        if (isOwner) {
            setShowDeleteConfirm(true);
        } else {
            setShowLeaveConfirm(true);
        }
    };

    const handleConfirmLeave = async () => {
        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}/participants/${currentUser.uid}`] = null;
        updates[`/chats/${chat.id}/participantInfo/${currentUser.uid}`] = null;
        updates[`/chats/${chat.id}/admins/${currentUser.uid}`] = null;
        updates[`/user-chats/${currentUser.uid}/${chat.id}`] = null;
        
        await update(ref(db), updates);
        setShowLeaveConfirm(false);
        onBack();
    };

    const handleConfirmDeleteGroup = async () => {
        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}`] = null;
        updates[`/messages/${chat.id}`] = null;
        Object.keys(chat.participants).forEach(uid => {
            updates[`/user-chats/${uid}/${chat.id}`] = null;
        });
        
        await update(ref(db), updates);
        setShowDeleteConfirm(false);
        onBack();
    };

    const handleTransferOwnership = async (newOwnerId: string) => {
        const fullPermissions: AdminPermissions = {
            canChangeInfo: true,
            canDeleteMessages: true,
            canBanUsers: true,
            canInviteUsers: true,
            canPinMessages: true,
            canManageVideoChats: true,
            canAddAdmins: true,
            isAnonymous: false,
            customTitle: 'Owner'
        };

        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}/ownerId`] = newOwnerId;
        updates[`/chats/${chat.id}/admins/${newOwnerId}`] = fullPermissions;
        updates[`/chats/${chat.id}/admins/${currentUser.uid}`] = { ...defaultPermissions, customTitle: 'Admin' };
        
        await update(ref(db), updates);
        setShowTransferOwnership(false);
        setShowLeaveConfirm(true);
    };

    const handleCopyLink = () => {
        if (!chat.handle) return;
        navigator.clipboard.writeText(`@${chat.handle}`);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleJoin = async () => {
        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}/participants/${currentUser.uid}`] = true;
        updates[`/chats/${chat.id}/participantInfo/${currentUser.uid}`] = {
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || null,
            handle: currentUser.handle || '',
            joinedAt: serverTimestamp()
        };
        updates[`/user-chats/${currentUser.uid}/${chat.id}`] = { muted: false };
        
        await update(ref(db), updates);
    };

    const handleMediaClick = (clickedMessage: Message, imageIndex: number = 0) => {
        const mediaMessages = sharedContent.media;
        let precedingImagesCount = 0;
        for (const msg of mediaMessages) {
            if (msg.id === clickedMessage.id) {
                break;
            }
            precedingImagesCount += msg.imageUrls?.length || 0;
        }
        const startIndex = precedingImagesCount + imageIndex;
        if (mediaMessages.length > 0) {
            setViewingMedia({ messages: mediaMessages, startIndex });
        }
    };
    
    const MemberListItem: React.FC<{ user: User, role?: string; onContextMenu?: (e: React.MouseEvent) => void }> = ({ user, role, onContextMenu }) => (
        <div 
            className="flex items-center p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            onClick={() => onNavigate('user_profile', { userId: user.uid })}
            onContextMenu={onContextMenu}
        >
            <div className="mr-4"><Avatar photoURL={user.photoURL} name={user.displayName} sizeClass="w-12 h-12" /></div>
            <div className="flex-1 min-w-0">
                <NameWithBadges user={user} />
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.isOnline ? <span className="text-blue-500 dark:text-blue-400">online</span> : 'last seen recently'}</p>
            </div>
            {role && <span className="text-sm font-semibold text-blue-500 dark:text-blue-400">{role}</span>}
        </div>
    );

    const SettingsRow: React.FC<{ icon: React.ReactNode, label: string; value: React.ReactNode; onClick?: () => void; children?: React.ReactNode }> = ({ icon, label, value, onClick, children }) => (
        <button onClick={onClick} className="w-full flex items-center p-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:cursor-default">
          <div className="mr-6 text-gray-500 dark:text-gray-400">{icon}</div>
          <div className="flex-1">
            <p className="text-black dark:text-white font-medium">{label}</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <span className="font-medium text-blue-500 dark:text-blue-400">{value}</span>
            {children || <ChevronRightIcon />}
          </div>
        </button>
      );
    
    const TabButton: React.FC<{label: string, value: typeof activeTab, count: number}> = ({label, value, count}) => (
        <button 
            onClick={() => setActiveTab(value)}
            className={`flex-1 pb-2 font-semibold text-center border-b-2 ${activeTab === value ? 'text-[var(--theme-color-primary)] border-[var(--theme-color-primary)]' : 'text-gray-500 border-transparent'}`}
        >
            {label} {count > 0 && <span className="text-xs">{count}</span>}
        </button>
    );

    const renderMain = () => (
        <>
            <div className="p-4 flex flex-col items-center text-center">
                <button onClick={() => setIsProfilePhotoViewerOpen(true)}>
                    <Avatar photoURL={chat.photoURL} name={chat.name} sizeClass="w-24 h-24 mb-2" />
                </button>
                <h1 className="text-2xl font-bold">{chat.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">{Object.keys(chat.participants).length} {isChannel ? 'subscriber' : 'member'}{Object.keys(chat.participants).length !== 1 ? 's' : ''}</p>
            </div>
            {isMember ? (
                <>
                    <div className="p-4 border-b border-t border-gray-200 dark:border-gray-800">
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                            {chat.description && (
                                <div>
                                    <p className="text-black dark:text-white px-4 py-3">{chat.description}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-3">Description</p>
                                </div>
                            )}
                            {creationDate && (
                                <div>
                                    <p className="text-black dark:text-white px-4 py-3">{new Date(creationDate).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour12: true, hour: 'numeric', minute: 'numeric' })}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-3">Created</p>
                                </div>
                            )}
                            {chat.isPublic && chat.handle && (
                                <div>
                                    <button onClick={handleCopyLink} className="w-full text-left px-4 py-3">
                                        <p className="text-blue-500 dark:text-blue-400">{linkCopied ? 'Copied!' : `@${chat.handle}`}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Public Link</p>
                                    </button>
                                </div>
                            )}
                             <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <BellIcon/>
                                    <span className="font-medium">Notifications</span>
                                </div>
                                <Toggle checked={!isMuted} onChange={handleToggleMute} />
                            </div>
                        </div>
                    </div>

                    <div className="sticky top-[73px] bg-white/80 dark:bg-black/80 backdrop-blur-sm z-10 px-4 pt-2">
                        <div className="flex">
                            <TabButton label={isChannel ? "Subscribers" : "Members"} value="members" count={members.length} />
                            <TabButton label="Media" value="media" count={sharedContent.media.length} />
                            <TabButton label="Links" value="links" count={sharedContent.links.length} />
                        </div>
                    </div>
                    
                    <div className="p-4">
                        {contentLoading ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</p> : (
                            <>
                                {activeTab === 'members' && (
                                    (isChannel && !isPrivileged) ? (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">The subscriber list is hidden in this channel.</p>
                                    ) : (
                                        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                                            {canAddMembers && (
                                                <button onClick={() => onNavigate('add_members', { chat })} className="w-full flex items-center p-3 text-left hover:bg-black/5 dark:hover:bg-white/5">
                                                    <AddMemberIcon />
                                                    <span className="ml-4 font-semibold text-blue-500 dark:text-blue-400">Add {isChannel ? 'Subscribers' : 'Members'}</span>
                                                </button>
                                            )}
                                            {members.map(user => {
                                                let role = '';
                                                if (isPrivileged) {
                                                    role = user.uid === chat.ownerId ? 'Owner' : (chat.admins?.[user.uid] ? (chat.admins[user.uid].customTitle || 'Admin') : '');
                                                }
                                                return <MemberListItem key={user.uid} user={user} role={role} onContextMenu={(e) => handleMemberLongPress(e, user)} />
                                            })}
                                        </div>
                                    )
                                )}
                                {activeTab === 'media' && (
                                    sharedContent.media.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1">
                                            {sharedContent.media.flatMap(msg => (msg.imageUrls || []).map((url, index) => (
                                                <button key={`${msg.id}-${index}`} onClick={() => handleMediaClick(msg, index)} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-sm">
                                                    <img src={url} alt="shared media" className="w-full h-full object-cover" />
                                                </button>
                                            )))}
                                        </div>
                                    ) : <p className="text-center text-gray-500 py-8">No shared media yet.</p>
                                )}
                                {activeTab === 'links' && (
                                    sharedContent.links.length > 0 ? (
                                        <div className="space-y-3">
                                            {sharedContent.links.map(msg => (
                                                <button key={msg.id} onClick={() => onSelectChat(chat, msg.id)} className="block w-full text-left p-3 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg">
                                                    <p className="font-semibold text-blue-500 dark:text-blue-400 truncate">{msg.text}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : <p className="text-center text-gray-500 py-8">No shared links yet.</p>
                                )}
                            </>
                        )}
                    </div>
                    
                    <div className="p-4 mt-4">
                        <button 
                            onClick={handleLeaveOrDeleteClick} 
                            className="w-full flex items-center justify-center p-3 text-red-500 dark:text-red-400 font-semibold bg-white dark:bg-[#1e1e1e] rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                            <LeaveIcon />
                            <span className="ml-3">{isOwner ? (isChannel ? `Delete ${'Channel'}`: `Delete ${'Group'}`) : (isChannel ? `Leave ${'Channel'}`: `Leave ${'Group'}`)}</span>
                        </button>
                    </div>
                </>
            ) : null}
        </>
    );

    const PermissionToggleRow: React.FC<{label: string, checked: boolean, onChange: (checked: boolean) => void}> = ({ label, checked, onChange }) => (
        <div className="flex items-center justify-between p-3">
            <span className="font-medium text-black dark:text-white">{label}</span>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );

    const renderEdit = () => {
        const renderHandleStatus = () => {
            if (!editedHandle || (chat.handle && editedHandle.toLowerCase() === chat.handle.toLowerCase())) return null;
            switch (handleStatus) {
                case 'checking': return <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>;
                case 'available': return <CheckCircleIcon />;
                case 'taken': case 'invalid': return <ExclamationCircleIcon />;
                default: return null;
            }
        };

        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center space-x-4">
                    <label htmlFor="photo-upload" className="cursor-pointer"><Avatar photoURL={editedPhotoPreview} name={editedName} sizeClass="w-20 h-20" /></label>
                    <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={handlePhotoChange} />
                    <input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Group Name" className="flex-1 bg-transparent text-xl font-bold focus:outline-none border-b border-gray-200 dark:border-gray-700 focus:border-blue-500" />
                    <label htmlFor="photo-upload" className="cursor-pointer"><EmojiIcon /></label>
                </div>
                <button className="text-blue-500 dark:text-blue-400 font-semibold" onClick={() => document.getElementById('photo-upload')?.click()}>Set Photo</button>
                <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-transparent focus:outline-none border-b border-gray-200 dark:border-gray-700 focus:border-blue-500" />
                
                {chat.isPublic && (
                    <div>
                        <h3 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Public Link</h3>
                        <div className="relative">
                            <input 
                                value={editedHandle} 
                                onChange={e => setEditedHandle(e.target.value)}
                                onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); }}
                                placeholder="@youruniquelink" 
                                className="w-full bg-transparent px-3 pr-10 focus:outline-none border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 pb-2 pt-1" 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pt-1">{renderHandleStatus()}</div>
                        </div>
                        {handleError && <p className="text-xs text-red-400 mt-1">{handleError}</p>}
                        <p className="text-xs text-gray-500 mt-2">People will be able to find and join your {chat.type} using this public handle.</p>
                    </div>
                )}

                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg">
                    <SettingsRow icon={<GroupTypeIcon />} label="Group Type" value={chat.isPublic ? "Public" : "Private"} onClick={() => setIsVisibilityModalOpen(true)} />
                    <SettingsRow icon={<ChatHistoryIcon />} label="Chat History" value={chat.chatHistoryVisibleForNewMembers ? "Visible" : "Hidden"} onClick={() => setIsVisibilityModalOpen(true)} />
                </div>

                <div className="p-4">
                    <h3 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Member Permissions</h3>
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg divide-y divide-gray-200 dark:divide-gray-800">
                        <PermissionToggleRow 
                            label="Send Messages" 
                            checked={editedPermissions.canSendMessages} 
                            onChange={val => setEditedPermissions(p => ({...p, canSendMessages: val}))} 
                        />
                        <PermissionToggleRow 
                            label="Send Media" 
                            checked={editedPermissions.canSendMedia} 
                            onChange={val => setEditedPermissions(p => ({...p, canSendMedia: val}))} 
                        />
                        <PermissionToggleRow 
                            label="Send Stickers & GIFs" 
                            checked={editedPermissions.canSendStickersAndGifs} 
                            onChange={val => setEditedPermissions(p => ({...p, canSendStickersAndGifs: val}))} 
                        />
                        <PermissionToggleRow 
                            label="Embed Links" 
                            checked={editedPermissions.canEmbedLinks} 
                            onChange={val => setEditedPermissions(p => ({...p, canEmbedLinks: val}))} 
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 px-1">Choose what members of this group are allowed to do.</p>
                </div>


                {(!isChannel || isPrivileged) && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg">
                        <SettingsRow icon={<AdministratorsIcon />} label="Administrators" value={`${Object.keys(chat.admins || {}).length}`} onClick={() => setView('admins')} />
                        <SettingsRow icon={<MembersIcon />} label={isChannel ? 'Subscribers' : 'Members'} value={`${members.length}`} onClick={() => setView('main')} />
                    </div>
                )}
            </div>
        )
    };
    
    const renderHeader = () => {
        let title = isChannel ? "Channel Info" : "Group Info";
        let onBackAction: () => void = onBack;
        let RightButton = canEdit ? <button onClick={() => setView('edit')} className="p-2 rounded-full text-[var(--theme-color-primary)] hover:bg-black/10 dark:hover:bg-white/10"><EditIcon /></button> : <div className="w-10 h-10" />;
        
        switch(view) {
            case 'edit': title = "Edit"; onBackAction = () => setView('main'); RightButton = <button onClick={handleSave} disabled={isSaving || (chat.isPublic && handleStatus !== 'available')} className="p-2 rounded-full text-[var(--theme-color-primary)] hover:bg-black/10 dark:hover:bg-white/10 disabled:text-gray-600">{isSaving ? '...' : <CheckIcon />}</button>; break;
            case 'admins': title = "Administrators"; onBackAction = () => setView(canEdit ? 'edit' : 'main'); RightButton = <div className="w-10 h-10" />; break;
        }

        return (
            <header className="flex items-center justify-between p-3 flex-shrink-0 sticky top-0 z-10 bg-gray-100/80 dark:bg-black/80 backdrop-blur-sm">
                <button onClick={onBackAction} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><BackIcon /></button>
                <h1 className="text-xl font-bold">{title}</h1>
                <div className="w-10 h-10 flex items-center justify-center">{RightButton}</div>
            </header>
        );
    };

    if (!isMember) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
                 <header className="w-full flex items-center p-3 flex-shrink-0">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><BackIcon /></button>
                    <h1 className="text-xl font-bold grow text-center pr-12">{isChannel ? 'Channel Info' : 'Group Info'}</h1>
                </header>
                <div className="flex-1 flex flex-col items-center p-8 text-center w-full">
                     <Avatar photoURL={chat.photoURL} name={chat.name} sizeClass="w-32 h-32 mb-4" />
                     <h1 className="text-3xl font-bold">{chat.name}</h1>
                     <p className="text-gray-500 dark:text-gray-400 mt-2">{Object.keys(chat.participants).length} {isChannel ? 'subscribers' : 'members'}</p>
                     <p className="text-gray-600 dark:text-gray-300 mt-4">{chat.description}</p>
                     <div className="mt-auto w-full max-w-xs">
                        <button onClick={handleJoin} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-lg">
                            {isChannel ? 'Join Channel' : 'Join Group'}
                        </button>
                     </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-black text-black dark:text-white" onClick={() => contextMenu && setContextMenu(null)}>
            {renderHeader()}
            <div className="flex-1 overflow-y-auto">
                {view === 'main' && renderMain()}
                {view === 'edit' && renderEdit()}
                {view === 'admins' && <div className="p-4"><div className="bg-white dark:bg-[#1e1e1e] rounded-lg divide-y divide-gray-200 dark:divide-gray-800">{members.filter(m => m.uid === chat.ownerId || chat.admins?.[m.uid]).map(user => { const role = user.uid === chat.ownerId ? 'Owner' : chat.admins?.[user.uid]?.customTitle || 'Admin'; return <MemberListItem key={user.uid} user={user} role={role} onContextMenu={(e) => handleMemberLongPress(e, user)} />})}</div></div>}
            </div>

            {contextMenu && (
                <div 
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed bg-white dark:bg-[#2a2a2a] rounded-md shadow-2xl z-20 overflow-hidden w-60"
                    onClick={(e) => e.stopPropagation()}
                >
                    {chat.admins?.[contextMenu.user.uid] ? (
                        <>
                            <ContextMenuItem icon={<ChangePermissionsIcon />} label="Change permissions" onClick={() => { onNavigate('admin_rights', { chat, user: contextMenu.user }); setContextMenu(null); }} />
                            {canManageAdmins && <ContextMenuItem icon={<DemoteIcon />} label="Demote Admin" onClick={() => handleDemoteAdmin(contextMenu.user)} />}
                        </>
                    ) : (
                        <ContextMenuItem icon={<PromoteIcon />} label="Promote to admin" onClick={() => { onNavigate('admin_rights', { chat, user: contextMenu.user }); setContextMenu(null); }} />
                    )}
                    <ContextMenuItem icon={<RemoveFromGroupIcon />} label="Remove from group" onClick={() => { setUserToRemove(contextMenu.user); setContextMenu(null); }} isDestructive />
                </div>
            )}

            {userToRemove && <RemoveMemberModal isOpen={!!userToRemove} onClose={() => setUserToRemove(null)} onConfirm={confirmRemoveFromGroup} userName={userToRemove.displayName || 'user'} />}
            {isVisibilityModalOpen && <GroupVisibilityModal isOpen={isVisibilityModalOpen} onClose={() => setIsVisibilityModalOpen(false)} onSave={handleSaveVisibilitySettings} chat={chat} />}
            {showLeaveConfirm && <LeaveGroupModal onClose={() => setShowLeaveConfirm(false)} onConfirm={handleConfirmLeave} isChannel={isChannel} groupName={chat.name || 'this group'} />}
            {showDeleteConfirm && (
                <DeleteGroupModal 
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirmDelete={handleConfirmDeleteGroup}
                    onTransfer={() => {
                        setShowDeleteConfirm(false);
                        setShowTransferOwnership(true);
                    }}
                    canTransfer={Object.keys(chat.admins || {}).filter(id => id !== currentUser.uid).length > 0}
                    isChannel={isChannel}
                />
            )}
            {showTransferOwnership && (
                <TransferOwnershipModal 
                    admins={members.filter(m => chat.admins?.[m.uid] && m.uid !== currentUser.uid)}
                    onClose={() => setShowTransferOwnership(false)}
                    onConfirm={handleTransferOwnership}
                />
            )}
            {viewingMedia && (
                <FullscreenMediaViewer
                    media={viewingMedia}
                    onClose={() => setViewingMedia(null)}
                    onForward={(msg) => onNavigate('forwarding', { messages: [msg] })}
                    onReply={(msg) => onSelectChat(chat, undefined, { replyToId: msg.id })}
                    currentUser={currentUser}
                    chat={chat}
                    onGoToMessage={(targetChat, messageId) => {
                        onSelectChat(targetChat, messageId);
                        setViewingMedia(null);
                    }}
                />
            )}
            {isProfilePhotoViewerOpen && (
                <ProfilePhotoViewer
                    photoURL={chat.photoURL}
                    name={chat.name}
                    onClose={() => setIsProfilePhotoViewerOpen(false)}
                />
            )}
        </div>
    );
};

// --- Sub-components for Modals ---

const RemoveMemberModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (blockUser: boolean) => void; userName: string; }> = ({ isOpen, onClose, onConfirm, userName }) => {
    const [blockUser, setBlockUser] = useState(false);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs" onClick={e => e.stopPropagation()}>
                <div className="p-4">
                    <h2 className="font-bold text-lg mb-2 text-black dark:text-white">Remove {userName}?</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">They will no longer be a member of this group and won't be able to see messages.</p>
                    <div className="flex items-center space-x-3 my-4">
                        <input type="checkbox" id="blockUser" checked={blockUser} onChange={(e) => setBlockUser(e.target.checked)} className="h-5 w-5 rounded text-[var(--theme-color-primary)] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--theme-color-primary)]" />
                        <label htmlFor="blockUser" className="text-black dark:text-gray-300 text-sm">Ban user</label>
                    </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 rounded-b-lg flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">CANCEL</button>
                    <button onClick={() => onConfirm(blockUser)} className="px-4 py-2 rounded-md text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">REMOVE</button>
                </div>
            </div>
        </div>
    );
};

const GroupVisibilityModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (settings: { isPublic: boolean, historyVisible: boolean }) => void; chat: Chat; }> = ({ isOpen, onClose, onSave, chat }) => {
    const [isPublic, setIsPublic] = useState(chat.isPublic || false);
    const [historyVisible, setHistoryVisible] = useState(chat.chatHistoryVisibleForNewMembers || false);
    const isChannel = chat.type === ChatType.Channel;

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
            <style>{`@keyframes slide-up-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-slide-up-sheet { animation: slide-up-sheet 0.3s ease-out forwards; }`}</style>
            <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-t-2xl flex flex-col animate-slide-up-sheet text-black dark:text-white" onClick={(e) => e.stopPropagation()}>
                <div className="text-center py-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-800"><div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto"></div></div>
                <div className="p-4 space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{isChannel ? 'Channel' : 'Group'} Type</h3>
                        <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-1 flex space-x-1">
                            <button onClick={() => setIsPublic(false)} className={`w-1/2 py-2 rounded-md font-semibold ${!isPublic ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>Private</button>
                            <button onClick={() => setIsPublic(true)} className={`w-1/2 py-2 rounded-md font-semibold ${isPublic ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>Public</button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 px-1">{isPublic ? `Public ${isChannel ? 'channels' : 'groups'} can be found in search, anyone can join.` : `Private ${isChannel ? 'channels' : 'groups'} can only be joined via an invite link.`}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">History for new members</h3>
                        <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-1 flex space-x-1">
                            <button onClick={() => setHistoryVisible(true)} className={`w-1/2 py-2 rounded-md font-semibold ${historyVisible ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>Visible</button>
                            <button onClick={() => setHistoryVisible(false)} className={`w-1/2 py-2 rounded-md font-semibold ${!historyVisible ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>Hidden</button>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <button onClick={() => onSave({ isPublic, historyVisible })} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

const LeaveGroupModal: React.FC<{ onClose: () => void; onConfirm: () => void; isChannel: boolean; groupName: string }> = ({ onClose, onConfirm, isChannel, groupName }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="p-4">
                <h2 className="font-bold text-lg mb-2 text-black dark:text-white">Leave {isChannel ? 'Channel' : 'Group'}?</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Are you sure you want to leave "{groupName}"?</p>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 rounded-b-lg flex justify-end space-x-2">
                <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">CANCEL</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">LEAVE</button>
            </div>
        </div>
    </div>
);

const DeleteGroupModal: React.FC<{ onClose: () => void; onConfirmDelete: () => void; onTransfer: () => void; canTransfer: boolean, isChannel: boolean }> = ({ onClose, onConfirmDelete, onTransfer, canTransfer, isChannel }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs p-4 text-black dark:text-white" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Manage Ownership</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">As the {isChannel ? 'channel' : 'group'} owner, you can't leave directly. You can either delete the {isChannel ? 'channel' : 'group'} for everyone, or transfer ownership to another admin before leaving.</p>
            <div className="space-y-2">
                {canTransfer && <button onClick={onTransfer} className="w-full text-left p-3 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-black/5 dark:hover:bg-white/10">Transfer Ownership</button>}
                <button onClick={onConfirmDelete} className="w-full text-left p-3 rounded-lg text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10">Delete {isChannel ? 'Channel' : 'Group'} Permanently</button>
                <button onClick={onClose} className="w-full text-left p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10">Cancel</button>
            </div>
        </div>
    </div>
);

const TransferOwnershipModal: React.FC<{ admins: User[]; onClose: () => void; onConfirm: (newOwnerId: string) => void; }> = ({ admins, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg p-4 text-black dark:text-white">Transfer Ownership</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm px-4 mb-2">Select a new owner. You will become an admin and will then be able to leave the group.</p>
            <div className="max-h-60 overflow-y-auto border-t border-b border-gray-200 dark:border-gray-700">
                {admins.length > 0 ? admins.map(admin => (
                    <div key={admin.uid} onClick={() => onConfirm(admin.uid)} className="flex items-center p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
                        <Avatar photoURL={admin.photoURL} name={admin.displayName} sizeClass="w-10 h-10 mr-3" />
                        <p className="font-semibold text-black dark:text-white truncate">{admin.displayName}</p>
                    </div>
                )) : <p className="p-4 text-gray-500 text-center">No other admins to transfer ownership to.</p>}
            </div>
             <div className="p-2 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">CANCEL</button>
            </div>
        </div>
    </div>
);

export default GroupInfoScreen;
