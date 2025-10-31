// FIX: Add missing useRef import from React.
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
// FIX: Add missing Firebase methods for pagination.
import { ref, get, set, query, orderByChild, startAt, endAt, update, onValue, off, remove, serverTimestamp, limitToFirst, orderByKey, limitToLast, endBefore, equalTo } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { AppSettings, User, Chat, Message, CustomElement, ElementStyle, ThemeColors, ThemedAsset, ThemedCustomElement, SupportChat, PremiumScreenSettings, PaymentSettings, PaymentDetailField, PremiumPlan, PaymentRequest } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';
import HelpChatScreen from './HelpChatScreen';
import PremiumSettingsEditor from './PremiumSettingsEditor';

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChannelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.514C18.358 1.88 18.668 1.5 19 1.5v12.428c0 .538-.214 1.055-.595 1.436l-1.49 1.49a2.37 2.37 0 01-3.352 0l-2.828-2.828a2.37 2.37 0 00-3.352 0M10 5.25a2.25 2.25 0 00-4.5 0v2.25a2.25 2.25 0 004.5 0v-2.25z" /></svg>;
const ActiveUserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PremiumIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
const PaymentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;

// FIX: Added default settings objects to resolve reference errors.
const defaultPremiumScreenSettings: PremiumScreenSettings = {
    headerImage: {
        url: '',
        width: 128,
        height: 128,
        marginTop: 32,
        marginBottom: 32,
    },
    starIcon: 'premium',
    header: 'App Premium',
    subHeader: 'Go beyond the limits and unlock dozens of exclusive features by subscribing to App Premium.',
    plans: [
        {
            id: 'annual',
            name: 'Annual',
            priceCurrency: '₹',
            priceValue: 2399.00,
            period: 'year',
            durationDays: 365,
            discountText: '-37%',
            monthlyEquivalent: '₹199.92/month',
            originalPrice: '₹3,828',
        },
        {
            id: 'monthly',
            name: 'Monthly',
            priceCurrency: '₹',
            priceValue: 319.00,
            period: 'month',
            durationDays: 30,
        }
    ],
    features: [
        { id: 'feat1', icon: 'stories', title: "Stories", description: "Unlimited posting, priority order, stealth mode, permanent view history and more." },
        { id: 'feat2', icon: 'cloud', title: "Unlimited Cloud Storage", description: "4 GB per each document, unlimited storage for your chats and media overall." },
        { id: 'feat3', icon: 'x2', title: "Doubled Limits", description: "Up to 1000 channels, 30 folders, 10 pins, 20 public links, 4 accounts and more." },
    ]
};

const defaultPaymentSettings: PaymentSettings = {
    instructions: 'Please make a payment to one of the methods below and submit the Transaction ID to get your request approved.',
    qrCodeUrl: '',
    fields: [
        { id: 'upi', label: 'UPI ID', value: 'example@upi' },
        { id: 'bank', label: 'Bank Account', value: '1234567890 (IFSC: ABCD0123456)'}
    ]
};

// FIX: Defined the missing 'AdminPanelView' type alias.
type AdminPanelView = 'dashboard' | 'user_details' | 'chat_details' | 'user_chats_list' | 'premium_settings';

interface AdminPanelProps {
    currentUser: User;
    onBack: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!checked)} className={`relative w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${disabled ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-700' : 'cursor-pointer'} ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

const ConfirmationModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmText?: string; }> = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm' }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onCancel}>
        <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2 text-black dark:text-white">{title}</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{message}</p>
            <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 font-semibold">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold">{confirmText}</button>
            </div>
        </div>
    </div>
);

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center font-semibold text-lg">
                <span>{title}</span>
                <ChevronDownIcon className={isOpen ? 'rotate-180' : ''} />
            </button>
            {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
};

const RenderCustomElement: React.FC<{ element?: CustomElement, defaultText: string }> = ({ element, defaultText }) => {
    if (!element) {
        return <h1 className="text-3xl font-bold">{defaultText}</h1>;
    }
    const style: React.CSSProperties = {
        fontSize: element.style?.fontSize ? `${element.style.fontSize}px` : undefined,
        width: element.style?.width ? `${element.style.width}px` : undefined,
        height: element.style?.height ? `${element.style.height}px` : undefined,
        marginTop: element.style?.marginTop ? `${element.style.marginTop}px` : undefined,
        marginBottom: element.style?.marginBottom ? `${element.style.marginBottom}px` : undefined,
    };
    if (element.type === 'image' && element.content) {
        return <img src={element.content} alt="preview" style={style} />;
    }
    return <h1 style={{...style, fontWeight: 'bold'}}>{element.content || defaultText}</h1>;
};

const LogoGalleryModal: React.FC<{ isOpen: boolean; onClose: () => void; gallery: string[]; onSelect: (url: string) => void; }> = ({ isOpen, onClose, gallery, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-lg p-4" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-lg mb-4">Select from Gallery</h2>
                <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                    {gallery.map(url => (
                        <button key={url} onClick={() => { onSelect(url); onClose(); }} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-md p-1">
                            <img src={url} className="w-full h-full object-contain" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StyleInput: React.FC<{ label: string; value: number | undefined; onChange: (value: string) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="text-sm font-semibold capitalize">{label}</label>
        <input type="number" placeholder="auto" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm" />
    </div>
);

interface CustomElementEditorProps {
    element: ThemedCustomElement | undefined;
    setElement: (updater: (prev: ThemedCustomElement | undefined) => ThemedCustomElement | undefined) => void;
    logoGallery: string[];
}

const CustomElementEditor: React.FC<CustomElementEditorProps> = ({ element, setElement, logoGallery }) => {
    const [activeTheme, setActiveTheme] = useState<'common' | 'light' | 'dark'>('common');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    const currentElement = element?.[activeTheme];

    const updateCurrentElement = (updater: (prev: CustomElement | undefined) => CustomElement | undefined) => {
        setElement(prev => ({
            ...prev,
            [activeTheme]: updater(prev?.[activeTheme]),
        }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as 'text' | 'image';
        // FIX: Removed duplicate `type` property and restructured to preserve style.
        updateCurrentElement(prev => ({
            type: newType,
            content: '',
            style: prev?.style || {}, // Keep existing style, or default to empty object
        }));
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        updateCurrentElement(prev => ({ ...(prev || { type: 'text', content: '', style: {} }), content: value } as CustomElement));
    };

    const handleImageUrlChange = (value: string) => {
        updateCurrentElement(prev => {
            const newElement = { ...(prev || { type: 'image', content: '', style: {} }) } as CustomElement;
            newElement.imageContent = { ...(newElement.imageContent || {}) };
            if (activeTheme === 'common') {
                newElement.imageContent.common = value;
            } else if (activeTheme === 'light') {
                newElement.imageContent.light = value;
            } else {
                newElement.imageContent.dark = value;
            }
            newElement.content = value; // For live preview
            return newElement;
        });
    };

    const handleStyleChange = (prop: keyof ElementStyle, value: string) => {
        updateCurrentElement(prev => ({
            ...(prev || { type: 'text', content: '', style: {} }),
            style: {
                ...(prev?.style || {}),
                [prop]: value ? parseInt(value, 10) : undefined,
            },
        } as CustomElement));
    };

    const TabButton: React.FC<{ theme: 'common' | 'light' | 'dark' }> = ({ theme }) => (
        <button
            onClick={() => setActiveTheme(theme)}
            className={`w-full py-2 rounded-md font-semibold text-sm capitalize ${activeTheme === theme ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}
        >
            {theme}
        </button>
    );

    return (
        <div className="p-3 bg-gray-100 dark:bg-black/20 rounded-md">
            <LogoGalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} gallery={logoGallery} onSelect={handleImageUrlChange} />
            <div className="flex space-x-1 mb-3 bg-gray-200 dark:bg-gray-800 p-1 rounded-md">
                <TabButton theme="common" />
                <TabButton theme="light" />
                <TabButton theme="dark" />
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold">Element Type</label>
                    <select value={currentElement?.type || 'text'} onChange={handleTypeChange} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm">
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                    </select>
                </div>

                {currentElement?.type === 'image' ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-semibold">Image URL</label>
                            <div className="flex space-x-2">
                                <input
                                    value={currentElement.imageContent?.[activeTheme] || currentElement.imageContent?.common || ''}
                                    onChange={e => handleImageUrlChange(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm"
                                />
                                <button type="button" onClick={() => setIsGalleryOpen(true)} className="px-3 bg-gray-300 dark:bg-gray-600 rounded mt-1 text-sm font-semibold">Gallery</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <StyleInput label="Width (px)" value={currentElement.style?.width} onChange={v => handleStyleChange('width', v)} />
                            <StyleInput label="Height (px)" value={currentElement.style?.height} onChange={v => handleStyleChange('height', v)} />
                            <StyleInput label="Margin Top (px)" value={currentElement.style?.marginTop} onChange={v => handleStyleChange('marginTop', v)} />
                            <StyleInput label="Margin Bottom (px)" value={currentElement.style?.marginBottom} onChange={v => handleStyleChange('marginBottom', v)} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-semibold">Text</label>
                            <input value={currentElement?.content || ''} onChange={handleContentChange} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <StyleInput label="Font Size (px)" value={currentElement?.style?.fontSize} onChange={v => handleStyleChange('fontSize', v)} />
                            <div />
                            <StyleInput label="Margin Top (px)" value={currentElement?.style?.marginTop} onChange={v => handleStyleChange('marginTop', v)} />
                            <StyleInput label="Margin Bottom (px)" value={currentElement?.style?.marginBottom} onChange={v => handleStyleChange('marginBottom', v)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const GlobalSettingsView: React.FC<{ allChats: Chat[] }> = ({ allChats }) => {
    const [settings, setSettings] = useState<Partial<AppSettings>>({});
    const [logoGallery, setLogoGallery] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [logoUploading, setLogoUploading] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [clearHours, setClearHours] = useState('720');
    const [showClearOldMessagesConfirm, setShowClearOldMessagesConfirm] = useState(false);
    const [clearMessageStatus, setClearMessageStatus] = useState('');

    useEffect(() => {
        const settingsRef = ref(db, 'settings/global');
        const galleryRef = ref(db, 'settings/logoGallery');

        const settingsListener = onValue(settingsRef, (snapshot) => {
            setSettings(snapshot.exists() ? snapshot.val() : {});
            setLoading(false);
        });
        const galleryListener = onValue(galleryRef, (snapshot) => {
            setLogoGallery(snapshot.exists() ? snapshot.val() : []);
        });

        return () => {
            off(settingsRef, 'value', settingsListener);
            off(galleryRef, 'value', galleryListener);
        };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage('Saving...');
        try {
            await set(ref(db, 'settings/global'), settings);
            setMessage('Settings saved successfully!');
        } catch (error) {
            setMessage('Error saving settings.');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleClearOldMessages = async () => {
        setShowClearOldMessagesConfirm(false);
        const hours = parseInt(clearHours, 10);
        if (isNaN(hours) || hours <= 0) {
            setClearMessageStatus('Please enter a valid number of hours.');
            return;
        }

        setClearMessageStatus('Starting deletion process...');
        const cutoffTimestamp = Date.now() - (hours * 60 * 60 * 1000);
        let totalDeleted = 0;

        try {
            for (const chat of allChats) {
                setClearMessageStatus(`Processing chat: ${chat.name || chat.id}...`);
                const messagesRef = ref(db, `messages/${chat.id}`);
                const q = query(messagesRef, orderByChild('timestamp'), endAt(cutoffTimestamp));
                const snapshot = await get(q);

                if (snapshot.exists()) {
                    const updates: { [key: string]: null } = {};
                    let countInChat = 0;
                    snapshot.forEach(child => {
                        updates[`/messages/${chat.id}/${child.key}`] = null;
                        countInChat++;
                    });
                    await update(ref(db), updates);
                    totalDeleted += countInChat;
                }
            }
            setClearMessageStatus(`Deletion complete. Removed ${totalDeleted} old messages.`);
        } catch (error) {
            console.error(error);
            setClearMessageStatus(`An error occurred. You may need to add a ".indexOn": "timestamp" rule to your '/messages/$chatid' path in Firebase rules.`);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const url = await uploadImage(file);
            const newGallery = [...logoGallery, url];
            await set(ref(db, 'settings/logoGallery'), newGallery);
            setLogoGallery(newGallery);
        } catch (error) {
            setMessage('Logo upload failed.');
        } finally {
            setLogoUploading(false);
        }
    };

    const updateThemedAsset = (prop: 'logoURL', theme: 'light' | 'dark' | 'common', value: string) => {
        setSettings(s => ({
            ...s,
            [prop]: {
                ...(s[prop] || {}),
                [theme]: value
            }
        }));
    };

    const selectAsset = (asset: ThemedAsset | undefined) => asset?.[previewTheme] || asset?.common;
    
    const selectCustomElement = (themedElement: ThemedCustomElement | undefined): CustomElement | undefined => {
      const element = themedElement?.[previewTheme] || themedElement?.common;
      if (!element) return undefined;
      // Resolve image URL within the custom element
      if (element.type === 'image' && element.imageContent) {
          return {
              ...element,
              content: selectAsset(element.imageContent) || '',
          };
      }
      return element;
    };
    
    if (loading) return <p className="p-4 text-center">Loading settings...</p>;

    const loginTitlePreview = selectCustomElement(settings.loginTitle);
    const chatListTitlePreview = selectCustomElement(settings.chatListTitle);

    return (
        <div className="p-4 space-y-4">
            {showClearOldMessagesConfirm && <ConfirmationModal title="Confirm Deletion" message={`Are you sure you want to permanently delete all messages older than ${clearHours} hours from ALL chats? This cannot be undone.`} onConfirm={handleClearOldMessages} onCancel={() => setShowClearOldMessagesConfirm(false)} confirmText="Delete" />}
            <div className="flex items-center justify-between">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-500">
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
                {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
            </div>

            <CollapsibleSection title="General">
                <div className="space-y-4">
                    <div>
                        <label className="block font-semibold">App Name</label>
                        <input value={settings.appName || ''} onChange={e => setSettings(s => ({ ...s, appName: e.target.value }))} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1" />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="font-semibold">Hide Login Logo</label>
                        <Toggle checked={!!settings.hideLoginLogo} onChange={checked => setSettings(s => ({ ...s, hideLoginLogo: checked }))} />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="font-semibold">Show Google Login</label>
                        <Toggle checked={settings.showGoogleLogin !== false} onChange={checked => setSettings(s => ({ ...s, showGoogleLogin: checked }))} />
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="App Logo">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleLogoUpload} accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading} className="w-full p-2 bg-blue-500 text-white rounded mb-4">{logoUploading ? 'Uploading...' : 'Upload New Logo'}</button>
                <div className="space-y-2">
                    {([ 'common', 'light', 'dark'] as const).map(theme => (
                         <div key={theme}>
                            <label className="text-sm font-semibold capitalize">{theme} Logo URL</label>
                            <input value={settings.logoURL?.[theme] || ''} onChange={e => updateThemedAsset('logoURL', theme, e.target.value)} placeholder={`URL for ${theme} theme`} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm" />
                         </div>
                    ))}
                </div>
                <h4 className="font-semibold mt-4 mb-2">Logo Gallery</h4>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto bg-gray-100 dark:bg-black/20 p-2 rounded-md">
                    {logoGallery.map((url, i) => <img key={i} src={url} className="w-full h-auto aspect-square object-contain bg-gray-300 dark:bg-gray-700 rounded-md cursor-pointer" onClick={() => navigator.clipboard.writeText(url)} title="Click to copy URL" />)}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Login Screen Customization">
                 <CustomElementEditor
                    element={settings.loginTitle}
                    setElement={updater => setSettings(s => ({ ...s, loginTitle: updater(s.loginTitle) }))}
                    logoGallery={logoGallery}
                 />
                 <div className="mt-4 p-4 border rounded-lg bg-gray-200 dark:bg-black/30">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-sm text-gray-500">Live Preview</h3>
                        <button onClick={() => setPreviewTheme(p => p === 'light' ? 'dark' : 'light')} className="p-1.5 rounded-full bg-gray-300 dark:bg-gray-700">{previewTheme === 'light' ? <MoonIcon/> : <SunIcon />}</button>
                    </div>
                    <div className={`flex flex-col items-center p-6 border rounded-md min-h-[150px] justify-center ${previewTheme === 'light' ? 'bg-white text-black' : 'bg-[#1e1e1e] text-white'}`}>
                        {!settings.hideLoginLogo && <img src={selectAsset(settings.logoURL)} alt="Logo" className="w-20 h-20 rounded-full object-cover mb-4 bg-gray-500" />}
                        <RenderCustomElement element={loginTitlePreview} defaultText={settings.appName || 'Batchat'} />
                    </div>
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="Chat List Screen Customization">
                 <CustomElementEditor
                    element={settings.chatListTitle}
                    setElement={updater => setSettings(s => ({ ...s, chatListTitle: updater(s.chatListTitle) }))}
                    logoGallery={logoGallery}
                 />
                 <div className="mt-4 p-4 border rounded-lg bg-gray-200 dark:bg-black/30">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-sm text-gray-500">Live Preview</h3>
                        <button onClick={() => setPreviewTheme(p => p === 'light' ? 'dark' : 'light')} className="p-1.5 rounded-full bg-gray-300 dark:bg-gray-700">{previewTheme === 'light' ? <MoonIcon/> : <SunIcon />}</button>
                    </div>
                     <div className={`p-4 border rounded-md ${previewTheme === 'light' ? 'bg-white text-black' : 'bg-[#1e1e1e] text-white'}`}>
                        <RenderCustomElement element={chatListTitlePreview} defaultText={settings.appName || 'Batchat'} />
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Data Management">
                <div className="space-y-4">
                    <div>
                        <label className="block font-semibold mb-1">Clear Old Messages</label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Permanently delete messages from all chats older than the specified duration.</p>
                        <div className="flex items-center space-x-2">
                             <input type="number" value={clearHours} onChange={e => setClearHours(e.target.value)} className="w-24 bg-gray-200 dark:bg-gray-700 p-2 rounded" />
                             <span className="font-semibold">hours</span>
                        </div>
                    </div>
                    <button onClick={() => setShowClearOldMessagesConfirm(true)} className="w-full text-left p-3 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold text-white">
                        Clear Messages Older Than {clearHours} Hours
                    </button>
                    {clearMessageStatus && <p className="text-sm text-gray-500 dark:text-gray-400">{clearMessageStatus}</p>}
                </div>
            </CollapsibleSection>
        </div>
    );
};

const TabButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; notificationCount?: number; }> = ({ icon, label, isActive, onClick, notificationCount }) => (
    <button onClick={onClick} className={`relative flex flex-col items-center p-2 rounded-lg transition-colors w-24 ${isActive ? 'text-[var(--theme-color-primary)] bg-black/5 dark:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
        {icon}
        <span className="text-xs font-semibold mt-1">{label}</span>
        {notificationCount && notificationCount > 0 && (
            <span className="absolute top-0 right-4 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
            </span>
        )}
    </button>
);

// FIX: Define missing ItemListView component.
const ItemListView: React.FC<{ items: any[], displayKey: string, subDisplayKey?: string, onSelect: (item: any) => void, placeholder: string }> = ({ items, displayKey, subDisplayKey, onSelect, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredItems = items.filter(item => 
        (item[displayKey] && item[displayKey].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subDisplayKey && item[subDisplayKey] && item[subDisplayKey].toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    return (
        <div className="flex flex-col h-full">
            <div className="p-2">
                 <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredItems.map(item => (
                    <div key={item.uid || item.id} onClick={() => onSelect(item)} className="flex items-center p-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer border-b border-gray-200 dark:border-gray-800">
                        <Avatar photoURL={item.photoURL} name={item[displayKey]} sizeClass="w-12 h-12 mr-3" />
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{item[displayKey] || '(No Name)'}</p>
                            {subDisplayKey && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{item[subDisplayKey]}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const ChatListItemWithStats: React.FC<{ chat: Chat; viewedUser: User }> = ({ chat, viewedUser }) => {
    const [stats, setStats] = useState({ count: 0, loading: true });

    useEffect(() => {
        const messagesRef = ref(db, `messages/${chat.id}`);
        const listener = onValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                const messagesData = snapshot.val();
                const messageCount = Object.values(messagesData).filter((msg: any) => msg.senderId === viewedUser.uid).length;
                setStats({ count: messageCount, loading: false });
            } else {
                setStats({ count: 0, loading: false });
            }
        });

        return () => off(messagesRef, 'value', listener);
    }, [chat.id, viewedUser.uid]);

    const getOtherParticipantInfo = (chat: Chat) => {
        const otherUserId = Object.keys(chat.participants || {}).find(uid => uid !== viewedUser.uid);
        if (!otherUserId) return { name: 'Unknown User', photoURL: null };
        const otherUser = chat.participantInfo?.[otherUserId];
        return { 
            name: otherUser?.displayName || 'Unknown User', 
            photoURL: otherUser?.photoURL || null
        };
    };

    const displayName = chat.type === ChatType.Private ? getOtherParticipantInfo(chat).name : chat.name;
    const displayPhoto = chat.type === ChatType.Private ? getOtherParticipantInfo(chat).photoURL : chat.photoURL;
    const subtitle = chat.type === ChatType.Private ? 'Private Chat' : `${Object.keys(chat.participants).length} members`;

    return (
        <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800">
            <Avatar photoURL={displayPhoto} name={displayName} sizeClass="w-12 h-12 mr-3" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{displayName || 'Unnamed Group'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            </div>
            <div className="text-right ml-2">
                <p className="font-bold text-lg">{stats.loading ? '...' : stats.count}</p>
                <p className="text-xs text-gray-500">messages</p>
            </div>
        </div>
    );
};


const UserChatsListView: React.FC<{ chats: Chat[]; viewedUser: User }> = ({ chats, viewedUser }) => {

    return (
        <div className="flex-1 overflow-y-auto">
             {chats.length > 0 ? (
                chats.map(chat => (
                    <ChatListItemWithStats key={chat.id} chat={chat} viewedUser={viewedUser} />
                ))
            ) : (
                 <p className="text-center p-8 text-gray-500">This user is not in any chats.</p>
            )}
        </div>
    );
};


const UserDetailsView: React.FC<{ user: User; userChats: Chat[]; chatsLoading: boolean; onBack: () => void; onViewAllChats: () => void; }> = ({ user, userChats, chatsLoading, onBack, onViewAllChats }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
    const [showDeleteUserMessagesConfirm, setShowDeleteUserMessagesConfirm] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const badgeUploadRef = useRef<HTMLInputElement>(null);
    const [badgeUploading, setBadgeUploading] = useState(false);

    useEffect(() => {
        setEditedUser(user);
        if (user.isPremium && user.paymentRequestId) {
            const paymentRequestRef = ref(db, `paymentRequests/${user.paymentRequestId}`);
            const listener = onValue(paymentRequestRef, (snapshot) => {
                if (snapshot.exists()) {
                    setPaymentRequest({ id: snapshot.key, ...snapshot.val() } as PaymentRequest);
                } else {
                    setPaymentRequest(null);
                }
            });
            return () => off(paymentRequestRef, 'value', listener);
        } else {
            setPaymentRequest(null);
        }
    }, [user]);

    const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        setBadgeUploading(true);
        try {
            const url = await uploadImage(file);
            setEditedUser(prev => ({...prev, profileBadgeUrl: url}));
        } catch (err) {
            console.error("Badge upload failed", err);
            alert("Badge upload failed");
        } finally {
            setBadgeUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const updates: {[key: string]: any} = {};
        updates[`/users/${user.uid}/displayName`] = editedUser.displayName;
        updates[`/users/${user.uid}/handle`] = editedUser.handle;
        updates[`/users/${user.uid}/bio`] = editedUser.bio;
        updates[`/users/${user.uid}/isAdmin`] = editedUser.isAdmin;
        updates[`/users/${user.uid}/profileBadgeUrl`] = editedUser.profileBadgeUrl || null;
        await update(ref(db), updates);
    
        // Fan-out updates for display
        const fanOutUpdates: {[key: string]: any} = {};
        if (editedUser.displayName !== user.displayName) fanOutUpdates['displayName'] = editedUser.displayName;
        if (editedUser.profileBadgeUrl !== user.profileBadgeUrl) fanOutUpdates['profileBadgeUrl'] = editedUser.profileBadgeUrl || null;
    
        if (Object.keys(fanOutUpdates).length > 0) {
            const userChatsSnap = await get(ref(db, `user-chats/${user.uid}`));
            if (userChatsSnap.exists()) {
                const chatIds = Object.keys(userChatsSnap.val());
                const finalFanOut: {[key: string]: any} = {};
                for (const chatId of chatIds) {
                    for (const key in fanOutUpdates) {
                        finalFanOut[`/chats/${chatId}/participantInfo/${user.uid}/${key}`] = fanOutUpdates[key];
                    }
                }
                if (Object.keys(finalFanOut).length > 0) {
                    await update(ref(db), finalFanOut);
                }
            }
        }
    
        setIsSaving(false);
        setIsEditing(false);
    };

    const handleDeleteUserMessages = async () => {
        setShowDeleteUserMessagesConfirm(false);
        const updates: { [key: string]: null } = {};
        for (const chat of userChats) {
            const messagesSnap = await get(query(ref(db, `messages/${chat.id}`), orderByChild('senderId'), equalTo(user.uid)));
            if (messagesSnap.exists()) {
                messagesSnap.forEach(msgSnap => {
                    updates[`/messages/${chat.id}/${msgSnap.key}`] = null;
                });
            }
        }
        await update(ref(db), updates);
        window.alert(`Deleted all messages sent by ${user.displayName}.`);
    };

    const handleClearChats = async () => {
        setShowClearConfirm(false);
        const updates: {[key: string]: any} = {};
        for(const chat of userChats) {
            const messagesSnap = await get(ref(db, `messages/${chat.id}`));
            if(messagesSnap.exists()){
                messagesSnap.forEach(msgSnap => {
                    updates[`/messages/${chat.id}/${msgSnap.key}/deletedFor/${user.uid}`] = true;
                });
            }
        }
        await update(ref(db), updates);
        window.alert(`Cleared all chat histories for ${user.displayName}.`);
    };

    const handleDeleteUser = async () => {
        setShowDeleteUserConfirm(false);
        const updates: {[key: string]: any} = {};
        
        // Remove user from all their chats
        for (const chat of userChats) {
            updates[`/chats/${chat.id}/participants/${user.uid}`] = null;
            updates[`/chats/${chat.id}/participantInfo/${user.uid}`] = null;
            // Also remove from admins if they are one
            updates[`/chats/${chat.id}/admins/${user.uid}`] = null;
        }
        
        // Delete user's own chat list
        updates[`/user-chats/${user.uid}`] = null;
        // Delete user's main data node
        updates[`/users/${user.uid}`] = null;

        await update(ref(db), updates);
        window.alert(`${(user as User).displayName}'s data has been deleted. They will be prompted to complete their profile on next login.`);
        onBack();
    };
    
    const handleBlockUser = async () => {
        setShowBlockConfirm(false);
        await update(ref(db, `users/${user.uid}`), { status: 0 });
        window.alert(`${user.displayName} has been blocked.`);
        setEditedUser(prev => ({ ...prev, status: 0 }));
    };

    const handleUnblockUser = async () => {
        await update(ref(db, `users/${user.uid}`), { status: 1 });
        window.alert(`${user.displayName} has been unblocked.`);
        setEditedUser(prev => ({ ...prev, status: 1 }));
    };


    return (
        <div className="p-4 space-y-4">
            <input type="file" ref={badgeUploadRef} className="hidden" accept="image/*" onChange={handleBadgeUpload} />
            {showClearConfirm && <ConfirmationModal title="Clear User's Chats?" message={`This will clear chat history for ${user.displayName} only. Other participants will not be affected.`} onConfirm={handleClearChats} onCancel={() => setShowClearConfirm(false)} confirmText="Clear Chats" />}
            {showDeleteUserConfirm && <ConfirmationModal title="Delete User Data?" message={`This will permanently delete all data for ${user.displayName} (profile, chat memberships, etc.) but not their login account. On next login, they will be forced to create a new profile. This cannot be undone.`} onConfirm={handleDeleteUser} onCancel={() => setShowDeleteUserConfirm(false)} confirmText="Delete User Data" />}
            {showDeleteUserMessagesConfirm && <ConfirmationModal title="Delete All User's Messages?" message={`This will permanently delete ALL messages sent by ${user.displayName} across ALL chats. This cannot be undone.`} onConfirm={handleDeleteUserMessages} onCancel={() => setShowDeleteUserMessagesConfirm(false)} confirmText="Delete Messages" />}
            {showBlockConfirm && <ConfirmationModal title="Block User?" message={`Are you sure you want to block ${user.displayName}? They will be logged out and unable to sign in.`} onConfirm={handleBlockUser} onCancel={() => setShowBlockConfirm(false)} confirmText="Block" />}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{isEditing ? "Edit User" : "User Details"}</h2>
                {isEditing ? (
                    <button onClick={handleSave} disabled={isSaving} className="font-semibold text-blue-500 dark:text-blue-400">{isSaving ? 'Saving...' : 'Save'}</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="font-semibold text-blue-500 dark:text-blue-400">Edit</button>
                )}
            </div>
            <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg space-y-3">
                <p><strong>Status:</strong> {editedUser.status === 0 ? <span className="text-red-500 font-bold">Blocked</span> : <span className="text-green-500 font-bold">Active</span>}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>UID:</strong> {user.uid}</p>
                <div><strong>Name:</strong> {isEditing ? <input value={editedUser.displayName || ''} onChange={e => setEditedUser({...editedUser, displayName: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2"/> : user.displayName}</div>
                <div><strong>Handle:</strong> {isEditing ? <input value={editedUser.handle || ''} onChange={e => setEditedUser({...editedUser, handle: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2"/> : `@${user.handle}`}</div>
                <div><strong>Bio:</strong> {isEditing ? <textarea value={editedUser.bio || ''} onChange={e => setEditedUser({...editedUser, bio: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2 w-full"/> : user.bio || 'N/A'}</div>
                <div className="flex items-center"><strong>Admin:</strong> {isEditing ? <input type="checkbox" checked={!!editedUser.isAdmin} onChange={e => setEditedUser({...editedUser, isAdmin: e.target.checked})} className="ml-2 h-5 w-5"/> : (user.isAdmin ? 'Yes' : 'No')}</div>
                <div>
                    <strong>Profile Badge:</strong>
                    {isEditing ? (
                        <div className="mt-2 space-y-2">
                            {editedUser.profileBadgeUrl && <img src={editedUser.profileBadgeUrl} alt="badge" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 p-1"/>}
                            <input 
                                value={editedUser.profileBadgeUrl || ''} 
                                onChange={e => setEditedUser({...editedUser, profileBadgeUrl: e.target.value})} 
                                className="bg-gray-200 dark:bg-gray-700 p-1 rounded w-full text-sm"
                                placeholder="Image URL for badge"
                            />
                            <button 
                                type="button" 
                                onClick={() => badgeUploadRef.current?.click()} 
                                className="text-sm font-semibold text-blue-500 dark:text-blue-400"
                                disabled={badgeUploading}
                            >
                                {badgeUploading ? 'Uploading...' : 'Upload Badge'}
                            </button>
                            {editedUser.profileBadgeUrl && (
                                <button 
                                    type="button" 
                                    onClick={() => setEditedUser(prev => ({...prev, profileBadgeUrl: ''}))} 
                                    className="text-sm font-semibold text-red-500 dark:text-red-400 ml-4"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ) : (
                        user.profileBadgeUrl ? <img src={user.profileBadgeUrl} alt="badge" className="w-6 h-6 inline-block ml-2" /> : <span className="ml-2 text-gray-500">None</span>
                    )}
                </div>
            </div>

            {user.isPremium && (
                <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg space-y-3">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center"><PremiumIcon /> <span className="ml-2">Premium Status</span></h3>
                    <p><strong>Plan:</strong> {paymentRequest ? paymentRequest.plan.name : 'Loading...'}</p>
                    {paymentRequest?.reviewedAt && (
                        <p><strong>Activated on:</strong> {new Date(paymentRequest.reviewedAt).toLocaleString()}</p>
                    )}
                    {user.premiumExpiryTimestamp && (
                        <p><strong>Expires on:</strong> {new Date(user.premiumExpiryTimestamp).toLocaleString()}</p>
                    )}
                </div>
            )}

            <button onClick={onViewAllChats} className="w-full bg-white dark:bg-[#2f2f2f] p-4 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">User Chats</h3>
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <span>{chatsLoading ? "Loading..." : `${userChats.length} chats`}</span>
                        <ChevronRightIcon />
                    </div>
                </div>
            </button>
            
            <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                 <h3 className="text-lg font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</h3>
                <div className="space-y-2">
                    {editedUser.status !== 0 ? (
                        <button onClick={() => setShowBlockConfirm(true)} className="w-full text-left p-3 bg-orange-600/80 hover:bg-orange-600 rounded-lg font-semibold text-white">Block User</button>
                    ) : (
                        <button onClick={handleUnblockUser} className="w-full text-left p-3 bg-green-600/80 hover:bg-green-600 rounded-lg font-semibold text-white">Unblock User</button>
                    )}
                    <button onClick={() => setShowClearConfirm(true)} className="w-full text-left p-3 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg font-semibold text-white">Clear All Chats for this User</button>
                    <button onClick={() => setShowDeleteUserMessagesConfirm(true)} className="w-full text-left p-3 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold text-white">Delete All User's Messages</button>
                    <button onClick={() => setShowDeleteUserConfirm(true)} className="w-full text-left p-3 bg-red-700/80 hover:bg-red-700 rounded-lg font-semibold text-white">Delete User and Data</button>
                </div>
            </div>
        </div>
    );
};

const ChatDetailsView: React.FC<{ chat: Chat, onBack: () => void, members: User[] }> = ({ chat, onBack, members }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteAllMessagesConfirm, setShowDeleteAllMessagesConfirm] = useState(false);
    const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingOlder, setIsFetchingOlder] = useState(false);
    const messageContainerRef = React.useRef<HTMLDivElement>(null);

    const membersMap = new Map(members.map(m => [m.uid, m]));

    const loadMessages = async (endBeforeKey?: string) => {
        const messagesQuery = endBeforeKey
            ? query(ref(db, `messages/${chat.id}`), orderByKey(), endBefore(endBeforeKey), limitToLast(30))
            : query(ref(db, `messages/${chat.id}`), orderByKey(), limitToLast(30));
        
        const snapshot = await get(messagesQuery);
        const loadedMessages: Message[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                loadedMessages.push({ id: childSnapshot.key as string, ...childSnapshot.val() });
            });
        }
        
        if (loadedMessages.length < 30) {
            setHasMore(false);
        }
        
        return loadedMessages;
    };

    useEffect(() => {
        setLoading(true);
        loadMessages().then(initialMessages => {
            setMessages(initialMessages.reverse());
            setLoading(false);
            if (messageContainerRef.current) {
                messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
            }
        });
    }, [chat.id]);
    
    const handleLoadMore = async () => {
        if (!hasMore || isFetchingOlder || messages.length === 0) return;
        setIsFetchingOlder(true);
        const oldestKey = messages[0].id;
        const olderMessages = await loadMessages(oldestKey);
        setMessages(prev => [...olderMessages.reverse(), ...prev]);
        setIsFetchingOlder(false);
    };

    const handleDeleteAllMessages = async () => {
        setShowDeleteAllMessagesConfirm(false);
        await remove(ref(db, `messages/${chat.id}`));
        await update(ref(db, `chats/${chat.id}`), {
            lastMessage: "Chat history cleared.",
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: 'system'
        });
        setMessages([]);
    };

    const handleDeleteGroup = async () => {
        setShowDeleteGroupConfirm(false);
        const updates: {[key: string]: any} = {};
        updates[`/chats/${chat.id}`] = null;
        updates[`/messages/${chat.id}`] = null;
        Object.keys(chat.participants).forEach(uid => {
            updates[`/user-chats/${uid}/${chat.id}`] = null;
        });
        await update(ref(db), updates);
        onBack();
    };
    
    return (
        <div className="p-4 space-y-4 flex flex-col h-full">
            {showDeleteAllMessagesConfirm && <ConfirmationModal title="Delete All Messages?" message={`This will permanently delete all messages in "${chat.name}". This action cannot be undone.`} onConfirm={handleDeleteAllMessages} onCancel={() => setShowDeleteAllMessagesConfirm(false)} confirmText="Delete Messages" />}
            {showDeleteGroupConfirm && <ConfirmationModal title="Delete Group Permanently?" message={`This will permanently delete the group "${chat.name}" for ALL participants. This action cannot be undone.`} onConfirm={handleDeleteGroup} onCancel={() => setShowDeleteGroupConfirm(false)} confirmText="Delete Group" />}
           
            <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg">
                <p><strong>Members:</strong> {Object.keys(chat.participants || {}).length}</p>
                <p><strong>Type:</strong> {chat.type}</p>
                <p><strong>ID:</strong> {chat.id}</p>
            </div>
            
            <div ref={messageContainerRef} className="flex-1 bg-gray-200 dark:bg-black/30 rounded-lg p-2 space-y-2 overflow-y-auto">
                {loading && <p className="text-center text-gray-500 dark:text-gray-400">Loading messages...</p>}
                {hasMore && !loading && <button onClick={handleLoadMore} disabled={isFetchingOlder} className="w-full text-center text-blue-500 dark:text-blue-400 p-2 text-sm">{isFetchingOlder ? 'Loading...' : 'Load More'}</button>}
                {messages.map(msg => {
                    const sender = membersMap.get(msg.senderId);
                    return (
                        <div key={msg.id} className="p-2 text-sm rounded-md bg-white dark:bg-gray-800/50">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-blue-600 dark:text-blue-300">{(sender as User | undefined)?.displayName || 'Unknown'}</span>
                                <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 mt-1">{msg.text || '[Media]'}</p>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#1e1e1e] -mx-4 -mb-4">
                <h3 className="text-lg font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</h3>
                <div className="space-y-2">
                    <button onClick={() => setShowDeleteAllMessagesConfirm(true)} className="w-full text-left p-3 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold text-white">Delete All Messages</button>
                    <button onClick={() => setShowDeleteGroupConfirm(true)} className="w-full text-left p-3 bg-red-700/80 hover:bg-red-700 rounded-lg font-semibold text-white">Delete Group Permanently</button>
                </div>
            </div>
        </div>
    );
};

const GlobalSettings: React.FC<{ chats: Chat[] }> = ({ chats }) => {
    return <GlobalSettingsView allChats={chats} />;
};

const DashboardView: React.FC<{ users: User[], chats: Chat[], onNavigate: (view: AdminPanelView) => void }> = ({ users, chats, onNavigate }) => {
    const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, groups: 0, channels: 0 });
    
    useEffect(() => {
        const usersRef = ref(db, 'users');
        const chatsRef = ref(db, 'chats');

        const usersListener = onValue(usersRef, (snap) => {
            if(snap.exists()){
                const usersData = snap.val();
                const usersArray = Object.values(usersData) as User[];
                setStats(s => ({...s, totalUsers: usersArray.length, activeUsers: usersArray.filter(u => u.isOnline).length }));
            }
        });
        
        const chatsListener = onValue(chatsRef, (snap) => {
            if(snap.exists()){
                const chatsData = snap.val();
                const chatsArray = Object.values(chatsData) as Chat[];
                setStats(s => ({...s, groups: chatsArray.filter(c=>c.type === ChatType.Group).length, channels: chatsArray.filter(c=>c.type === ChatType.Channel).length }));
            }
        });
        
        return () => {
            off(usersRef, 'value', usersListener);
            off(chatsRef, 'value', chatsListener);
        }
    }, []);
    
    const StatCard: React.FC<{ label: string, value: number | string, icon: React.ReactNode }> = ({ label, value, icon }) => (
        <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg flex items-center space-x-4">
            <div className="p-3 bg-gray-100 dark:bg-black/20 rounded-full">{icon}</div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    );
    
    return (
        <div className="p-4 grid grid-cols-2 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} icon={<UserGroupIcon />} />
            <StatCard label="Active Users" value={stats.activeUsers} icon={<ActiveUserIcon />} />
            <StatCard label="Groups" value={stats.groups} icon={<ChatBubbleIcon />} />
            <StatCard label="Channels" value={stats.channels} icon={<ChannelIcon />} />
            <div className="col-span-2">
                <button onClick={() => onNavigate('premium_settings')} className="w-full bg-white dark:bg-[#2f2f2f] p-4 rounded-lg flex items-center space-x-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full"><PremiumIcon /></div>
                    <div>
                        <p className="text-lg font-bold">Premium Page</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Edit icon, plans, and features</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

const SupportView: React.FC = () => {
    const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingChat, setViewingChat] = useState<SupportChat | null>(null);
    const [chatToDelete, setChatToDelete] = useState<SupportChat | null>(null);

    useEffect(() => {
        const supportChatsRef = ref(db, 'supportChats');
        const listener = onValue(supportChatsRef, (snapshot) => {
            const chatsData: SupportChat[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnap => {
                    chatsData.push({ id: childSnap.key!, ...childSnap.val() });
                });
            }
            // Sort: unread first, then by most recent message
            chatsData.sort((a, b) => {
                if (a.unreadForAdmin && !b.unreadForAdmin) return -1;
                if (!a.unreadForAdmin && b.unreadForAdmin) return 1;
                return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0);
            });
            setSupportChats(chatsData);
            setLoading(false);
        });

        return () => off(supportChatsRef, 'value', listener);
    }, []);

    const handleDeleteChat = async () => {
        if (!chatToDelete) return;
        await remove(ref(db, `supportChats/${chatToDelete.id}`));
        setChatToDelete(null);
    };

    if (viewingChat) {
        return (
            <HelpChatScreen
                payload={{ chatId: viewingChat.id, isGuest: viewingChat.userInfo.isGuest, guestName: viewingChat.userInfo.name }}
                onBack={() => setViewingChat(null)}
                isAdminMode={true}
                supportChatInfo={viewingChat.userInfo}
            />
        );
    }
    
    if (loading) {
        return <p className="text-center text-gray-500 dark:text-gray-400 p-8">Loading support chats...</p>;
    }

    return (
        <div className="flex-1 overflow-y-auto">
             {chatToDelete && (
                <ConfirmationModal 
                    title="Delete Chat?" 
                    message={`Are you sure you want to permanently delete this support chat with ${chatToDelete.userInfo.name}?`}
                    onConfirm={handleDeleteChat}
                    onCancel={() => setChatToDelete(null)}
                    confirmText="Delete"
                />
            )}
            {supportChats.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 p-8">No support chats yet.</p>
            ) : (
                supportChats.map(chat => (
                    <div key={chat.id} className="flex items-center p-3 hover:bg-black/5 dark:hover:bg-white/10 border-b border-gray-200 dark:border-gray-800">
                        <Avatar photoURL={chat.userInfo.photoURL} name={chat.userInfo.name} sizeClass="w-12 h-12 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingChat(chat)}>
                            <div className="flex items-center justify-between">
                                <p className={`font-semibold truncate ${chat.unreadForAdmin ? 'text-[var(--theme-color-primary)]' : ''}`}>{chat.userInfo.name}</p>
                                {chat.lastMessageTimestamp && <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(chat.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.userInfo.phoneNumber || 'No phone number'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{chat.lastMessage}</p>
                        </div>
                        <button onClick={() => setChatToDelete(chat)} className="ml-4 p-2 text-red-500 hover:bg-red-500/10 rounded-full">
                            <DeleteIcon />
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

const PaymentsView: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected' | 'hold'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<PaymentRequest | null>(null);

    useEffect(() => {
        const requestsRef = ref(db, 'paymentRequests');
        const listener = onValue(requestsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const requestsArray: PaymentRequest[] = Object.entries(data).map(([id, value]) => ({
                    id,
                    ...(value as Omit<PaymentRequest, 'id'>)
                })).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
                setRequests(requestsArray);
            } else {
                setRequests([]);
            }
            setLoading(false);
        });
        return () => off(requestsRef, 'value', listener);
    }, []);
    
    const handleAction = async (request: PaymentRequest, newStatus: 'accepted' | 'rejected' | 'hold') => {
        setActionLoading(true);
        try {
            const updates: { [key: string]: any } = {};
            const userRef = `users/${request.userId}`;
            const requestRef = `paymentRequests/${request.id}`;

            updates[`${requestRef}/status`] = newStatus;
            updates[`${requestRef}/reviewedAt`] = serverTimestamp();
            updates[`${requestRef}/reviewedBy`] = currentUser.uid;

            updates[`${userRef}/paymentRequestStatus`] = newStatus;

            if (newStatus === 'accepted') {
                const expiryTimestamp = Date.now() + (request.plan.durationDays * 24 * 60 * 60 * 1000);
                updates[`${userRef}/isPremium`] = true;
                updates[`${userRef}/premiumExpiryTimestamp`] = expiryTimestamp;
            } else {
                updates[`${userRef}/isPremium`] = false;
                updates[`${userRef}/premiumExpiryTimestamp`] = null;
            }

            await update(ref(db), updates);
        } catch (error) {
            console.error('Failed to update payment status:', error);
        } finally {
            setActionLoading(false);
            setSelectedRequest(null);
        }
    };
    
    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        setActionLoading(true);
        try {
            const updates: { [key: string]: any } = {};
            updates[`paymentRequests/${showDeleteConfirm.id}`] = null;
            updates[`users/${showDeleteConfirm.userId}/paymentRequestStatus`] = null;
            updates[`users/${showDeleteConfirm.userId}/paymentRequestId`] = null;
            await update(ref(db), updates);
        } catch (error) {
            console.error('Failed to delete payment request:', error);
        } finally {
            setActionLoading(false);
            setShowDeleteConfirm(null);
        }
    };

    const filteredRequests = requests.filter(r => r.status === filter);
    
    const FilterButton: React.FC<{ value: typeof filter; label: string; count: number }> = ({ value, label, count }) => (
      <button onClick={() => setFilter(value)} className={`relative px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === value ? 'bg-[var(--theme-color-primary)] text-[var(--theme-text-color)]' : 'bg-gray-200 dark:bg-[#2f2f2f] text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4a4a]'}`}>
          {label}
          {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                  {count > 9 ? '9+' : count}
              </span>
          )}
      </button>
    );

    const statusColors = {
        pending: 'border-yellow-500',
        accepted: 'border-green-500',
        rejected: 'border-red-500',
        hold: 'border-blue-500'
    };

    const RequestItem: React.FC<{ request: PaymentRequest }> = ({ request }) => (
        <div onClick={() => setSelectedRequest(request)} className={`flex items-center p-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer border-l-4 ${statusColors[request.status]}`}>
            <Avatar photoURL={request.userInfo.photoURL} name={request.userInfo.displayName} sizeClass="w-12 h-12 mr-3" />
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{request.userInfo.displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{request.plan.name} Plan</p>
            </div>
            <div className="text-right ml-2 text-xs text-gray-500 dark:text-gray-400">
                <p>{new Date(request.submittedAt).toLocaleDateString()}</p>
                <p>{new Date(request.submittedAt).toLocaleTimeString()}</p>
            </div>
        </div>
    );
    
    const DetailModal = () => {
        if (!selectedRequest) return null;
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
                <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold p-4 border-b border-gray-200 dark:border-gray-700">Payment Details</h2>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div>
                            <p className="text-xs text-gray-500">User</p>
                            <p className="font-semibold">{selectedRequest.userInfo.displayName} (@{selectedRequest.userInfo.handle})</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="font-semibold">{selectedRequest.plan.name} ({selectedRequest.plan.priceCurrency}{selectedRequest.plan.priceValue})</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Transaction ID</p>
                            <p className="font-mono bg-gray-100 dark:bg-black/20 p-2 rounded">{selectedRequest.submittedData.transactionId}</p>
                        </div>
                        {selectedRequest.submittedData.screenshotUrl && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Screenshot</p>
                                <a href={selectedRequest.submittedData.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={selectedRequest.submittedData.screenshotUrl} alt="Screenshot" className="rounded-lg max-w-full max-h-60 mx-auto" />
                                </a>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <p className="font-semibold capitalize">{selectedRequest.status}</p>
                        </div>
                    </div>
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <button
                            onClick={() => {
                                setShowDeleteConfirm(selectedRequest);
                                setSelectedRequest(null);
                            }}
                            className="px-4 py-2 rounded-lg font-semibold text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                            disabled={actionLoading}
                        >
                            Delete
                        </button>
                        <div className="flex justify-end space-x-2">
                            {selectedRequest.status !== 'accepted' && (
                                <button disabled={actionLoading} onClick={() => handleAction(selectedRequest, 'accepted')} className="px-4 py-2 rounded-lg font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Accept</button>
                            )}
                            {selectedRequest.status !== 'rejected' && (
                                <button disabled={actionLoading} onClick={() => handleAction(selectedRequest, 'rejected')} className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Reject</button>
                            )}
                            {selectedRequest.status !== 'hold' && (
                                 <button disabled={actionLoading} onClick={() => handleAction(selectedRequest, 'hold')} className="px-4 py-2 rounded-lg font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Hold</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 flex items-center space-x-2 overflow-x-auto">
                <FilterButton value="pending" label="Pending" count={requests.filter(r => r.status === 'pending').length} />
                <FilterButton value="accepted" label="Accepted" count={requests.filter(r => r.status === 'accepted').length} />
                <FilterButton value="rejected" label="Rejected" count={requests.filter(r => r.status === 'rejected').length} />
                <FilterButton value="hold" label="Hold" count={requests.filter(r => r.status === 'hold').length} />
            </div>
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? <p className="text-center text-gray-500 p-8">Loading requests...</p> : 
                 filteredRequests.length > 0 ? filteredRequests.map(r => (
                    <div key={r.id} className="relative group">
                        <RequestItem request={r} />
                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(r); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-500/80 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                           <DeleteIcon />
                        </button>
                    </div>
                 )) :
                 <p className="text-center text-gray-500 p-8">No requests in this category.</p>
                }
            </div>
            <DetailModal />
            {showDeleteConfirm && <ConfirmationModal title="Delete Request?" message="This will permanently delete the payment request. The user will be able to submit a new one." onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(null)} confirmText="Delete"/>}
        </div>
    );
}


const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onBack }) => {
    
    const [view, setView] = useState<AdminPanelView>('dashboard');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'groups' | 'settings' | 'support' | 'payments'>('dashboard');
    
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [chatsLoading, setChatsLoading] = useState(true);

    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [viewingChat, setViewingChat] = useState<Chat | null>(null);
    const [viewingUserChats, setViewingUserChats] = useState<Chat[]>([]);
    const [chatsForUserLoading, setChatsForUserLoading] = useState(false);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

    const [globalSettings, setGlobalSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        const settingsRef = ref(db, 'settings/global');
        const listener = onValue(settingsRef, (snapshot) => {
            setGlobalSettings(snapshot.val()); // can be null if not exists
        });
        return () => off(settingsRef, 'value', listener);
    }, []);

    useEffect(() => {
        const supportChatsRef = ref(db, 'supportChats');
        const unreadQuery = query(supportChatsRef, orderByChild('unreadForAdmin'), equalTo(true));
        const listener = onValue(unreadQuery, (snapshot) => {
            setUnreadSupportCount(snapshot.exists() ? snapshot.size : 0);
        });

        return () => off(unreadQuery, 'value', listener);
    }, []);

    useEffect(() => {
        const paymentsRef = ref(db, 'paymentRequests');
        const pendingQuery = query(paymentsRef, orderByChild('status'), equalTo('pending'));
        const listener = onValue(pendingQuery, (snapshot) => {
            setPendingPaymentCount(snapshot.exists() ? snapshot.size : 0);
        });
        return () => off(pendingQuery, 'value', listener);
    }, []);

    useEffect(() => {
        const chatsRef = ref(db, 'chats');
        const chatsListener = onValue(chatsRef, (snapshot) => {
            const chatsObject: Record<string, Omit<Chat, 'id'>> | null = snapshot.val();
            if (snapshot.exists() && chatsObject) {
                const chatsData = Object.entries(chatsObject).map(([id, data]) => ({ id, ...data }));
                setAllChats(chatsData as Chat[]);
            } else {
                setAllChats([]);
            }
            setChatsLoading(false);
        });

        return () => {
            off(chatsRef, 'value', chatsListener);
        };
    }, []);

    const handleSelectUser = async (user: User) => {
        setView('user_details');
        setViewingUser(user);
        setChatsForUserLoading(true);
        
        const userChatsRef = ref(db, `user-chats/${user.uid}`);
        const snapshot = await get(userChatsRef);
        let chatsData: Chat[] = [];
        if (snapshot.exists()) {
            const chatIds = Object.keys(snapshot.val());
            const chatPromises = chatIds.map(id => get(ref(db, `chats/${id}`)));
            const chatSnaps = await Promise.all(chatPromises);
            chatsData = chatSnaps
                .filter(s => s.exists())
                .map(s => ({ id: s.key, ...s.val() }) as Chat)
                .sort((a,b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
        }
        setViewingUserChats(chatsData);
        setChatsForUserLoading(false);
    };


    const handleSelectChat = (chat: Chat) => {
        setViewingChat(chat);
        setView('chat_details');
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        setViewingUser(null);
        setViewingChat(null);
    };
    
    const renderDashboard = () => (
        <>
            <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-around flex-wrap">
                <TabButton icon={<ChartBarIcon />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <TabButton icon={<UserGroupIcon />} label="Users" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                <TabButton icon={<ChatBubbleIcon />} label="Groups" isActive={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
                <TabButton icon={<PaymentsIcon />} label="Payments" isActive={activeTab === 'payments'} onClick={() => setActiveTab('payments')} notificationCount={pendingPaymentCount} />
                <TabButton icon={<HelpIcon />} label="Support" isActive={activeTab === 'support'} onClick={() => setActiveTab('support')} notificationCount={unreadSupportCount} />
                <TabButton icon={<CogIcon />} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'dashboard' && <DashboardView users={[]} chats={allChats} onNavigate={setView} />}
                {activeTab === 'users' && <UserListView onSelect={handleSelectUser} />}
                {activeTab === 'groups' && <ItemListView items={allChats} displayKey="name" onSelect={handleSelectChat} placeholder="Search groups & channels by name..." />}
                {activeTab === 'payments' && <PaymentsView currentUser={currentUser}/>}
                {activeTab === 'support' && <SupportView />}
                {activeTab === 'settings' && <GlobalSettings chats={allChats} />}
            </div>
        </>
    );

    let currentView;
    let headerTitle = "Admin Panel";
    let onHeaderBack = onBack;

    switch (view) {
        case 'user_details':
            currentView = viewingUser && <UserDetailsView 
                user={viewingUser} 
                userChats={viewingUserChats} 
                chatsLoading={chatsForUserLoading}
                onBack={handleBackToDashboard} 
                onViewAllChats={() => setView('user_chats_list')}
            />;
            headerTitle = viewingUser?.displayName || "User Details";
            onHeaderBack = handleBackToDashboard;
            break;
        case 'user_chats_list':
            currentView = viewingUser && <UserChatsListView chats={viewingUserChats} viewedUser={viewingUser} />;
            headerTitle = viewingUser ? `${viewingUser.displayName}'s Chats` : "User Chats";
            onHeaderBack = () => setView('user_details');
            break;
        case 'chat_details':
            currentView = viewingChat && <ChatDetailsView chat={viewingChat} onBack={handleBackToDashboard} members={[]} />;
            headerTitle = viewingChat?.name || "Chat Details";
            onHeaderBack = handleBackToDashboard;
            break;
        case 'premium_settings':
            const mergedPremiumSettings: PremiumScreenSettings = {
                ...defaultPremiumScreenSettings,
                ...(globalSettings?.premiumScreen || {}),
                headerImage: {
                    ...defaultPremiumScreenSettings.headerImage!,
                    ...globalSettings?.premiumScreen?.headerImage,
                },
                plans: globalSettings?.premiumScreen?.plans || defaultPremiumScreenSettings.plans,
                features: globalSettings?.premiumScreen?.features || defaultPremiumScreenSettings.features,
            };
    
            const mergedPaymentSettings: PaymentSettings = {
                ...defaultPaymentSettings,
                ...(globalSettings?.paymentSettings || {}),
            };

            currentView = globalSettings !== null ? <PremiumSettingsEditor 
                initialSettings={{ premiumScreen: mergedPremiumSettings, paymentSettings: mergedPaymentSettings }}
                onSave={async (newSettings) => {
                    await update(ref(db, 'settings/global'), {
                        premiumScreen: newSettings.premiumScreen,
                        paymentSettings: newSettings.paymentSettings,
                    });
                }}
                onBack={handleBackToDashboard} 
            /> : <div>Loading settings...</div>;
            headerTitle = "Premium Page Settings";
            onHeaderBack = handleBackToDashboard;
            break;
        default:
            currentView = renderDashboard();
            headerTitle = "Admin Panel";
            onHeaderBack = onBack;
            break;
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-[#1e1e1e] text-black dark:text-white">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-[#1e1e1e] sticky top-0 z-10">
                 <button onClick={onHeaderBack} className="mr-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold truncate">{headerTitle}</h1>
            </header>
            <div className="flex-1 overflow-y-auto">
                {(chatsLoading) ? <div className="text-center p-8">Loading...</div> : currentView}
            </div>
        </div>
    );
};


const UserListView: React.FC<{ onSelect: (user: User) => void }> = ({ onSelect }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [lastUserKey, setLastUserKey] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'online' | 'blocked' | 'admins' | 'premium'>('all');
    const USERS_PER_PAGE = 20;

    const fetchUsers = async (startAfterKey: string | null = null) => {
        setLoading(true);
        const usersRef = ref(db, 'users');
        const q = startAfterKey 
            ? query(usersRef, orderByKey(), startAt(startAfterKey), limitToFirst(USERS_PER_PAGE + 1))
            : query(usersRef, orderByKey(), limitToFirst(USERS_PER_PAGE));

        const snapshot = await get(q);
        const fetchedUsers: User[] = [];
        let newLastKey = null;

        if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
                // The query includes the startAt key, so we skip it on subsequent fetches
                if (childSnap.key !== startAfterKey) {
                    fetchedUsers.push({ uid: childSnap.key, ...childSnap.val() });
                }
                newLastKey = childSnap.key;
            });

            if (fetchedUsers.length > USERS_PER_PAGE) {
                // We fetched one extra to check if there are more
                fetchedUsers.pop(); 
                setHasMore(true);
            } else {
                setHasMore(false);
            }
        } else {
            setHasMore(false);
        }

        setUsers(prev => startAfterKey ? [...prev, ...fetchedUsers] : fetchedUsers);
        setLastUserKey(newLastKey);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers(null);
    }, []);

    const filteredAndSearchedUsers = React.useMemo(() => {
        return users
            .filter(user => {
                if (filter === 'online') return user.isOnline;
                if (filter === 'blocked') return user.status === 0;
                if (filter === 'admins') return user.isAdmin;
                if (filter === 'premium') return user.isPremium;
                return true;
            })
            .filter(user =>
                (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.handle && user.handle.toLowerCase().includes(searchTerm.toLowerCase()))
            );
    }, [users, filter, searchTerm]);
    
    const FilterButton: React.FC<{ value: typeof filter, label: string }> = ({ value, label }) => (
        <button onClick={() => setFilter(value)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${filter === value ? 'bg-[var(--theme-color-primary)] text-[var(--theme-text-color)]' : 'bg-gray-200 dark:bg-[#2f2f2f] text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4a4a]'}`}>
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 space-y-2 border-b border-gray-200 dark:border-gray-800">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by name or @handle..."
                    className="w-full px-4 py-2 bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
                <div className="flex space-x-2 overflow-x-auto pb-1">
                    <FilterButton value="all" label="All" />
                    <FilterButton value="online" label="Online" />
                    <FilterButton value="blocked" label="Blocked" />
                    <FilterButton value="admins" label="Admins" />
                    <FilterButton value="premium" label="Premium" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredAndSearchedUsers.map(user => (
                    <div key={user.uid} onClick={() => onSelect(user)} className="flex items-center p-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer border-b border-gray-200 dark:border-gray-800">
                        <Avatar photoURL={user.photoURL} name={user.displayName} sizeClass="w-12 h-12 mr-3" />
                        <div className="min-w-0">
                            <p className="font-semibold truncate flex items-center">
                                {user.displayName || '(No Name)'}
                                {user.isOnline && <span className="ml-2 w-2.5 h-2.5 bg-green-500 rounded-full" title="Online"></span>}
                                {user.status === 0 && <span className="ml-2 w-2.5 h-2.5 bg-red-500 rounded-full" title="Blocked"></span>}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                        </div>
                    </div>
                ))}
                {loading && <p className="text-center text-gray-500 p-4">Loading...</p>}
                {!loading && hasMore && (
                    <div className="p-4">
                        <button onClick={() => fetchUsers(lastUserKey)} className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold">
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;