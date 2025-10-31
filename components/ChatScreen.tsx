import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, TouchEvent } from 'react';
import { db } from '../services/firebase';
// FIX: Corrected imports to ensure all necessary Firebase methods are available for message querying and pagination.
import { ref, onValue, off, push, update, serverTimestamp, query, get, limitToLast, set, equalTo, orderByChild, endAt, startAt, onChildAdded, onChildChanged, onChildRemoved, orderByKey } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { User, Chat, Message, StickerPack, Sticker, PrivacySettings } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';
import EmojiPicker from './EmojiPicker';
import StickerPackDetailScreen from './StickerPackDetailScreen';


interface ChatScreenProps {
  chat: Chat;
  currentUser: User;
  onBack: () => void;
  onNavigate: (view: string, payload?: any) => void;
  onSelectChat: (chat: Chat, messageId?: string) => void;
  initialMessageId?: string | null;
  initialSearchQuery?: string | null;
  initialReplyToId?: string | null;
  onTriggerUndo: (message: string, onConfirm: () => Promise<void>, onUndo?: () => void) => void;
  onTriggerToast: (message: string) => void;
}

const INITIAL_MESSAGES_LIMIT = 20;
const OLDER_MESSAGES_LIMIT = 20;
const MAX_MESSAGES_IN_MEMORY = 200;
const RENDER_BATCH_INTERVAL = 300;
const SCROLL_THROTTLE_DELAY = 300;


// --- Sound Effects ---
const playTickSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) { console.error("Could not play sound", e); }
};

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const CallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const MuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg>;
const UnmuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--theme-color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const CheckIcon = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const DoneAllIcon = ({ className = "w-5 h-5"}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7m-3-4l-8.5 8.5" /></svg>;
const CloseIconSmall = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const AttachFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>;
const StickerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ReplyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" /></svg>;
const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12V4h-1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>;
const UnpinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12V4h-1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" /></svg>;
const PinnedMessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h-1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ReplyIconSmall = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;
const PinIconSmall = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h-1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const AddAttachmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--theme-color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const WallpaperIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClearHistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const BlockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
const LeaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const BellSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg>;


// --- Helper Components & Functions ---

const NameWithBadges: React.FC<{
    name: string | null;
    isPremium?: boolean;
    profileBadgeUrl?: string | null;
    textClass?: string;
    containerClass?: string;
    badgeSizeClass?: string;
}> = ({ name, isPremium, profileBadgeUrl, textClass = "font-bold", containerClass = "flex items-center gap-1", badgeSizeClass = "w-4 h-4" }) => {
    return (
        <div className={containerClass}>
            <span className={textClass}>{name || 'Unknown'}</span>
            {isPremium && profileBadgeUrl && (
                <img src={profileBadgeUrl} alt="badge" className={`${badgeSizeClass} flex-shrink-0`} title="Premium" />
            )}
        </div>
    );
};


// FIX: Define MessageMeta component to render message metadata like timestamp and read status.
const MessageMeta: React.FC<{
    timestamp: number;
    isEdited?: boolean;
    isSentByMe: boolean;
    isReadByAll: boolean;
}> = ({ timestamp, isEdited, isSentByMe, isReadByAll }) => {
    return (
        <div className="flex items-center space-x-1 text-xs opacity-70">
            {isEdited && <span className="italic mr-1">edited</span>}
            <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            {isSentByMe && (isReadByAll ? <DoneAllIcon className="w-5 h-5 text-blue-400" /> : <CheckIcon className="w-5 h-5 opacity-80" />)}
        </div>
    );
};

// FIX: Define getEmojiOnlyData function to check if a string contains only emojis.
function getEmojiOnlyData(text: string): { isEmojiOnly: boolean; count: number } {
    if (!text || !text.trim()) return { isEmojiOnly: false, count: 0 };
    try {
        const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
        const graphemes = Array.from(segmenter.segment(text.trim())).map((s: { segment: string; index: number; input: string }) => s.segment);
        const emojiRegex = /\p{Emoji}/u;
        const allAreEmojis = graphemes.every(g => emojiRegex.test(g));
        return { isEmojiOnly: allAreEmojis, count: allAreEmojis ? graphemes.length : 0 };
    } catch (e) {
        // Fallback for older browsers that don't support Intl.Segmenter
        const emojiRegex = /^(?:\p{Emoji}(?:\u{FE0F}|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})?)+$/u;
        return { isEmojiOnly: emojiRegex.test(text.trim()), count: text.trim().length };
    }
}

const formatDateSeparator = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDay.getTime() === today.getTime()) {
        return 'TODAY';
    }
    if (messageDay.getTime() === yesterday.getTime()) {
        return 'YESTERDAY';
    }
    if (messageDay.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
};

const LinkifyText: React.FC<{ text: string, onTriggerToast: (message: string) => void }> = ({ text, onTriggerToast }) => {
    if (!text) return null;
    const urlRegex = /(\b(?:https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\b[A-Z0-9.-]+\.[A-Z]{2,}\b(?!\/))/gi;
    const parts = text.split(urlRegex).filter(Boolean);
    
    const handleLongPress = (e: React.MouseEvent, url: string) => {
        e.preventDefault();
        navigator.clipboard.writeText(url);
        onTriggerToast('Link copied');
    };

    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    let href = part;
                    if (!href.startsWith('http')) {
                        href = `https://${href}`;
                    }
                    return (
                        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline" onClick={e => e.stopPropagation()} onContextMenu={e => handleLongPress(e, href)}>
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};

const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
};

const VideoPreview: React.FC<{ url: string }> = ({ url }) => {
    const embedUrl = getYoutubeEmbedUrl(url);
    if (!embedUrl) return null;

    return (
        <div className="aspect-video bg-black">
            <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Embedded YouTube video"
            />
        </div>
    );
};

const getChatDisplayInfo = (chat: Chat, currentUserId: string) => {
    if (chat.type === ChatType.Group || chat.type === ChatType.Channel) {
        const participantCount = Object.keys(chat.participants).length;
        const memberText = chat.type === ChatType.Channel ? 'subscriber' : 'member';
        return {
            name: chat.name || 'Unnamed Group',
            photoURL: chat.photoURL,
            onlineStatus: `${participantCount} ${memberText}${participantCount !== 1 ? 's' : ''}`
        }
    }
    const otherUserId = Object.keys(chat.participants || {}).find(uid => uid !== currentUserId);
    if (!otherUserId) {
      return { name: 'Unknown User', photoURL: null, onlineStatus: 'offline' };
    }
    const otherUser = chat.participantInfo?.[otherUserId];
    if (!otherUser) {
        return { name: 'Unknown User', photoURL: null, onlineStatus: 'offline' };
    }
    return { 
        name: otherUser.displayName || 'Unknown User', 
        photoURL: otherUser.photoURL,
        onlineStatus: 'fetching...'
    };
}
const GroupedImageMessage: React.FC<{
    group: { senderId: string; messages: Message[] };
    isSentByMe: boolean;
    senderInfo: any;
    onMediaClick: (message: Message, imageIndex: number) => void;
    onClick: (message: Message) => void;
    chatDetails: Chat;
    currentUser: User;
    onTriggerToast: (message: string) => void;
}> = ({ group, isSentByMe, senderInfo, onMediaClick, onClick, chatDetails, currentUser, onTriggerToast }) => {
    const allImages = useMemo(() => 
        group.messages.flatMap(msg => 
            (msg.imageUrls || []).map((url, imgIndex) => ({
                url, msg, imgIndex
            }))
        ), [group.messages]);

    const totalImages = allImages.length;
    const lastMessage = group.messages[group.messages.length - 1];

    const isReadByAll = isSentByMe && chatDetails.type === ChatType.Private 
        ? (chatDetails.unreadCounts?.[Object.keys(chatDetails.participants).find(p => p !== currentUser.uid)!] || 0) === 0 
        : false;

    if (totalImages === 0) return null;

    const imagesToDisplay = allImages.slice(0, 4);
    const hasMore = totalImages > 4;

    const ImageButton: React.FC<{item: {url: string, msg: Message, imgIndex: number}, className?: string, children?: React.ReactNode}> = ({item, className = '', children}) => (
        <button 
            key={`${item.msg.id}-${item.imgIndex}`}
            onClick={(e) => { e.stopPropagation(); onMediaClick(item.msg, item.imgIndex); }}
            className={`relative bg-black/20 overflow-hidden ${className}`}
        >
            <img src={item.url} alt={`image from ${item.msg.id}`} className="w-full h-full object-cover" />
            {children}
        </button>
    );

    const renderGridLayout = () => {
        if (totalImages === 1) {
            const item = allImages[0];
            const hasCaption = item.msg.text && item.msg.text.trim().length > 0;
            return (
                <div className="rounded-2xl overflow-hidden shadow-md max-w-[75%]">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMediaClick(item.msg, item.imgIndex); }}
                        className="relative bg-black/20 block"
                    >
                         <img src={item.url} alt={`image`} className="max-w-full max-h-96 object-contain" />
                         <div className="absolute bottom-1 right-1.5 bg-black/50 rounded-lg px-1.5 py-0.5 backdrop-blur-sm">
                            <MessageMeta timestamp={item.msg.timestamp} isSentByMe={isSentByMe} isReadByAll={isReadByAll} />
                        </div>
                         {hasCaption && (
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 text-white text-sm backdrop-blur-sm">
                                <LinkifyText text={item.msg.text} onTriggerToast={onTriggerToast} />
                            </div>
                        )}
                    </button>
                </div>
            )
        }
        
        let gridClasses = '';
        if (totalImages === 2) gridClasses = 'grid grid-cols-2 gap-0.5';
        else if (totalImages === 3) gridClasses = 'grid grid-cols-2 grid-rows-2 gap-0.5';
        else gridClasses = 'grid grid-cols-2 grid-rows-2 gap-0.5';

        return (
            <div className={`rounded-2xl overflow-hidden shadow-md max-w-[85%] aspect-square ${gridClasses}`}>
               {totalImages === 3 ? (
                    <>
                        <ImageButton item={allImages[0]} className="row-span-2 col-span-1" />
                        <ImageButton item={allImages[1]} className="col-start-2 row-start-1" />
                        <ImageButton item={allImages[2]} className="col-start-2 row-start-2" />
                    </>
               ) : ( // Covers 2, 4, and 5+ cases
                    <>
                        {imagesToDisplay.map((item, index) => (
                             <ImageButton key={`${item.msg.id}-${item.imgIndex}`} item={item}>
                                {hasMore && index === 3 && (
                                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                         <span className="text-white text-3xl font-bold">+{totalImages - 3}</span>
                                     </div>
                                )}
                             </ImageButton>
                        ))}
                    </>
               )}
            </div>
        );
    };

    const captionMessage = group.messages.find(m => m.text && m.text.trim().length > 0);

    return (
        <div 
            className={`w-full flex items-end gap-2.5 my-1 ${isSentByMe ? 'justify-end' : ''}`} 
            id={group.messages[0].id}
        >
            {!isSentByMe && <Avatar photoURL={senderInfo?.photoURL} name={senderInfo?.displayName} sizeClass="w-8 h-8"/>}
            <div className={`relative flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}>
                {renderGridLayout()}
                {captionMessage?.text && (
                     <div className={`px-4 py-2 mt-1 rounded-2xl max-w-[85%] ${isSentByMe ? 'bg-[var(--theme-color-bubble-user-bg)] text-[var(--theme-color-bubble-user-text)] rounded-br-sm' : 'bg-[var(--theme-color-bubble-other-bg)] text-[var(--theme-color-bubble-other-text)] rounded-bl-sm'}`}>
                        <LinkifyText text={captionMessage.text} onTriggerToast={onTriggerToast} />
                    </div>
                )}
                {totalImages > 1 && (
                    <div className="mt-1 px-1">
                        <MessageMeta timestamp={lastMessage.timestamp} isSentByMe={isSentByMe} isReadByAll={isReadByAll} />
                    </div>
                )}
            </div>
        </div>
    );
};


const AttachmentPreviewBar: React.FC<{files: File[], onRemove: (index: number) => void, onAddMore: () => void}> = ({ files, onRemove, onAddMore }) => {
    if (files.length === 0) return null;
    return (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
            <div className="flex space-x-2 overflow-x-auto items-center">
                {files.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="relative w-16 h-16 flex-shrink-0 group">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                        <button 
                            onClick={() => onRemove(index)} 
                            className="absolute -top-1 -right-1 bg-gray-900/80 dark:bg-gray-800/80 p-0.5 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove ${file.name}`}
                        >
                            <CloseIconSmall />
                        </button>
                    </div>
                ))}
                <button 
                    onClick={onAddMore}
                    className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-200/80 dark:bg-gray-800/80 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Add more attachments"
                >
                    <AddAttachmentIcon />
                </button>
            </div>
        </div>
    );
};

const ReplyPreview: React.FC<{replyTo: Message | null, participantInfo: Chat['participantInfo'], onCancel: () => void}> = ({ replyTo, participantInfo, onCancel }) => {
    if (!replyTo) return null;
    
    const senderInfo = participantInfo[replyTo.senderId];
    const senderName = senderInfo?.displayName || 'Unknown';
    let content: React.ReactNode = replyTo.text;
    let previewImage: string | null = null;

    if (replyTo.stickerUrl) {
        content = 'Sticker';
        previewImage = replyTo.stickerUrl;
    } else if (replyTo.imageUrls?.length) {
        content = replyTo.text || 'Photo';
        previewImage = replyTo.imageUrls[0];
    } else if (replyTo.gifUrl) {
        content = 'GIF';
        previewImage = replyTo.gifUrl;
    }

    if (typeof content === 'string' && content.length > 30) {
        content = content.substring(0, 30) + '...';
    }

    return (
        <div className="px-3 pt-3 bg-white dark:bg-[#1e1e1e]">
            <div className="bg-gray-100 dark:bg-black/40 backdrop-blur-sm p-2 rounded-t-lg flex items-center gap-3 relative border-l-2 border-[var(--theme-color-primary)]">
                {previewImage && (
                    <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/20 flex items-center justify-center">
                        <img src={previewImage} alt="preview" className={`w-full h-full ${replyTo.stickerUrl ? 'object-contain' : 'object-cover'}`} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <NameWithBadges
                        name={senderName}
                        isPremium={senderInfo?.isPremium}
                        profileBadgeUrl={senderInfo?.profileBadgeUrl}
                        textClass="font-semibold text-[var(--theme-color-primary)] text-sm truncate"
                    />
                    <p className="text-gray-600 dark:text-gray-300 truncate text-sm">{content}</p>
                </div>
                <button onClick={onCancel} className="p-1 absolute top-1 right-1 rounded-full bg-black/30 hover:bg-black/50"><CloseIconSmall /></button>
            </div>
        </div>
    );
};

const FullscreenMediaViewer: React.FC<{
    media: {messages: Message[], startIndex: number}, 
    onClose: () => void, 
    onForward: (msg: Message) => void, 
    onReply: (msg: Message) => void, 
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

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            setTouchState({ startX: e.touches[0].clientX, deltaX: 0, isSwiping: true });
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
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
                 <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Download</span></button>
                 <button onClick={() => onReply(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ReplyIcon /><span>Reply</span></button>
                 <button onClick={() => onGoToMessage(chat, currentItem.message.id)} className="flex flex-col items-center space-y-1 text-white"><ChatBubbleIcon /><span>Go to Message</span></button>
                 <button onClick={() => onForward(currentItem.message)} className="flex flex-col items-center space-y-1 text-white"><ForwardIcon /><span>Forward</span></button>
            </footer>
        </div>
    );
};

const PinnedMessageBar: React.FC<{chat: Chat, onPinClick: (messageId: string) => void, onUnpin: (messageId: string) => void}> = ({ chat, onPinClick, onUnpin }) => {
    const [currentPinIndex, setCurrentPinIndex] = useState(0);

    const sortedPins = useMemo(() => {
        if (!chat.pinnedMessages) return [];
        type PinnedMessageData = { text: string; senderName: string; timestamp: number; pinnedAt: number; isPremium?: boolean; profileBadgeUrl?: string; };
        return Object.entries(chat.pinnedMessages)
            .filter(([, data]) => data) // Filter out null/deleted pins
            .sort(([, a], [, b]) => ((b as PinnedMessageData).pinnedAt || 0) - ((a as PinnedMessageData).pinnedAt || 0))
            .map(([id, data]) => ({ id, ...(data as PinnedMessageData) }));
    }, [chat.pinnedMessages]);
    
    useEffect(() => {
        // Reset index if the number of pins changes to avoid out-of-bounds
        if (sortedPins.length > 0 && currentPinIndex >= sortedPins.length) {
            setCurrentPinIndex(0);
        }
    }, [sortedPins.length, currentPinIndex]);

    if (sortedPins.length === 0) return null;

    const currentPin = sortedPins[currentPinIndex];

    if (!currentPin) {
        return null;
    }
    
    const handleBarClick = () => {
        onPinClick(currentPin.id);
        if (sortedPins.length > 1) {
            // This will cause a re-render and the key on the <p> tag will trigger the animation
            setCurrentPinIndex(prev => (prev + 1) % sortedPins.length);
        }
    };

    const handleUnpinClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        onUnpin(currentPin.id); // Use the passed handler
    };

    return (
        <div onClick={handleBarClick} className="p-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors animate-slide-in-down relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
            <div className="flex-1 min-w-0 pl-3">
                <p className="font-bold text-blue-400 dark:text-blue-400">Pinned Message {sortedPins.length > 1 ? `(${currentPinIndex + 1} of ${sortedPins.length})` : ''}</p>
                {/* The animation will be handled by re-mounting the p tag due to the key change */}
                <p key={currentPin.id} className="text-sm text-gray-600 dark:text-gray-200 truncate animate-fade-in">
                    <NameWithBadges
                        name={currentPin.senderName}
                        isPremium={currentPin.isPremium}
                        profileBadgeUrl={currentPin.profileBadgeUrl}
                        textClass="font-semibold text-blue-500 dark:text-blue-300"
                        containerClass="inline-flex items-center gap-1"
                    />
                    : {currentPin.text}
                </p>
            </div>
            <button onClick={handleUnpinClick} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CloseIcon /></button>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{messages: Message[], currentUser: User, chat: Chat, onDismiss: () => void, onDelete: (messages: Message[], forEveryone: boolean) => void}> = ({ messages, currentUser, chat, onDismiss, onDelete }) => {
    const isPrivateChat = chat.type === ChatType.Private;
    const otherUserId = isPrivateChat ? Object.keys(chat.participants || {}).find(uid => uid !== currentUser.uid) : null;
    const otherUserName = otherUserId ? chat.participantInfo[otherUserId]?.displayName : null;

    const isAdminWithDeletePerms = (chat.type === ChatType.Group || chat.type === ChatType.Channel) && chat.admins?.[currentUser.uid]?.canDeleteMessages;
    const isWithinTimeLimit = (msg: Message) => Date.now() - msg.timestamp < 48 * 60 * 60 * 1000;

    const canDeleteForEveryone = messages.every(message => {
        const isMyMessage = message.senderId === currentUser.uid;
        return isPrivateChat || (isMyMessage && isWithinTimeLimit(message)) || !!isAdminWithDeletePerms;
    });
    
    const messageCount = messages.length;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onDismiss}>
            <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-lg mb-4 text-black dark:text-white">Delete {messageCount} Message{messageCount > 1 ? 's' : ''}?</h2>
                <div className="space-y-2">
                    {canDeleteForEveryone && (
                        <button onClick={() => onDelete(messages, true)} className="w-full text-left p-3 rounded-lg text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10">
                            {isPrivateChat && otherUserName && messageCount === 1 ? `Delete for You and ${otherUserName}` : 'Delete for Everyone'}
                        </button>
                    )}
                    <button onClick={() => onDelete(messages, false)} className="w-full text-left p-3 rounded-lg text-red-500 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/10">Delete for Me</button>
                    <button onClick={onDismiss} className="w-full text-left p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10">Cancel</button>
                </div>
            </div>
        </div>
    );
};

interface MessageActionSheetProps {
    message: Message;
    currentUser: User;
    chat: Chat;
    onDismiss: () => void;
    onReply: () => void;
    onCopy: () => void;
    onForward: () => void;
    onPin: () => void;
    onUnpin: () => void;
    isPinned: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReact: (emoji: string) => void;
    onOpenEmojiPicker: () => void;
}

const MessageActionSheet: React.FC<MessageActionSheetProps> = (props) => {
    const isMyMessage = props.message.senderId === props.currentUser.uid;
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    
    const isGroupOrChannel = props.chat.type === ChatType.Group || props.chat.type === ChatType.Channel;
    const isOwner = props.currentUser.uid === props.chat.ownerId;
    const currentAdminPerms = props.chat.admins?.[props.currentUser.uid];

    // Granular permission checks
    const canPin = isOwner || !!currentAdminPerms?.canPinMessages;
    const canDelete = isMyMessage || isOwner || !!currentAdminPerms?.canDeleteMessages;

    const actionItems = [
        { icon: <ReplyIcon/>, label: 'Reply', action: props.onReply, show: true },
        { icon: <CopyIcon/>, label: 'Copy Text', action: props.onCopy, show: !!props.message.text },
        { icon: <ForwardIcon/>, label: 'Forward', action: props.onForward, show: true },
        props.isPinned 
            ? { icon: <UnpinIcon />, label: 'Unpin', action: props.onUnpin, show: canPin || !isGroupOrChannel }
            : { icon: <PinIcon />, label: 'Pin', action: props.onPin, show: canPin || !isGroupOrChannel },
        { icon: <EditIcon/>, label: 'Edit', action: props.onEdit, show: isMyMessage && !!props.message.text },
        { icon: <DeleteIcon/>, label: 'Delete', action: props.onDelete, destructive: true, show: canDelete || !isGroupOrChannel },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={props.onDismiss}>
            <style>{`@keyframes slide-up-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-slide-up-sheet { animation: slide-up-sheet 0.3s ease-out forwards; }`}</style>
            <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-t-2xl flex flex-col animate-slide-up-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 flex justify-around border-b border-gray-200 dark:border-gray-700">
                    {quickReactions.map(emoji => (
                        <button key={emoji} onClick={() => props.onReact(emoji)} className="text-3xl p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-125">{emoji}</button>
                    ))}
                    <button onClick={props.onOpenEmojiPicker} className="text-3xl p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"><StickerIcon /></button>
                </div>
                <div className="py-2">
                    {actionItems.filter(item => item.show !== false).map(item => (
                        <button key={item.label} onClick={item.action} className={`w-full flex items-center space-x-4 p-4 text-left hover:bg-black/5 dark:hover:bg-white/10 ${item.destructive ? 'text-red-500 dark:text-red-400' : 'text-black dark:text-white'}`}>
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void, isDestructive?: boolean }> = ({ icon, label, onClick, isDestructive }) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 text-left px-4 py-3 hover:bg-black/10 dark:hover:bg-white/10 ${isDestructive ? 'text-red-500 dark:text-red-400' : ''}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

const ChatScreen: React.FC<ChatScreenProps> = ({ chat, currentUser, onBack, onNavigate, onSelectChat, initialMessageId, onTriggerUndo, onTriggerToast }) => {
    const [liveMessages, setLiveMessages] = useState<Message[]>([]);
    const [olderMessages, setOlderMessages] = useState<Message[]>([]);
    const [isFetchingOlder, setIsFetchingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const allMessages = useMemo(() => [...olderMessages, ...liveMessages], [olderMessages, liveMessages]);
    const messageIds = useRef(new Set<string>());
    const newMessagesBuffer = useRef<Message[]>([]);

    const [newMessage, setNewMessage] = useState('');
    const [chatDetails, setChatDetails] = useState(chat);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
    const [messagesToDelete, setMessagesToDelete] = useState<Message[] | null>(null);
    const [reactingToMessage, setReactingToMessage] = useState<Message | null>(null);
    const [highlightedMessage, setHighlightedMessage] = useState<string | null>(initialMessageId);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [handleCache, setHandleCache] = useState<{[key: string]: {type: 'user' | 'chat', id: string, name: string, photoURL: string | null, privacySettings?: PrivacySettings, isPremium?: boolean, profileBadgeUrl?: string | null}}>({});
    const [scrollInfo, setScrollInfo] = useState({ showArrow: false, hasUnreadMentionsBelow: false });
    const [unreadMentionIds, setUnreadMentionIds] = useState<string[]>([]);
    
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const [viewingMedia, setViewingMedia] = useState<{ messages: Message[], startIndex: number } | null>(null);
    const [viewingStickerPackId, setViewingStickerPackId] = useState<string | null>(null);
    
    // Selection Mode State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

    // Mention State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionResults, setMentionResults] = useState<User[]>([]);
    const [mentionTriggerPosition, setMentionTriggerPosition] = useState<{ start: number; end: number } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const scrollRestorationRef = useRef<{ scrollHeight: number } | null>(null);
    const scrollThrottle = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Header Menu State & Search State
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false); // current user blocked otherUser
    const [amIBlocked, setAmIBlocked] = useState(false); // otherUser blocked current user

    const isMember = useMemo(() => !!chatDetails.participants[currentUser.uid], [chatDetails, currentUser.uid]);

    // Permissions Logic
    const isChannel = chat.type === ChatType.Channel;
    const isGroupOrChannel = isChannel || chat.type === ChatType.Group;
    const isOwner = currentUser.uid === chat.ownerId;
    const currentAdminPerms = chat.admins?.[currentUser.uid];
    const isPrivileged = isOwner || !!currentAdminPerms;
    const isPrivilegedInChannel = isChannel && isPrivileged;
    const memberPerms = chatDetails.permissions;
    const canSendMessages = isPrivileged || (memberPerms?.canSendMessages !== false); // Default to true
    const canSendMedia = isPrivileged || (memberPerms?.canSendMedia !== false); // Default to true
    const canSendStickersAndGifs = isPrivileged || (memberPerms?.canSendStickersAndGifs !== false); // Default to true


    const canSeeInfo = (
        infoType: keyof PrivacySettings,
        viewedUser: User | null,
        isContact: boolean
    ): boolean => {
        if (!viewedUser) return false;
        // Default to 'everybody' if not set
        const setting = viewedUser.privacySettings?.[infoType] || 'everybody';
        if (setting === 'everybody') return true;
        if (setting === 'nobody') return false;
        if (setting === 'contacts') return isContact;
        return true; // Permissive default
    };

    // Main message loading and streaming effect
    useEffect(() => {
        // Reset state for new chat
        setLiveMessages([]);
        setOlderMessages([]);
        setHasMore(true);
        messageIds.current.clear();
        newMessagesBuffer.current = [];
        setLoading(true);
        setSelectionMode(false);
        setSelectedMessages(new Set());

        const messagesRef = ref(db, `messages/${chat.id}`);
        let addedListener: any;
        let changedListener: any;
        let removedListener: any;

        const handleMessageUpdate = (updatedMessage: Message) => {
            const updateMessageInState = (messages: Message[]) => 
                messages.map(m => m.id === updatedMessage.id ? updatedMessage : m);
            setLiveMessages(prev => updateMessageInState(prev));
            setOlderMessages(prev => updateMessageInState(prev));
        };

        const handleMessageRemoval = (messageId: string) => {
            messageIds.current.delete(messageId);
            const filterMessage = (messages: Message[]) => messages.filter(m => m.id !== messageId);
            setLiveMessages(prev => filterMessage(prev));
            setOlderMessages(prev => filterMessage(prev));
        };

        // Initial Load
        const initialQuery = query(messagesRef, orderByKey(), limitToLast(INITIAL_MESSAGES_LIMIT));
        get(initialQuery).then(snapshot => {
            const initialMessages: Message[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const message = { id: childSnapshot.key as string, ...childSnapshot.val() } as Message;
                    if (!message.deletedFor?.[currentUser.uid]) {
                        initialMessages.push(message);
                        messageIds.current.add(message.id);
                    }
                });
            }
            
            setLiveMessages(initialMessages);
            if (initialMessages.length < INITIAL_MESSAGES_LIMIT) {
                setHasMore(false);
            }
            setLoading(false);
            
            const lastMessage = initialMessages.length > 0 ? initialMessages[initialMessages.length - 1] : null;
            
            // For new messages
            const streamQuery = lastMessage
                ? query(messagesRef, orderByKey(), startAt(lastMessage.id))
                : query(messagesRef, orderByKey());

            addedListener = onChildAdded(streamQuery, (snapshot) => {
                 if (snapshot.exists()) {
                    const message = { id: snapshot.key as string, ...snapshot.val() } as Message;
                    if (!messageIds.current.has(message.id) && !message.deletedFor?.[currentUser.uid]) {
                        messageIds.current.add(message.id);
                        newMessagesBuffer.current.push(message);
                    }
                }
            });

            // For updates to any message (reactions, edits)
            changedListener = onChildChanged(messagesRef, (snapshot) => {
                if (snapshot.exists()) {
                    const message = { id: snapshot.key as string, ...snapshot.val() } as Message;
                    if (messageIds.current.has(message.id)) {
                        if (!message.deletedFor?.[currentUser.uid]) {
                            handleMessageUpdate(message);
                        } else {
                            handleMessageRemoval(message.id);
                        }
                    }
                }
            });

            // For deletions for everyone
            removedListener = onChildRemoved(messagesRef, (snapshot) => {
                if (snapshot.key && messageIds.current.has(snapshot.key)) {
                    handleMessageRemoval(snapshot.key);
                }
            });
        });

        // Cleanup
        return () => {
            if (addedListener) off(messagesRef, 'child_added', addedListener);
            if (changedListener) off(messagesRef, 'child_changed', changedListener);
            if (removedListener) off(messagesRef, 'child_removed', removedListener);
        };
    }, [chat.id, currentUser.uid]);

    // OPTIMIZATION: Batch render new messages
    useEffect(() => {
        const interval = setInterval(() => {
            if (newMessagesBuffer.current.length > 0) {
                const newMessages = [...newMessagesBuffer.current];
                newMessagesBuffer.current = [];
                setLiveMessages(prev => [...prev, ...newMessages]);
            }
        }, RENDER_BATCH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // OPTIMIZATION: Keep only the last MAX_MESSAGES_IN_MEMORY messages
    useEffect(() => {
        const totalLength = olderMessages.length + liveMessages.length;
        if (totalLength > MAX_MESSAGES_IN_MEMORY) {
            const excess = totalLength - MAX_MESSAGES_IN_MEMORY;
            if (olderMessages.length >= excess) {
                const toRemove = olderMessages.slice(0, excess);
                toRemove.forEach(msg => messageIds.current.delete(msg.id));
                setOlderMessages(prev => prev.slice(excess));
            } else {
                const remainingExcess = excess - olderMessages.length;
                olderMessages.forEach(msg => messageIds.current.delete(msg.id));
                setOlderMessages([]);
                
                const liveToRemove = liveMessages.slice(0, remainingExcess);
                liveToRemove.forEach(msg => messageIds.current.delete(msg.id));
                setLiveMessages(prev => prev.slice(remainingExcess));
            }
        }
    }, [liveMessages, olderMessages]);


    useEffect(() => {
        if (highlightedMessage) {
            if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
            highlightTimeoutRef.current = setTimeout(() => setHighlightedMessage(null), 2500);
        }
        return () => { if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current); }
    }, [highlightedMessage]);

    const loadOlderMessages = async () => {
        if (!hasMore || isFetchingOlder) return;
    
        setIsFetchingOlder(true);
        const oldestMessage = allMessages[0];
    
        if (!oldestMessage) {
            setIsFetchingOlder(false);
            setHasMore(false);
            return;
        }
    
        const container = messageContainerRef.current;
        if (container) {
            scrollRestorationRef.current = { scrollHeight: container.scrollHeight };
        }
    
        const messagesQuery = query(
            ref(db, `messages/${chat.id}`),
            orderByKey(),
            endAt(oldestMessage.id),
            limitToLast(OLDER_MESSAGES_LIMIT + 1)
        );
    
        const snapshot = await get(messagesQuery);
        if (snapshot.exists()) {
            const loadedMessages: Message[] = [];
            snapshot.forEach(childSnapshot => {
                const message = { id: childSnapshot.key as string, ...childSnapshot.val() } as Message;
                // Add only if not already loaded and not deleted
                if (!messageIds.current.has(message.id) && !message.deletedFor?.[currentUser.uid]) {
                    loadedMessages.push(message);
                    messageIds.current.add(message.id);
                }
            });
            loadedMessages.sort((a,b) => a.timestamp - b.timestamp);
    
            if (snapshot.size < OLDER_MESSAGES_LIMIT + 1) {
                setHasMore(false);
            }
            setOlderMessages(prev => [...loadedMessages, ...prev]);
        } else {
            setHasMore(false);
        }
        setIsFetchingOlder(false);
    };

    useLayoutEffect(() => {
        if (scrollRestorationRef.current && messageContainerRef.current) {
            const { scrollHeight: prevScrollHeight } = scrollRestorationRef.current;
            messageContainerRef.current.scrollTop += messageContainerRef.current.scrollHeight - prevScrollHeight;
            scrollRestorationRef.current = null;
        }
    }, [olderMessages]);
    

    useEffect(() => {
        const mentionIds = allMessages
            .filter(m => m.mentions && m.mentions[currentUser.uid])
            .map(m => m.id);
        setUnreadMentionIds(mentionIds);
    }, [allMessages, currentUser.uid]);


    useEffect(() => {
        const fetchHandles = async () => {
            const newCache: typeof handleCache = {};
            const handlesToFetch = new Set<string>();
            allMessages.forEach(message => {
                if (!message.text) return;
                const mentionRegex = /@([a-zA-Z0-9_]+)/g;
                let match;
                while((match = mentionRegex.exec(message.text)) !== null) {
                    const handle = match[1];
                    if (!handleCache[`@${handle}`] && !newCache[`@${handle}`]) handlesToFetch.add(handle);
                }
            });
            if (handlesToFetch.size === 0) return;
            const promises = Array.from(handlesToFetch).map(async (handle) => {
                const userQuery = query(ref(db, 'users'), orderByChild('handle'), equalTo(handle));
                const userSnap = await get(userQuery);
                if(userSnap.exists()){
                    const [uid, userData] = Object.entries(userSnap.val())[0] as [string, User];
                    return { handle: `@${handle}`, data: {type: 'user', id: uid, name: userData.displayName || handle, photoURL: userData.photoURL || null, privacySettings: userData.privacySettings, isPremium: userData.isPremium, profileBadgeUrl: userData.profileBadgeUrl }};
                }
                const chatQuery = query(ref(db, 'chats'), orderByChild('handle'), equalTo(handle));
                const chatSnap = await get(chatQuery);
                if(chatSnap.exists()){
                     const [chatId, chatData] = Object.entries(chatSnap.val())[0] as [string, Chat];
                     return { handle: `@${handle}`, data: {type: 'chat', id: chatId, name: chatData.name || handle, photoURL: chatData.photoURL || null }};
                }
                return null;
            });
            const results = await Promise.all(promises);
            results.forEach(result => { if(result) newCache[result.handle] = result.data; });
            setHandleCache(prev => ({...prev, ...newCache}));
        }
        if (allMessages.length > 0) fetchHandles();
    }, [allMessages, handleCache]);

    useEffect(() => {
        const chatRef = ref(db, `chats/${chat.id}`);
        const listener = onValue(chatRef, (snapshot) => { if(snapshot.exists()) setChatDetails({ id: snapshot.key as string, ...snapshot.val() }); });
        let otherUserListener: any;
        if (chat.type === ChatType.Private) {
            const otherUserId = Object.keys(chat.participants).find(uid => uid !== currentUser.uid);
            if (otherUserId) {
                const otherUserRef = ref(db, `users/${otherUserId}`);
                otherUserListener = onValue(otherUserRef, (snapshot) => { if (snapshot.exists()) setOtherUser({ uid: snapshot.key as string, ...snapshot.val() }); });
            }
        }
        return () => { off(chatRef, 'value', listener); if (otherUserListener) off(ref(db, `users/${Object.keys(chat.participants).find(uid => uid !== currentUser.uid)!}`), 'value', otherUserListener); };
    }, [chat.id, chat.type, chat.participants, currentUser.uid]);

    useEffect(() => {
        set(ref(db, `chats/${chat.id}/unreadCounts/${currentUser.uid}`), null);
        set(ref(db, `chats/${chat.id}/unreadMentions/${currentUser.uid}`), null);
    }, [chat.id, currentUser.uid]);

    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
        if(behavior === 'auto') {
            // Use a timeout to ensure the DOM has updated, especially for auto scroll on load
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 0);
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }
    };
    
    useEffect(() => {
        if (loading) return;
        if (initialMessageId) {
            setTimeout(() => {
                document.getElementById(initialMessageId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            scrollToBottom('auto');
        }
    }, [loading, initialMessageId]);

    // Header Menu Logic
    useEffect(() => {
        if (!isMember) return;
        const userChatRef = ref(db, `user-chats/${currentUser.uid}/${chat.id}`);
        const listener = onValue(userChatRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setIsMuted(typeof data === 'object' && data.muted === true);
            }
        });

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsHeaderMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            off(userChatRef, 'value', listener);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [chat.id, currentUser.uid, isMember]);
    
    useEffect(() => {
        if (chat.type !== ChatType.Private || !otherUser) return;
        // Check if I blocked them
        const myBlockRef = ref(db, `users/${currentUser.uid}/blockedUsers/${otherUser.uid}`);
        const myBlockListener = onValue(myBlockRef, snap => setIsBlocked(snap.exists()));
    
        // Check if they blocked me
        const theirBlockRef = ref(db, `users/${otherUser.uid}/blockedUsers/${currentUser.uid}`);
        const theirBlockListener = onValue(theirBlockRef, snap => setAmIBlocked(snap.exists()));
    
        return () => {
            off(myBlockRef, 'value', myBlockListener);
            off(theirBlockRef, 'value', theirBlockListener);
        };
    }, [currentUser.uid, otherUser, chat.type]);

    const handleToggleMute = async () => {
        const userChatRef = ref(db, `user-chats/${currentUser.uid}/${chat.id}`);
        const snapshot = await get(userChatRef);
        const currentData = snapshot.val();
        const newMutedState = !isMuted;
        const updatePayload = (typeof currentData === 'object' && currentData !== null) 
            ? { ...currentData, muted: newMutedState }
            : { muted: newMutedState };
        await set(userChatRef, updatePayload);
        onTriggerToast(newMutedState ? 'Notifications muted' : 'Notifications unmuted');
    };

    const handleClearHistory = () => {
        onTriggerUndo(
            'Chat history cleared',
            async () => {
                const messagesRef = ref(db, `messages/${chat.id}`);
                const messagesSnap = await get(messagesRef);
                if (messagesSnap.exists()) {
                    const updates: { [key: string]: any } = {};
                    messagesSnap.forEach(msgSnap => {
                        updates[`/messages/${chat.id}/${msgSnap.key}/deletedFor/${currentUser.uid}`] = true;
                    });
                    await update(ref(db), updates);
                }
                await update(ref(db, `chats/${chat.id}`), { lastMessage: '', lastMessageTimestamp: serverTimestamp() });
            }
        );
    };

    const handleDeleteChat = () => {
        onTriggerUndo(
            'Chat deleted',
            async () => {
                const updates: { [key: string]: any } = {};
                updates[`/user-chats/${currentUser.uid}/${chat.id}`] = null;
                if (chat.type !== ChatType.Private) {
                    updates[`/chats/${chat.id}/participants/${currentUser.uid}`] = null;
                    updates[`/chats/${chat.id}/participantInfo/${currentUser.uid}`] = null;
                    updates[`/chats/${chat.id}/admins/${currentUser.uid}`] = null;
                }
                await update(ref(db), updates);
                onBack();
            },
            () => { /* Undo: do nothing, just stay in chat */ }
        );
        onBack(); // Optimistically navigate back
    };
    
    const handleToggleBlock = async () => {
        if (chat.type !== ChatType.Private || !otherUser) return;
        const blockRef = ref(db, `users/${currentUser.uid}/blockedUsers/${otherUser.uid}`);
        if (isBlocked) {
            await set(blockRef, null);
            onTriggerToast(`${otherUser.displayName} unblocked`);
        } else {
            await set(blockRef, true);
            onTriggerToast(`${otherUser.displayName} blocked`);
        }
    };


    const handleSendMessage = async () => {
        const text = newMessage.trim();
        if ((!text && attachments.length === 0) || isSending) return;

        if (attachments.length > 0) {
            handleSendImages();
            return;
        }

        setIsSending(true);
        setSendError(null);
        try {
            const messageData: Partial<Message> = { senderId: currentUser.uid, text, timestamp: serverTimestamp() as any, readBy: { [currentUser.uid]: Date.now() } };
            if (replyTo) {
                const replyToSenderInfo = chatDetails.participantInfo[replyTo.senderId];
                messageData.replyTo = {
                    messageId: replyTo.id,
                    senderId: replyTo.senderId,
                    senderName: replyToSenderInfo?.displayName || 'Unknown',
                    text: replyTo.text || (replyTo.imageUrls?.length ? 'Photo' : (replyTo.stickerUrl ? 'Sticker' : (replyTo.gifUrl ? 'GIF' : '...'))),
                    isPremium: replyToSenderInfo?.isPremium ?? false,
                    profileBadgeUrl: replyToSenderInfo?.profileBadgeUrl || null,
                };
            }
            const mentionRegex = /@([a-zA-Z0-9_]+)/g; let match; const mentions: { [uid: string]: boolean } = {}; const unreadMentionsUpdate: { [key: string]: boolean } = {};
            while ((match = mentionRegex.exec(text)) !== null) {
                const cacheEntry = handleCache[`@${match[1]}`];
                if (cacheEntry?.type === 'user') { mentions[cacheEntry.id] = true; if(cacheEntry.id !== currentUser.uid) unreadMentionsUpdate[`/chats/${chat.id}/unreadMentions/${cacheEntry.id}`] = true; }
            }
            if (Object.keys(mentions).length > 0) messageData.mentions = mentions;
            const newMessageRef = push(ref(db, `messages/${chat.id}`));
            const updates: { [key: string]: any } = {
                [`/messages/${chat.id}/${newMessageRef.key}`]: messageData,
                [`/chats/${chat.id}/lastMessage`]: text.substring(0, 100),
                [`/chats/${chat.id}/lastMessageTimestamp`]: serverTimestamp(),
                [`/chats/${chat.id}/lastMessageSenderId`]: currentUser.uid, ...unreadMentionsUpdate
            };
            Object.keys(chatDetails.participants).forEach(uid => { if (uid !== currentUser.uid) updates[`/chats/${chat.id}/unreadCounts/${uid}`] = (chatDetails.unreadCounts?.[uid] || 0) + 1; });
            await update(ref(db), updates);
            setNewMessage(''); 
            setReplyTo(null); 
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.overflowY = 'hidden';
            }
            setMentionQuery(null);
            setMentionTriggerPosition(null);
            playTickSound();
        } catch (error) {
            setSendError("Failed to send message. Please try again.");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSendSticker = async (url: string, packId: string) => {
        if (isSending) return;
        setIsSending(true);
        setSendError(null);
        try {
            const messageData = { senderId: currentUser.uid, stickerUrl: url, stickerPackId: packId, text: '', timestamp: serverTimestamp(), readBy: { [currentUser.uid]: Date.now() } };
            const newMessageRef = push(ref(db, `messages/${chat.id}`));
            const updates: { [key: string]: any } = {
                [`/messages/${chat.id}/${newMessageRef.key}`]: messageData,
                [`/chats/${chat.id}/lastMessage`]: 'Sticker',
                [`/chats/${chat.id}/lastMessageTimestamp`]: serverTimestamp(),
                [`/chats/${chat.id}/lastMessageSenderId`]: currentUser.uid
            };
            Object.keys(chatDetails.participants).forEach(uid => { if (uid !== currentUser.uid) updates[`/chats/${chat.id}/unreadCounts/${uid}`] = (chatDetails.unreadCounts?.[uid] || 0) + 1; });
            await update(ref(db), updates);
            setShowEmojiPicker(false);
        } catch (error) {
            setSendError("Failed to send sticker.");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendGif = async (url: string) => {
        if (isSending) return;
        setIsSending(true);
        setSendError(null);
        try {
            const messageData = { senderId: currentUser.uid, gifUrl: url, text: '', timestamp: serverTimestamp(), readBy: { [currentUser.uid]: Date.now() } };
            const newMessageRef = push(ref(db, `messages/${chat.id}`));
            const updates: { [key: string]: any } = {
                [`/messages/${chat.id}/${newMessageRef.key}`]: messageData,
                [`/chats/${chat.id}/lastMessage`]: '📷 GIF',
                [`/chats/${chat.id}/lastMessageTimestamp`]: serverTimestamp(),
                [`/chats/${chat.id}/lastMessageSenderId`]: currentUser.uid
            };
            Object.keys(chatDetails.participants).forEach(uid => { if (uid !== currentUser.uid) updates[`/chats/${chat.id}/unreadCounts/${uid}`] = (chatDetails.unreadCounts?.[uid] || 0) + 1; });
            await update(ref(db), updates);
            setShowEmojiPicker(false);
        } catch (error) {
            setSendError("Failed to send GIF.");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleImageFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (newFiles.length > 0) {
                setAttachments(currentAttachments => [...currentAttachments, ...newFiles]);
            }
        }
        if (e.target) {
          e.target.value = '';
        }
    };

    const handleSendImages = async () => {
        if (attachments.length === 0 || isSending) return;
    
        setIsSending(true);
        setSendError(null);
    
        try {
            const uploadPromises = attachments.map(file => uploadImage(file));
            const imageUrls = await Promise.all(uploadPromises);
    
            const messageData: Partial<Message> = {
                senderId: currentUser.uid,
                text: newMessage.trim(),
                imageUrls,
                timestamp: serverTimestamp() as any,
                readBy: { [currentUser.uid]: Date.now() }
            };
            if (replyTo) {
                const replyToSenderInfo = chatDetails.participantInfo[replyTo.senderId];
                messageData.replyTo = {
                    messageId: replyTo.id,
                    senderId: replyTo.senderId,
                    senderName: replyToSenderInfo?.displayName || 'Unknown',
                    text: replyTo.text || (replyTo.imageUrls?.length ? 'Photo' : (replyTo.stickerUrl ? 'Sticker' : (replyTo.gifUrl ? 'GIF' : '...'))),
                    isPremium: replyToSenderInfo?.isPremium ?? false,
                    profileBadgeUrl: replyToSenderInfo?.profileBadgeUrl || null,
                };
            }
    
            const newMessageRef = push(ref(db, `messages/${chat.id}`));
            const updates: { [key: string]: any } = {};
            updates[`/messages/${chat.id}/${newMessageRef.key}`] = messageData;
            updates[`/chats/${chat.id}/lastMessage`] = `📷 ${newMessage.trim() || 'Image'}`;
            updates[`/chats/${chat.id}/lastMessageTimestamp`] = serverTimestamp();
            updates[`/chats/${chat.id}/lastMessageSenderId`] = currentUser.uid;
    
            Object.keys(chatDetails.participants).forEach(uid => {
                if (uid !== currentUser.uid) {
                    const currentUnreadCount = chatDetails.unreadCounts?.[uid] || 0;
                    updates[`/chats/${chat.id}/unreadCounts/${uid}`] = currentUnreadCount + 1;
                }
            });
    
            await update(ref(db), updates);
    
            // Clear UI state ONLY on successful send
            setAttachments([]);
            setNewMessage('');
            setReplyTo(null);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.overflowY = 'hidden';
            }
            setMentionQuery(null);
            setMentionTriggerPosition(null);
    
        } catch (error) {
            console.error("Image send failed:", error);
            setSendError("Failed to send images. Please try again.");
            // On failure, attachments and message text are preserved for retry.
        } finally {
            setIsSending(false);
        }
    };

    const handlePrimaryAction = () => {
        if (isSending) return;
        if (attachments.length > 0) {
            handleSendImages();
        } else if (newMessage.trim()) {
            handleSendMessage();
        }
    };

    const handleDeleteMessages = async (messages: Message[], forEveryone: boolean) => {
        setMessagesToDelete(null);
        cancelSelection();
        const updates: { [key: string]: any } = {};

        for (const message of messages) {
            if (forEveryone) {
                updates[`/messages/${chat.id}/${message.id}`] = null;
                if (chatDetails.pinnedMessages?.[message.id]) {
                    updates[`/chats/${chat.id}/pinnedMessages/${message.id}`] = null;
                }
            } else {
                updates[`/messages/${chat.id}/${message.id}/deletedFor/${currentUser.uid}`] = true;
            }
        }
        await update(ref(db), updates);
    };

    const handleReaction = async (message: Message, emoji: string) => {
        const reactions = message.reactions || {};
        const updates: { [key: string]: any } = {};
        let userPreviousReaction: string | null = null;
    
        for (const existingEmoji in reactions) {
            if (reactions[existingEmoji] && reactions[existingEmoji][currentUser.uid]) {
                userPreviousReaction = existingEmoji;
                break;
            }
        }
    
        if (userPreviousReaction) {
            updates[`messages/${chat.id}/${message.id}/reactions/${userPreviousReaction}/${currentUser.uid}`] = null;
        }
    
        if (userPreviousReaction !== emoji) {
            updates[`messages/${chat.id}/${message.id}/reactions/${emoji}/${currentUser.uid}`] = true;
        }
    
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
        }
    
        setReactingToMessage(null);
        setActionSheetMessage(null);
    };
    
    const handlePinMessage = async (message: Message) => {
        const senderInfo = chatDetails.participantInfo[message.senderId];
        const senderName = senderInfo?.displayName || 'Unknown';
        const updates: { [key: string]: any } = {};
    
        updates[`/chats/${chat.id}/pinnedMessages/${message.id}`] = {
            text: message.text || (message.stickerUrl ? "Sticker" : (message.gifUrl ? "GIF" : "Image")),
            senderName: senderName,
            timestamp: message.timestamp,
            pinnedAt: serverTimestamp(),
            isPremium: senderInfo?.isPremium,
            profileBadgeUrl: senderInfo?.profileBadgeUrl,
        };
        
        const newMessageRef = push(ref(db, `messages/${chat.id}`));
        const systemMessageText = `${currentUser.displayName} pinned a message`;
        updates[`/messages/${chat.id}/${newMessageRef.key}`] = {
            senderId: 'system',
            text: systemMessageText,
            timestamp: serverTimestamp(),
            isSystemMessage: true,
            systemMessageType: 'message_pinned',
        };
    
        updates[`/chats/${chat.id}/lastMessage`] = systemMessageText;
        updates[`/chats/${chat.id}/lastMessageTimestamp`] = serverTimestamp();
        
        await update(ref(db), updates);
        setActionSheetMessage(null);
    };

    const handleUnpinMessage = async (messageId: string) => {
        const updates: { [key: string]: any } = {};
        updates[`/chats/${chat.id}/pinnedMessages/${messageId}`] = null;
    
        const newMessageRef = push(ref(db, `messages/${chat.id}`));
        const unpinnedMessageText = `${currentUser.displayName} unpinned a message`;
        updates[`/messages/${chat.id}/${newMessageRef.key}`] = {
            senderId: 'system',
            text: unpinnedMessageText,
            timestamp: serverTimestamp(),
            isSystemMessage: true,
            systemMessageType: 'message_unpinned',
        };
        updates[`/chats/${chat.id}/lastMessage`] = unpinnedMessageText;
        updates[`/chats/${chat.id}/lastMessageTimestamp`] = serverTimestamp();
    
        await update(ref(db), updates);
        setActionSheetMessage(null);
    };
    
    // OPTIMIZATION: Throttled scroll handler
    const handleScroll = () => {
        if (scrollThrottle.current) return;
        scrollThrottle.current = true;

        setTimeout(() => {
            const container = messageContainerRef.current;
            if (container) {
                if (container.scrollTop === 0 && hasMore && !isFetchingOlder) {
                    loadOlderMessages();
                }

                const { scrollTop, scrollHeight, clientHeight } = container;
                const isScrolledUp = scrollHeight - scrollTop - clientHeight > clientHeight / 2;

                let hasMentions = false;
                if (isScrolledUp) {
                    const containerRect = container.getBoundingClientRect();
                    hasMentions = unreadMentionIds.some(id => {
                        const el = document.getElementById(id);
                        if (!el) return false;
                        const messageIsRead = (allMessages.find(m => m.id === id)?.readBy?.[currentUser.uid] || 0) > 0;
                        return !messageIsRead && el.getBoundingClientRect().top > containerRect.bottom;
                    });
                }
                if (isScrolledUp !== scrollInfo.showArrow || hasMentions !== scrollInfo.hasUnreadMentionsBelow) {
                    setScrollInfo({ showArrow: isScrolledUp, hasUnreadMentionsBelow: hasMentions });
                }
            }
            scrollThrottle.current = false;
        }, SCROLL_THROTTLE_DELAY);
    };
    
    const handleMentionClick = () => {
        const container = messageContainerRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();

        const mentionElements = unreadMentionIds
            .map(id => document.getElementById(id))
            .filter((el): el is HTMLElement => {
                if (!el) return false;
                const messageIsRead = (allMessages.find(m => m.id === el.id)?.readBy?.[currentUser.uid] || 0) > 0;
                return !messageIsRead && el.getBoundingClientRect().top >= containerRect.bottom;
            })
            .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

        if (mentionElements.length > 0) {
            mentionElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    const handleScrollToBottomClick = () => {
        scrollToBottom();
    };

    const handleHighlightMessage = (messageId: string) => {
        const element = document.getElementById(messageId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessage(messageId);
        } else {
            // Future improvement: if message not loaded, fetch it.
            onTriggerToast("Message not loaded. Scroll up to find it.");
        }
    };

    const handleMediaClick = (clickedMessage: Message, imageIndex: number = 0) => {
        if (selectionMode) {
            handleMessageClick(clickedMessage);
            return;
        }
        const mediaMessages = allMessages.filter(m => m.imageUrls && m.imageUrls.length > 0);
        
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


    const renderMessageText = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@') && handleCache[part]) {
                const info = handleCache[part];
                const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (info.type === 'user') {
                        if (info.id === currentUser.uid) {
                            onNavigate('edit_profile');
                        } else {
                            onNavigate('user_profile', { userId: info.id });
                        }
                    }
                };

                let showPhotoInMention = true;
                if (info.type === 'user' && info.id !== currentUser.uid) {
                    const mentionedUserForPrivacy: User | null = {
                        uid: info.id,
                        privacySettings: info.privacySettings
                    } as User;
                    // Assume not a contact inside a group chat mention for safety.
                    showPhotoInMention = canSeeInfo('profilePhoto', mentionedUserForPrivacy, false);
                }

                return (
                    <span key={index} onClick={handleClick} className="inline-flex items-center align-middle bg-black/30 dark:bg-black/50 rounded-full px-2 py-0.5 mx-0.5 cursor-pointer hover:bg-black/50 dark:hover:bg-black/70 backdrop-blur-sm">
                        <span className="mr-1.5 -ml-1"><Avatar photoURL={showPhotoInMention ? info.photoURL : null} name={info.name} sizeClass="w-5 h-5" textClass="text-xs" /></span>
                        <NameWithBadges
                            name={info.name}
                            isPremium={info.isPremium}
                            profileBadgeUrl={info.profileBadgeUrl}
                            textClass="font-semibold text-[var(--theme-color-primary)]"
                            badgeSizeClass="w-3 h-3"
                        />
                    </span>
                );
            }
            return part.split(/(\n)/g).map((line, i) => {
                if (line === '\n') return <br key={`${index}-${i}`}/>;
                return <LinkifyText key={`${index}-${i}`} text={line} onTriggerToast={onTriggerToast} />;
            });
        });
    };
    
    // --- Selection Mode Logic ---
    const cancelSelection = () => {
        setSelectionMode(false);
        setSelectedMessages(new Set());
    };
    
    const handleLongPress = (e: React.MouseEvent, message: Message) => {
        e.preventDefault();
        setSelectionMode(true);
        setSelectedMessages(new Set([message.id]));
    };

    const handleMessageClick = (message: Message) => {
        if (selectionMode) {
            const newSelection = new Set(selectedMessages);
            if (newSelection.has(message.id)) {
                newSelection.delete(message.id);
            } else {
                newSelection.add(message.id);
            }
    
            if (newSelection.size === 0) {
                setSelectionMode(false);
            }
            setSelectedMessages(newSelection);
        } else {
            setActionSheetMessage(message);
        }
    };
    
    const handleReplySelected = () => {
        if (selectedMessages.size !== 1) return;
        const messageId = selectedMessages.values().next().value;
        const messageToReply = allMessages.find(m => m.id === messageId);
        if (messageToReply) {
            setReplyTo(messageToReply);
            textareaRef.current?.focus();
        }
        cancelSelection();
    };

    const handleForwardSelected = () => {
        const messagesToForward = allMessages
            .filter(m => selectedMessages.has(m.id))
            .sort((a, b) => a.timestamp - b.timestamp);
        if (messagesToForward.length > 0) {
            onNavigate('forwarding', { messages: messagesToForward });
            cancelSelection();
        }
    };
    
    const handleCopySelected = () => {
        if (selectedMessages.size !== 1) return;
        const messageId = selectedMessages.values().next().value;
        const messageToCopy = allMessages.find(m => m.id === messageId);
        if (messageToCopy?.text) {
            navigator.clipboard.writeText(messageToCopy.text);
            onTriggerToast('Text copied');
        }
        cancelSelection();
    };
    
    const handlePinSelected = () => {
        if (selectedMessages.size !== 1) return;
        const messageId = selectedMessages.values().next().value;
        const messageToPin = allMessages.find(m => m.id === messageId);
        if (messageToPin) {
            handlePinMessage(messageToPin);
        }
        cancelSelection();
    };

    const handleDeleteSelected = () => {
        const toDelete = allMessages.filter(m => selectedMessages.has(m.id));
        if (toDelete.length > 0) {
            setMessagesToDelete(toDelete);
        }
    };

    // --- Mention Logic ---
    const participantsForMention = useMemo(() => {
        return Object.entries(chatDetails.participantInfo || {})
        .map(([uid, info]) => ({
            uid,
            displayName: (info as any).displayName,
            handle: (info as any).handle,
            photoURL: (info as any).photoURL,
        } as User));
    }, [chatDetails.participantInfo]);

    useEffect(() => {
        if (mentionQuery === null) {
            setMentionResults([]);
            return;
        }
    
        const lowerCaseQuery = mentionQuery.toLowerCase();
        const filtered = participantsForMention.filter(p =>
            p.uid !== currentUser.uid && (
            p.displayName?.toLowerCase().includes(lowerCaseQuery) ||
            p.handle?.toLowerCase().includes(lowerCaseQuery)
        ));
    
        setMentionResults(filtered);
    }, [mentionQuery, participantsForMention, currentUser.uid]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
    
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastAtMatch = textBeforeCursor.match(/@(\w*)$/);
    
        if (lastAtMatch && lastAtMatch.index !== undefined) {
            const query = lastAtMatch[1];
            const triggerStart = lastAtMatch.index;
            setMentionQuery(query);
            setMentionTriggerPosition({ start: triggerStart, end: cursorPos });
        } else {
            setMentionQuery(null);
            setMentionTriggerPosition(null);
        }
    
        setNewMessage(text);
    };

    const handleMentionSelect = (handle: string) => {
        if (!mentionTriggerPosition) return;
    
        const textBefore = newMessage.substring(0, mentionTriggerPosition.start);
        const textAfter = newMessage.substring(mentionTriggerPosition.end);
        
        const newText = `${textBefore}@${handle} ${textAfter}`;
        setNewMessage(newText);
    
        setMentionQuery(null);
        setMentionResults([]);
        setMentionTriggerPosition(null);
    
        setTimeout(() => {
            if(textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = `${textBefore}@${handle} `.length;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleJoin = async () => {
        if (isMember || isSending) return;
        setIsSending(true);
    
        try {
            const updates: { [key: string]: any } = {};
            updates[`/chats/${chat.id}/participants/${currentUser.uid}`] = true;
            updates[`/chats/${chat.id}/participantInfo/${currentUser.uid}`] = {
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || null,
                handle: currentUser.handle || '',
                joinedAt: serverTimestamp()
            };
            updates[`/user-chats/${currentUser.uid}/${chat.id}`] = true;
            
            await update(ref(db), updates);
        } catch (error) {
            console.error("Failed to join chat:", error);
            setSendError("Failed to join. Please try again.");
        } finally {
            setIsSending(false);
        }
    };


    const renderMessageContent = (message: Message, options: { isSelectionMode?: boolean } = {}) => {
        let isSentByMe = message.senderId === currentUser.uid;
        // Channel Logic: Force all messages to be left-aligned
        if (isChannel) {
            isSentByMe = false;
        }
        
        const senderInfo = (isChannel && !chat.signMessages)
            ? { displayName: chat.name, photoURL: chat.photoURL } // Use channel info
            : chatDetails.participantInfo[message.senderId]; // Use sender info
            
        let isReadByAll = false;
        if (message.senderId === currentUser.uid) { // Check real sender for read status
            if (chat.type === ChatType.Private) {
                const otherUserId = Object.keys(chat.participants).find(p => p !== currentUser.uid);
                isReadByAll = otherUserId ? (chatDetails.unreadCounts?.[otherUserId] || 0) === 0 : false;
            } else if (chat.type === ChatType.Group) {
                const otherParticipantIds = Object.keys(chat.participants).filter(p => p !== currentUser.uid);
                if (otherParticipantIds.length > 0) {
                    isReadByAll = otherParticipantIds.every(uid => (chatDetails.unreadCounts?.[uid] || 0) === 0);
                } else {
                    isReadByAll = true; 
                }
            }
        }
        
        const renderReactions = (message: Message) => {
            if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
            
            const reactionButtons = Object.entries(message.reactions).map(([emoji, users]) => {
                if (!users) return null;
                const userIds = Object.keys(users);
                if (userIds.length === 0) return null;
                const userHasReacted = userIds.includes(currentUser.uid);
                return (
                    <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleReaction(message, emoji); }}
                        className={`px-2.5 py-1 rounded-xl text-sm flex items-center space-x-1.5 backdrop-blur-sm transition-colors ${userHasReacted ? 'bg-blue-500/40' : 'bg-black/20 hover:bg-black/40'}`}
                    >
                        <span>{emoji}</span>
                        <span className="font-semibold text-white/90">{userIds.length}</span>
                    </button>
                )
            });

            return (
                <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isSentByMe ? 'justify-end' : ''}`}>
                    {reactionButtons}
                </div>
            );
        };
        
        if (message.isSystemMessage) {
            return (
                <div key={message.id} className="flex justify-center my-2">
                    <span className="bg-gray-200/80 dark:bg-black/50 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                        {message.text}
                    </span>
                </div>
            );
        }

        if (message.gifUrl) {
            return (
                <div key={message.id} id={message.id} className={`w-full flex items-end gap-2.5 my-2 ${isSentByMe ? 'justify-end' : ''} ${highlightedMessage === message.id ? 'highlight-message' : ''}`}>
                    {!isSentByMe && <Avatar photoURL={senderInfo?.photoURL} name={senderInfo?.displayName} sizeClass="w-8 h-8"/>}
                    <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}>
                        <div className="relative">
                            <div className="block w-48 h-48">
                                <img src={message.gifUrl} alt="GIF" className="w-full h-full object-cover rounded-lg" />
                            </div>
                            <div className="absolute bottom-1 right-1.5 bg-black/50 rounded-lg px-1.5 py-0.5 backdrop-blur-sm">
                                <MessageMeta timestamp={message.timestamp} isSentByMe={message.senderId === currentUser.uid} isReadByAll={isReadByAll} />
                            </div>
                        </div>
                        {renderReactions(message)}
                    </div>
                </div>
            );
        }

        if (message.stickerUrl) {
            return (
                <div key={message.id} id={message.id} className={`w-full flex items-end gap-2.5 my-2 ${isSentByMe ? 'justify-end' : ''} ${highlightedMessage === message.id ? 'highlight-message' : ''}`}>
                    {!isSentByMe && <Avatar photoURL={senderInfo?.photoURL} name={senderInfo?.displayName} sizeClass="w-8 h-8"/>}
                    <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}>
                        <button onClick={(e) => { e.stopPropagation(); if (!selectionMode) setViewingStickerPackId(message.stickerPackId || null) }}>
                            <img src={message.stickerUrl} alt="sticker" className="w-36 h-36 object-contain" />
                        </button>
                        {renderReactions(message)}
                    </div>
                </div>
            );
        }

        const emojiData = getEmojiOnlyData(message.text);
        if (emojiData.isEmojiOnly && emojiData.count <= 3 && !message.replyTo) {
             return (
                <div key={message.id} id={message.id} className={`w-full flex items-end gap-2.5 my-1 ${isSentByMe ? 'justify-end' : ''}`}>
                     {!isSentByMe && <Avatar photoURL={senderInfo?.photoURL} name={senderInfo?.displayName} sizeClass="w-8 h-8"/>}
                    <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-6xl">{message.text}</span>
                        {renderReactions(message)}
                    </div>
                </div>
            );
        }

        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/;
        const urlMatch = message.text.match(urlRegex);
        const potentialVideoUrl = urlMatch ? getYoutubeEmbedUrl(urlMatch[0]) : null;

        return (
            <div key={message.id} id={message.id} className={`w-full flex items-start gap-2.5 my-1 ${isSentByMe ? 'justify-end' : ''}`}>
                {!isSentByMe && <Avatar photoURL={senderInfo?.photoURL} name={senderInfo?.displayName} sizeClass="w-8 h-8"/>}
                <div className={`flex flex-col max-w-xs md:max-w-md ${isSentByMe ? 'items-end' : 'items-start'}`}>
                    <div 
                        className={`relative rounded-xl overflow-hidden ${highlightedMessage === message.id ? 'highlight-message' : ''} ${
                            isSentByMe 
                            ? 'bg-[var(--theme-color-bubble-user-bg)] text-[var(--theme-color-bubble-user-text)] rounded-br-sm' 
                            : 'bg-[var(--theme-color-bubble-other-bg)] text-[var(--theme-color-bubble-other-text)] rounded-bl-sm'
                        }`}
                    >
                        <div className="px-3.5 py-2 min-w-[120px]">
                            {message.replyTo && (() => {
                                const originalMessage = allMessages.find(m => m.id === message.replyTo.messageId);
                                if (!originalMessage) {
                                    return (
                                        <div className="bg-black/10 dark:bg-black/30 backdrop-blur-sm p-2 rounded-lg flex gap-2 border-l-2 border-gray-400 dark:border-gray-600 mb-1">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-500 dark:text-gray-400">{message.replyTo.senderName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Original message was deleted</p>
                                            </div>
                                        </div>
                                    );
                                }

                                let replyText = message.replyTo.text;
                                let replyMediaUrl: string | undefined;
                                let replyMediaType: 'sticker' | 'photo' | 'gif' | undefined;

                                if (originalMessage.stickerUrl) {
                                    replyText = 'Sticker';
                                    replyMediaUrl = originalMessage.stickerUrl;
                                    replyMediaType = 'sticker';
                                } else if (originalMessage.imageUrls?.[0]) {
                                    replyText = originalMessage.text || 'Photo';
                                    replyMediaUrl = originalMessage.imageUrls[0];
                                    replyMediaType = 'photo';
                                } else if (originalMessage.gifUrl) {
                                    replyText = 'GIF';
                                    replyMediaUrl = originalMessage.gifUrl;
                                    replyMediaType = 'gif';
                                }

                                if (replyText && !replyMediaUrl) {
                                    if (replyText.length > 30) {
                                        replyText = replyText.substring(0, 30) + '...';
                                    }
                                }

                                return (
                                    <div 
                                        className="bg-black/5 dark:bg-black/20 backdrop-blur-sm p-2 rounded-lg flex gap-2 border-l-2 border-[var(--theme-color-primary)] cursor-pointer mb-1"
                                        onClick={(e) => { e.stopPropagation(); handleHighlightMessage(message.replyTo.messageId); }}
                                    >
                                        {replyMediaUrl && (
                                            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/20 flex items-center justify-center">
                                                <img 
                                                    src={replyMediaUrl} 
                                                    alt="reply preview" 
                                                    className={`w-full h-full ${replyMediaType === 'sticker' ? 'object-contain' : 'object-cover'}`} 
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <NameWithBadges
                                                name={message.replyTo.senderName}
                                                isPremium={message.replyTo.isPremium}
                                                profileBadgeUrl={message.replyTo.profileBadgeUrl}
                                                textClass="font-bold text-sm text-[var(--theme-color-primary)]"
                                            />
                                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{replyText}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            {message.forwardedFrom && message.forwardedFrom.senderName && (
                                <div className={`flex items-center space-x-2 mb-2 ${message.forwardedFrom.senderId ? 'cursor-pointer group' : 'cursor-default'}`} onClick={(e) => {
                                    if(message.forwardedFrom.senderId) {
                                        e.stopPropagation();
                                        onNavigate('user_profile', { userId: message.forwardedFrom.senderId });
                                    }
                                }}>
                                    <Avatar photoURL={message.forwardedFrom.photoURL} name={message.forwardedFrom.senderName} sizeClass="w-8 h-8" />
                                    <div>
                                        <p className={`font-semibold text-sm opacity-80 ${isSentByMe ? 'text-inherit' : 'text-blue-500 dark:text-blue-300'}`}>Forwarded from</p>
                                        <NameWithBadges
                                            name={message.forwardedFrom.senderName}
                                            isPremium={message.forwardedFrom.isPremium}
                                            profileBadgeUrl={message.forwardedFrom.profileBadgeUrl}
                                            textClass={`font-bold text-sm text-inherit ${message.forwardedFrom.senderId ? 'group-hover:underline' : ''}`}
                                        />
                                    </div>
                                </div>
                            )}
                            {!isSentByMe && (chat.type === ChatType.Group || (isChannel && chat.signMessages)) && 
                                <NameWithBadges
                                    name={senderInfo?.displayName}
                                    isPremium={senderInfo?.isPremium}
                                    profileBadgeUrl={senderInfo?.profileBadgeUrl}
                                    textClass="text-sm font-semibold text-blue-500 dark:text-blue-300"
                                    containerClass="flex items-center gap-1 mb-1"
                                />
                            }
                            
                            <div className="whitespace-pre-wrap break-all pb-4">
                                {renderMessageText(message.text)}
                            </div>
                            <div className="absolute bottom-1.5 right-2.5">
                                <MessageMeta timestamp={message.timestamp} isEdited={message.isEdited} isSentByMe={message.senderId === currentUser.uid} isReadByAll={isReadByAll} />
                            </div>
                        </div>

                        {potentialVideoUrl && (
                            <div className="block"><VideoPreview url={potentialVideoUrl} /></div>
                        )}
                    </div>
                    {renderReactions(message)}
                </div>
            </div>
        );
    };

    const groupedMessages = useMemo(() => {
        if (!allMessages || allMessages.length === 0) return [];
        
        type GroupedItem = 
            | { type: 'single', message: Message } 
            | { type: 'image-group', id: string, senderId: string, messages: Message[] }
            | { type: 'date-separator', id: string, date: Date };

        const groups: GroupedItem[] = [];
        let currentImageGroup: { type: 'image-group', id: string, senderId: string, messages: Message[] } | null = null;
        let lastDate: Date | null = null;
    
        for (let i = 0; i < allMessages.length; i++) {
            const message = allMessages[i];
            const messageDate = new Date(message.timestamp);
    
            // Check if we need a date separator
            if (!lastDate || messageDate.toDateString() !== lastDate.toDateString()) {
                if (currentImageGroup) {
                    groups.push(currentImageGroup);
                    currentImageGroup = null;
                }
                groups.push({
                    type: 'date-separator',
                    id: `date-${message.timestamp}`,
                    date: messageDate,
                });
            }
            lastDate = messageDate;
    
            const isImageMessage = message.imageUrls && message.imageUrls.length > 0;
            
            if (isImageMessage) {
                if (currentImageGroup && message.senderId === currentImageGroup.senderId) {
                    currentImageGroup.messages.push(message);
                } else {
                    if (currentImageGroup) {
                        groups.push(currentImageGroup);
                    }
                    currentImageGroup = {
                        type: 'image-group',
                        id: message.id,
                        senderId: message.senderId,
                        messages: [message],
                    };
                }
            } else {
                if (currentImageGroup) {
                    groups.push(currentImageGroup);
                    currentImageGroup = null;
                }
                groups.push({ type: 'single', message });
            }
        }
    
        if (currentImageGroup) {
            groups.push(currentImageGroup);
        }
        
        return groups;
    }, [allMessages]);

    const chatInfo = useMemo(() => getChatDisplayInfo(chatDetails, currentUser.uid), [chatDetails, currentUser.uid]);

    // --- Selection Mode Derived State ---
    const selectedCount = selectedMessages.size;
    const isSingleSelection = selectedCount === 1;
    const singleSelectedId = isSingleSelection ? selectedMessages.values().next().value : null;
    const singleSelectedMessage = useMemo(() => isSingleSelection ? allMessages.find(m => m.id === singleSelectedId) : null, [isSingleSelection, allMessages, singleSelectedId]);
    const canCopy = isSingleSelection && singleSelectedMessage && !!singleSelectedMessage.text;

    const showPhoto = chat.type === ChatType.Private ? canSeeInfo('profilePhoto', otherUser, true) : true;
    const showOnlineStatus = chat.type === ChatType.Private ? canSeeInfo('lastSeen', otherUser, true) : true;

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-[#1e1e1e] text-black dark:text-white relative">
            <style>{`
                .highlight-message { 
                    animation: highlight-anim 1.5s ease-out;
                }
                @keyframes highlight-anim {
                    0%, 20% {
                        box-shadow: inset 0 0 0 1000px rgba(52, 144, 220, 0.3);
                    }
                    100% {
                        box-shadow: inset 0 0 0 1000px rgba(52, 144, 220, 0);
                    }
                }
                @keyframes slide-in-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-in-down { animation: slide-in-down 0.5s ease-out forwards; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageFilesSelected} multiple disabled={isSending} />
            
             {selectionMode ? (
                 <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 sticky top-0 z-20 bg-gray-100 dark:bg-[#2f2f2f]">
                    <button onClick={cancelSelection} className="p-2 -ml-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><BackIcon /></button>
                    <h1 className="text-xl font-bold mx-4">{selectedCount}</h1>
                    <div className="flex-grow"></div>
                    <div className="flex items-center space-x-2">
                        {isSingleSelection && <button onClick={handleReplySelected} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><ReplyIcon/></button>}
                        {canCopy && <button onClick={handleCopySelected} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CopyIcon/></button>}
                        {isSingleSelection && isPrivileged && <button onClick={handlePinSelected} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><PinIcon/></button>}
                        <button onClick={handleForwardSelected} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><ForwardIcon/></button>
                        <button onClick={handleDeleteSelected} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><DeleteIcon/></button>
                    </div>
                </header>
            ) : isSearchVisible ? (
                <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 sticky top-0 z-20 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm">
                    <button onClick={() => setIsSearchVisible(false)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                    <input 
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="flex-1 mx-2 bg-transparent focus:outline-none"
                    />
              </header>
            ) : (
                <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 sticky top-0 z-20 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm">
                    <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                    <div className="flex items-center space-x-3 mx-2 flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(chat.type === ChatType.Private ? 'user_profile' : 'group_info', { userId: otherUser?.uid, chat: chatDetails })}>
                        <Avatar photoURL={showPhoto ? chatInfo.photoURL : null} name={chatInfo.name} sizeClass="w-10 h-10"/>
                        <div className="min-w-0">
                            {chat.type === ChatType.Private && otherUser ? (
                                <NameWithBadges 
                                    name={chatInfo.name} 
                                    isPremium={otherUser.isPremium} 
                                    profileBadgeUrl={otherUser.profileBadgeUrl}
                                    textClass="font-bold truncate text-black dark:text-white"
                                    badgeSizeClass="w-5 h-5"
                                />
                            ) : (
                                <p className="font-bold truncate text-black dark:text-white">{chatInfo.name}</p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {chat.type === ChatType.Private ? 
                                    (showOnlineStatus ? (otherUser?.isOnline ? <span className="text-blue-500 dark:text-blue-400">online</span> : 'last seen recently') : 'last seen a long time ago') 
                                    : chatInfo.onlineStatus
                                }
                            </p>
                        </div>
                    </div>
                    {chat.type === ChatType.Private && <button className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CallIcon /></button>}
                    <div className="relative">
                        <button onClick={() => setIsHeaderMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><MoreVertIcon /></button>
                        {isHeaderMenuOpen && (
                            <div ref={menuRef} className="absolute top-12 right-0 bg-gray-100 dark:bg-[#2f2f2f] rounded-lg shadow-xl z-20 w-56 py-1">
                                {isGroupOrChannel ? (
                                    <>
                                        <MenuItem icon={<SearchIcon />} label="Search" onClick={() => { setIsSearchVisible(true); setIsHeaderMenuOpen(false); }} />
                                        <MenuItem icon={isMuted ? <UnmuteIcon/> : <MuteIcon />} label={isMuted ? 'Unmute' : 'Mute'} onClick={() => { handleToggleMute(); setIsHeaderMenuOpen(false); }} />
                                        <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-2"></div>
                                        {isPrivileged ? (
                                            <MenuItem icon={<ClearHistoryIcon />} label="Clear History" onClick={() => { handleClearHistory(); setIsHeaderMenuOpen(false); }} />
                                        ) : (
                                            <MenuItem icon={<LeaveIcon />} label={`Leave ${isChannel ? 'Channel' : 'Group'}`} onClick={() => { handleDeleteChat(); setIsHeaderMenuOpen(false); }} isDestructive />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <MenuItem icon={<SearchIcon />} label="Search" onClick={() => { setIsSearchVisible(true); setIsHeaderMenuOpen(false); }} />
                                        <MenuItem icon={isMuted ? <UnmuteIcon/> : <MuteIcon/>} label={isMuted ? 'Unmute' : 'Mute'} onClick={() => { handleToggleMute(); setIsHeaderMenuOpen(false); }} />
                                        <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-2"></div>
                                        <MenuItem icon={<ClearHistoryIcon />} label="Clear History" onClick={() => { handleClearHistory(); setIsHeaderMenuOpen(false); }} />
                                        <MenuItem icon={<BlockIcon />} label={isBlocked ? 'Unblock User' : 'Block User'} onClick={() => { handleToggleBlock(); setIsHeaderMenuOpen(false); }} isDestructive={!isBlocked} />
                                        <MenuItem icon={<DeleteIcon />} label="Delete Chat" onClick={() => { handleDeleteChat(); setIsHeaderMenuOpen(false); }} isDestructive />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </header>
            )}
            
            <PinnedMessageBar
                chat={chatDetails}
                onPinClick={handleHighlightMessage}
                onUnpin={handleUnpinMessage}
            />

            <div ref={messageContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-1">
                 { (!isMember && !chat.chatHistoryVisibleForNewMembers) ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <p className="text-gray-500 dark:text-gray-400">Join this {chat.type} to view the message history.</p>
                    </div>
                ) : (
                    <>
                        {isFetchingOlder && (
                            <div className="flex justify-center p-2">
                                <div className="w-6 h-6 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        {loading ? <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div></div> : groupedMessages.map(group => {
                            if (group.type === 'date-separator') {
                                return (
                                    <div key={group.id} className="flex justify-center my-2">
                                        <span className="bg-gray-200/80 dark:bg-black/50 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                                            {formatDateSeparator(group.date)}
                                        </span>
                                    </div>
                                );
                            }
                            const messageForSelection = group.type === 'single' ? group.message : group.messages[0];
                            const isSelected = selectedMessages.has(messageForSelection.id);
                            return (
                                <div 
                                key={messageForSelection.id}
                                onClick={() => handleMessageClick(messageForSelection)}
                                onContextMenu={(e) => handleLongPress(e, messageForSelection)}
                                className={`relative rounded-lg ${isSelected ? 'bg-blue-200/50 dark:bg-blue-900/40' : ''}`}
                                >
                                    {selectionMode && (
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-400' : 'bg-gray-500/50 dark:bg-gray-800/50 border-gray-400 dark:border-gray-500'}`}>
                                                {isSelected && <CheckIcon className="w-4 h-4 text-white"/>}
                                            </div>
                                        </div>
                                    )}
                                    <div className={selectionMode ? 'pl-10' : ''}>
                                    {group.type === 'single' ? (
                                        renderMessageContent(group.message)
                                    ) : (
                                        <GroupedImageMessage 
                                            key={group.id} 
                                            group={group}
                                            isSentByMe={group.senderId === currentUser.uid}
                                            senderInfo={chatDetails.participantInfo[group.senderId]}
                                            onMediaClick={handleMediaClick}
                                            onClick={() => {}} // Click is handled by parent
                                            chatDetails={chatDetails}
                                            currentUser={currentUser}
                                            onTriggerToast={onTriggerToast}
                                        />
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>
            
            {scrollInfo.hasUnreadMentionsBelow && (
                <button onClick={handleMentionClick} className="absolute bottom-24 left-4 z-10 bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg font-bold text-lg hover:bg-blue-600 transition-colors">
                    @
                </button>
            )}
            {scrollInfo.showArrow && (
                 <button onClick={handleScrollToBottomClick} className="absolute bottom-24 right-4 bg-gray-300/80 dark:bg-[#2f2f2f]/80 backdrop-blur-sm text-gray-800 dark:text-gray-200 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors">
                    <ChevronDownIcon />
                </button>
            )}

            { (chat.type === ChatType.Group || chat.type === ChatType.Channel) && !isMember ? (
                 <footer className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 z-10 bg-white dark:bg-[#1e1e1e] text-center">
                    <button onClick={handleJoin} disabled={isSending} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-lg disabled:bg-gray-500">
                        {isSending ? 'Joining...' : `Join ${chat.type === ChatType.Channel ? 'Channel' : 'Group'}`}
                    </button>
                </footer>
            ) : isBlocked || amIBlocked ? (
                <footer className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 z-10 bg-white dark:bg-[#1e1e1e] text-center">
                    {isBlocked ? (
                        <>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">You blocked this user.</p>
                            <button onClick={handleToggleBlock} className="font-semibold text-blue-500 dark:text-blue-400">Unblock</button>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">You are blocked</p>
                    )}
                </footer>
            ) : selectionMode ? (
                 <footer className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between bg-white dark:bg-[#1e1e1e] flex-shrink-0 z-10">
                     <button onClick={handleForwardSelected} className="flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10">
                        <ForwardIcon />
                        <span>Forward</span>
                    </button>
                 </footer>
            ) : ((!isChannel || isPrivilegedInChannel) && (
                <footer className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0 z-10 relative bg-white dark:bg-[#1e1e1e]">
                    {mentionQuery !== null && mentionResults.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 p-2">
                            <div className="bg-white dark:bg-[#2f2f2f] rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                                {mentionResults.map(user => (
                                    <button
                                        key={user.uid}
                                        onMouseDown={(e) => e.preventDefault()} // Prevent textarea blur
                                        onClick={() => handleMentionSelect(user.handle || '')}
                                        className="w-full flex items-center p-2 hover:bg-black/5 dark:hover:bg-white/10 text-left"
                                    >
                                        <Avatar photoURL={user.photoURL} name={user.displayName} sizeClass="w-8 h-8 mr-3" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-black dark:text-white truncate">{user.displayName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {sendError && <div className="p-2 bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 text-sm text-center">{sendError}</div>}
                    <AttachmentPreviewBar 
                        files={attachments}
                        onRemove={(index) => setAttachments(p => p.filter((_, i) => i !== index))}
                        onAddMore={() => fileInputRef.current?.click()}
                    />
                    <ReplyPreview 
                        replyTo={replyTo}
                        participantInfo={chatDetails.participantInfo}
                        onCancel={() => setReplyTo(null)}
                    />

                    <div className="p-2 flex items-end space-x-2">
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 mb-1" disabled={isSending || !canSendStickersAndGifs}><StickerIcon /></button>
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={handleInputChange}
                            placeholder={isBlocked ? "You blocked this user" : amIBlocked ? "You are blocked" : !canSendMessages ? "Sending messages is not allowed" : "Message"}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#2f2f2f] rounded-2xl text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)] resize-none max-h-40 overflow-y-auto disabled:bg-gray-200 dark:disabled:bg-gray-800"
                            rows={1}
                            style={{ height: 'auto' }}
                            onInput={(e) => {
                                const target = e.currentTarget;
                                target.style.height = 'auto';
                                // Limit to 6 lines of text
                                const maxHeight = 6 * 24; // Assuming line height of 24px
                                if (target.scrollHeight > maxHeight) {
                                    target.style.height = `${maxHeight}px`;
                                    target.style.overflowY = 'auto';
                                } else {
                                    target.style.height = `${target.scrollHeight}px`;
                                    target.style.overflowY = 'hidden';
                                }
                            }}
                            disabled={isSending || isBlocked || amIBlocked || !canSendMessages}
                        />
                        {(newMessage || attachments.length > 0) ? <button onClick={handlePrimaryAction} disabled={isSending || isBlocked || amIBlocked} className="bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] w-10 h-10 rounded-full flex items-center justify-center mb-1 disabled:bg-gray-400 dark:disabled:bg-gray-600"><div className={isSending ? 'w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin' : ''}>{!isSending && <SendIcon />}</div></button> : <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 mb-1" disabled={isSending || !canSendMedia}><AttachFileIcon /></button>}
                    </div>
                </footer>
            ))}

            {viewingMedia && <FullscreenMediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} onForward={(msg) => onNavigate('forwarding', { messages: [msg] })} onReply={(msg) => { setReplyTo(msg); setViewingMedia(null); }} currentUser={currentUser} chat={chatDetails} onGoToMessage={(chat, messageId) => { onSelectChat(chat, messageId); setViewingMedia(null); }} />}
            {viewingStickerPackId && <StickerPackDetailScreen isBottomSheet={true} packId={viewingStickerPackId} currentUser={currentUser} onBack={() => setViewingStickerPackId(null)} />}

            {showEmojiPicker && <EmojiPicker currentUser={currentUser} onClose={() => setShowEmojiPicker(false)} onSelectEmoji={emoji => setNewMessage(msg => msg + emoji)} onSelectSticker={handleSendSticker} onSelectGif={handleSendGif} onNavigate={onNavigate} />}
            
            {actionSheetMessage && (
                 <MessageActionSheet
                    message={actionSheetMessage}
                    currentUser={currentUser}
                    chat={chat}
                    onDismiss={() => setActionSheetMessage(null)}
                    onReply={() => { setReplyTo(actionSheetMessage); setActionSheetMessage(null); textareaRef.current?.focus(); }}
                    onCopy={() => { navigator.clipboard.writeText(actionSheetMessage.text); onTriggerToast('Text copied'); setActionSheetMessage(null); }}
                    onForward={() => { onNavigate('forwarding', { messages: [actionSheetMessage] }); setActionSheetMessage(null); }}
                    onPin={() => handlePinMessage(actionSheetMessage)}
                    onUnpin={() => handleUnpinMessage(actionSheetMessage.id)}
                    isPinned={!!chatDetails.pinnedMessages?.[actionSheetMessage.id]}
                    onEdit={() => { setEditingMessage(actionSheetMessage); setNewMessage(actionSheetMessage.text); setActionSheetMessage(null); textareaRef.current?.focus(); }}
                    onDelete={() => { setMessagesToDelete([actionSheetMessage]); setActionSheetMessage(null); }}
                    onReact={(emoji) => handleReaction(actionSheetMessage, emoji)}
                    onOpenEmojiPicker={() => { setReactingToMessage(actionSheetMessage); setShowEmojiPicker(true); setActionSheetMessage(null); }}
                />
            )}
            
            {reactingToMessage && showEmojiPicker && (
                <EmojiPicker 
                    currentUser={currentUser} 
                    onClose={() => { setShowEmojiPicker(false); setReactingToMessage(null); }}
                    onSelectEmoji={emoji => handleReaction(reactingToMessage, emoji)}
                    onSelectSticker={() => {}} // Not applicable for reactions
                    onSelectGif={() => {}} // Not applicable for reactions
                    onNavigate={onNavigate}
                />
            )}
            
            {messagesToDelete && <DeleteConfirmationModal messages={messagesToDelete} currentUser={currentUser} chat={chat} onDismiss={() => setMessagesToDelete(null)} onDelete={handleDeleteMessages} />}
        </div>
    );
};

export default ChatScreen;