// FIX: Add missing useRef import from React.
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { ref, get, set, query, orderByChild, startAt, endAt, update, onValue, off, remove, serverTimestamp, limitToLast, endBefore, push } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { AppSettings, User, Chat, Message, CustomElement, ElementStyle, ThemeColors, ThemedAsset, ThemedCustomElement } from '../types';
import { ChatType } from '../types';
import Avatar from './Avatar';

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
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;


interface AdminPanelProps {
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

const GlobalSettingsView: React.FC = () => {
    const [settings, setSettings] = useState<Partial<AppSettings>>({});
    const [logoGallery, setLogoGallery] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [logoUploading, setLogoUploading] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            <div className="flex items-center justify-between">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-500">
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
                {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
            </div>

            <CollapsibleSection title="General">
                <label className="block font-semibold">App Name</label>
                <input value={settings.appName || ''} onChange={e => setSettings(s => ({ ...s, appName: e.target.value }))} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1" />
                <div className="flex items-center justify-between mt-2">
                    <label className="font-semibold">Hide Login Logo</label>
                    <Toggle checked={!!settings.hideLoginLogo} onChange={checked => setSettings(s => ({ ...s, hideLoginLogo: checked }))} />
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
        </div>
    );
};

const TabButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center p-2 rounded-lg transition-colors w-24 ${isActive ? 'text-[var(--theme-color-primary)] bg-black/5 dark:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
        {icon}
        <span className="text-xs font-semibold mt-1">{label}</span>
    </button>
);

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

const UserDetailsView: React.FC<{ user: User, onBack: () => void, onSelectChat: (chat: Chat) => void }> = ({ user, onBack, onSelectChat }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
    const [userChats, setUserChats] = useState<Chat[]>([]);

    useEffect(() => {
        const fetchUserChats = async () => {
            const userChatsRef = ref(db, `user-chats/${user.uid}`);
            const snapshot = await get(userChatsRef);
            if(snapshot.exists()){
                const chatIds = Object.keys(snapshot.val());
                const chatPromises = chatIds.map(id => get(ref(db, `chats/${id}`)));
                const chatSnaps = await Promise.all(chatPromises);
                const chatsData = chatSnaps.filter(s => s.exists()).map(s => ({id: s.key, ...s.val()}) as Chat);
                setUserChats(chatsData);
            }
        }
        fetchUserChats();
    }, [user.uid]);

    const handleSave = async () => {
        setIsSaving(true);
        await update(ref(db, `users/${user.uid}`), {
            displayName: editedUser.displayName,
            handle: editedUser.handle,
            bio: editedUser.bio,
            isAdmin: editedUser.isAdmin
        });
        setIsSaving(false);
        setIsEditing(false);
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


    return (
        <div className="p-4 space-y-4">
            {showClearConfirm && <ConfirmationModal title="Clear User's Chats?" message={`This will clear chat history for ${user.displayName} only. Other participants will not be affected.`} onConfirm={handleClearChats} onCancel={() => setShowClearConfirm(false)} confirmText="Clear Chats" />}
            {showDeleteUserConfirm && <ConfirmationModal title="Delete User Data?" message={`This will permanently delete all data for ${user.displayName} (profile, chat memberships, etc.) but not their login account. On next login, they will be forced to create a new profile. This cannot be undone.`} onConfirm={handleDeleteUser} onCancel={() => setShowDeleteUserConfirm(false)} confirmText="Delete User Data" />}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{isEditing ? "Edit User" : "User Details"}</h2>
                {isEditing ? (
                    <button onClick={handleSave} disabled={isSaving} className="font-semibold text-blue-500 dark:text-blue-400">{isSaving ? 'Saving...' : 'Save'}</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="font-semibold text-blue-500 dark:text-blue-400">Edit</button>
                )}
            </div>
            <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg space-y-3">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>UID:</strong> {user.uid}</p>
                <div><strong>Name:</strong> {isEditing ? <input value={editedUser.displayName || ''} onChange={e => setEditedUser({...editedUser, displayName: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2"/> : user.displayName}</div>
                <div><strong>Handle:</strong> {isEditing ? <input value={editedUser.handle || ''} onChange={e => setEditedUser({...editedUser, handle: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2"/> : `@${user.handle}`}</div>
                <div><strong>Bio:</strong> {isEditing ? <textarea value={editedUser.bio || ''} onChange={e => setEditedUser({...editedUser, bio: e.target.value})} className="bg-gray-200 dark:bg-gray-700 p-1 rounded ml-2 w-full"/> : user.bio || 'N/A'}</div>
                <div className="flex items-center"><strong>Admin:</strong> {isEditing ? <input type="checkbox" checked={!!editedUser.isAdmin} onChange={e => setEditedUser({...editedUser, isAdmin: e.target.checked})} className="ml-2 h-5 w-5"/> : (user.isAdmin ? 'Yes' : 'No')}</div>
            </div>

            <h3 className="text-lg font-semibold pt-4">User Chats ({userChats.length})</h3>
            <div className="bg-white dark:bg-[#2f2f2f] p-2 rounded-lg max-h-48 overflow-y-auto">
                {userChats.map(chat => <p key={chat.id} onClick={() => onSelectChat(chat)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">{chat.name || 'Private Chat'}</p>)}
            </div>
            <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                 <h3 className="text-lg font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</h3>
                <div className="space-y-2">
                    <button onClick={() => setShowClearConfirm(true)} className="w-full text-left p-3 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg font-semibold text-white">Clear All Chats for this User</button>
                    <button onClick={() => setShowDeleteUserConfirm(true)} className="w-full text-left p-3 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold text-white">Delete User and Data</button>
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

    const loadMessages = async (endBeforeTimestamp?: number) => {
        // FIX: Corrected usage of `endBefore`. It should only take a value when ordering by child.
        const messagesQuery = endBeforeTimestamp
            ? query(ref(db, `messages/${chat.id}`), orderByChild('timestamp'), endBefore(endBeforeTimestamp), limitToLast(30))
            : query(ref(db, `messages/${chat.id}`), orderByChild('timestamp'), limitToLast(30));
        
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
            setMessages(initialMessages);
            setLoading(false);
            if (messageContainerRef.current) {
                messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
            }
        });
    }, [chat.id]);
    
    const handleLoadMore = async () => {
        if (!hasMore || isFetchingOlder || messages.length === 0) return;
        setIsFetchingOlder(true);
        const oldestTimestamp = messages[0].timestamp;
        const olderMessages = await loadMessages(oldestTimestamp);
        setMessages(prev => [...olderMessages, ...prev]);
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
    return <GlobalSettingsView />;
};

const DashboardView: React.FC<{ users: User[], chats: Chat[] }> = ({ users, chats }) => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isOnline).length;
    const groups = chats.filter(c => c.type === ChatType.Group);
    const channels = chats.filter(c => c.type === ChatType.Channel);
    
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
            <StatCard label="Total Users" value={totalUsers} icon={<UserGroupIcon />} />
            <StatCard label="Active Users" value={activeUsers} icon={<ActiveUserIcon />} />
            <StatCard label="Groups" value={groups.length} icon={<ChatBubbleIcon />} />
            <StatCard label="Channels" value={channels.length} icon={<ChannelIcon />} />
        </div>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    type View = 'dashboard' | 'user_details' | 'chat_details';
    const [view, setView] = useState<View>('dashboard');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'groups' | 'settings'>('dashboard');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [viewingChat, setViewingChat] = useState<Chat | null>(null);

    useEffect(() => {
        const usersRef = ref(db, 'users');
        const chatsRef = ref(db, 'chats');

        const usersListener = onValue(usersRef, (snapshot) => {
            const usersObject: Record<string, User> | null = snapshot.val();
            if (snapshot.exists() && usersObject) {
                const usersData = Object.values(usersObject);
                setAllUsers(usersData);
            } else {
                setAllUsers([]);
            }
            setLoading(false);
        });

        const chatsListener = onValue(chatsRef, (snapshot) => {
            const chatsObject: Record<string, Omit<Chat, 'id'>> | null = snapshot.val();
            if (snapshot.exists() && chatsObject) {
                const chatsData = Object.entries(chatsObject).map(([id, data]) => ({ id, ...data }));
                setAllChats(chatsData as Chat[]);
            } else {
                setAllChats([]);
            }
            setLoading(false);
        });

        return () => {
            off(usersRef, 'value', usersListener);
            off(chatsRef, 'value', chatsListener);
        };
    }, []);

    const handleSelectUser = (user: User) => {
        setViewingUser(user);
        setView('user_details');
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
            <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-around">
                <TabButton icon={<ChartBarIcon />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <TabButton icon={<UserGroupIcon />} label="Users" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                <TabButton icon={<ChatBubbleIcon />} label="Groups" isActive={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
                <TabButton icon={<CogIcon />} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'dashboard' && <DashboardView users={allUsers} chats={allChats} />}
                {activeTab === 'users' && <ItemListView items={allUsers} displayKey="displayName" subDisplayKey="handle" onSelect={handleSelectUser} placeholder="Search users by name or @handle..." />}
                {activeTab === 'groups' && <ItemListView items={allChats} displayKey="name" onSelect={handleSelectChat} placeholder="Search groups & channels by name..." />}
                {activeTab === 'settings' && <GlobalSettings chats={allChats} />}
            </div>
        </>
    );

    let currentView;
    let headerTitle = "Admin Panel";
    switch (view) {
        case 'user_details':
            currentView = viewingUser && <UserDetailsView user={viewingUser} onBack={handleBackToDashboard} onSelectChat={handleSelectChat}/>;
            headerTitle = viewingUser?.displayName || "User Details";
            break;
        case 'chat_details':
            currentView = viewingChat && <ChatDetailsView chat={viewingChat} onBack={handleBackToDashboard} members={allUsers} />;
            headerTitle = viewingChat?.name || "Chat Details";
            break;
        default:
            currentView = renderDashboard();
            headerTitle = "Admin Panel";
            break;
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-[#1e1e1e] text-black dark:text-white">
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-[#1e1e1e] sticky top-0 z-10">
                 <button onClick={view === 'dashboard' ? onBack : handleBackToDashboard} className="mr-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold truncate">{headerTitle}</h1>
            </header>
            {loading ? <div className="text-center p-8">Loading...</div> : currentView}
        </div>
    );
};

export default AdminPanel;