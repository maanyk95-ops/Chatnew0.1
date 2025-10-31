import React, { useState, useEffect } from 'react';
import type { User, StickerPack, Sticker } from '../types';
import { db } from '../services/firebase';
import { ref, onValue, get, off } from 'firebase/database';

interface EmojiPickerProps {
    currentUser: User;
    onClose: () => void;
    onSelectEmoji: (emoji: string) => void;
    onSelectSticker: (url: string, packId: string) => void;
    onSelectGif: (url: string) => void;
    onNavigate: (view: string) => void;
}

// Data
const emojiCategories = {
    'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
    'Animals & Nature': ['🙈', '🙉', '🙊', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠'],
    'Food & Drink': ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '𫑑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '𫓓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🥙', '🧆', '🌮', '🌯', '𫔮', '🥗', '🥘', '𫕕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🥠', '🥮'],
};

const TENOR_API_KEY = 'LIVDSRZULELA'; // Public key for Tenor

const GifTabContent: React.FC<{ onSelectGif: (url: string) => void }> = ({ onSelectGif }) => {
    const [gifs, setGifs] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGifs = async () => {
            setLoading(true);
            setError(null);
            const url = query
                ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=50&media_filter=minimal`
                : `https://g.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=50&media_filter=minimal`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const data = await response.json();
                setGifs(data.results || []);
            } catch (error) {
                console.error("Failed to fetch GIFs", error);
                setError("Could not load GIFs. Please check your connection and try again.");
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(() => {
            fetchGifs();
        }, 300);

        return () => clearTimeout(debounce);
    }, [query]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for GIFs"
                    className="w-full px-4 py-2 bg-[#2f2f2f] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color, #facc15)]"
                />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center h-full text-center text-red-400 p-4">
                        {error}
                    </div>
                ) : gifs.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1">
                        {gifs.map(gif => (
                            <button key={gif.id} onClick={() => onSelectGif(gif.media[0].gif.url)} className="bg-white/5 rounded-lg hover:bg-white/10 aspect-square">
                                <img src={gif.media[0].tinygif.url} alt={gif.content_description} className="w-full h-full object-cover rounded-lg"/>
                            </button>
                        ))}
                    </div>
                ) : (
                     <div className="flex justify-center items-center h-full text-center text-gray-400 p-4">
                        {query ? `No GIFs found for "${query}"` : "Couldn't load trending GIFs."}
                    </div>
                )}
            </div>
        </div>
    );
};

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;

const StickerTabContent: React.FC<{ 
    onSelectSticker: (url: string, packId: string) => void, 
    currentUser: User,
    onNavigate: (view: string) => void,
    onClose: () => void,
}> = ({ onSelectSticker, currentUser, onNavigate, onClose }) => {
    const [userPacks, setUserPacks] = useState<StickerPack[]>([]);
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStickerPacksRef = ref(db, `users/${currentUser.uid}/stickerPacks`);
        const listener = onValue(userStickerPacksRef, async (snapshot) => {
            if (!snapshot.exists()) {
                setUserPacks([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const packIds = Object.keys(snapshot.val());
            const packPromises = packIds.map(async (packId) => {
                let packSnap = await get(ref(db, `sticker_packs/pre-made/${packId}`));
                if (!packSnap.exists()) {
                    packSnap = await get(ref(db, `sticker_packs/user-created/${packId}`));
                }
                return packSnap.exists() ? { id: packSnap.key, ...packSnap.val() } as StickerPack : null;
            });
            
            const packs = (await Promise.all(packPromises)).filter(p => p !== null) as StickerPack[];
            setUserPacks(packs);
            if (packs.length > 0 && !selectedPackId) {
                setSelectedPackId(packs[0].id);
            } else if (packs.length === 0) {
                setSelectedPackId(null);
            }
            setLoading(false);
        });

        return () => off(userStickerPacksRef, 'value', listener);
    }, [currentUser.uid, selectedPackId]);

    const selectedPack = userPacks.find(p => p.id === selectedPackId);
    
    if (loading) return <div className="p-4 text-center text-gray-400">Loading stickers...</div>;
    if (userPacks.length === 0) {
        return (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 text-gray-400">
                <p className="mb-4">You have no sticker packs.</p>
                <button
                    onClick={() => { onNavigate('sticker_store'); onClose(); }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold bg-[var(--theme-color)] text-[var(--theme-text-color)]"
                >
                    <PlusIcon />
                    <span>Add Stickers</span>
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
                {selectedPack && (
                    <div className="grid grid-cols-4 gap-4">
                        {Object.values(selectedPack.stickers).map((sticker: Sticker) => (
                            <button key={sticker.id} onClick={() => onSelectSticker(sticker.url, selectedPack.id)} className="bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors aspect-square">
                                <img src={sticker.url} alt="sticker" className="w-full h-full object-contain"/>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 p-2 border-t border-gray-700 bg-black/20">
                <div className="flex space-x-2">
                     <button 
                        onClick={() => { onNavigate('sticker_store'); onClose(); }} 
                        className="w-12 h-12 p-1 rounded-lg bg-white/5 hover:bg-white/10 flex-shrink-0 flex items-center justify-center"
                        aria-label="Go to Sticker Store"
                    >
                        <PlusIcon />
                    </button>
                    <div className="flex-1 flex space-x-2 overflow-x-auto">
                        {userPacks.map(pack => (
                            <button key={pack.id} onClick={() => setSelectedPackId(pack.id)} className={`w-12 h-12 p-1 rounded-lg transition-colors flex-shrink-0 ${selectedPackId === pack.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
                                <img src={pack.coverStickerUrl} alt={pack.name} className="w-full h-full object-contain" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PickerTabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`p-3 rounded-lg transition-colors w-full flex items-center justify-center ${active ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        {children}
    </button>
);

const EmojiPicker: React.FC<EmojiPickerProps> = ({ currentUser, onClose, onSelectEmoji, onSelectSticker, onSelectGif, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji');

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
            <style>{`
                @keyframes slide-up-picker {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up-picker { animation: slide-up-picker 0.3s ease-out forwards; }
            `}</style>
            <div
                className="w-full max-w-md h-[60%] bg-[#1e1e1e] rounded-t-2xl flex flex-col animate-slide-up-picker"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'emoji' && (
                        <div>
                            {Object.entries(emojiCategories).map(([category, emojis]) => (
                                <div key={category} className="p-2">
                                    <p className="text-sm font-bold text-gray-400 mb-2 px-2">{category}</p>
                                    <div className="grid grid-cols-8 gap-1">
                                        {emojis.map(emoji => (
                                            <button 
                                                key={emoji} 
                                                onClick={() => onSelectEmoji(emoji)}
                                                className="text-3xl p-1.5 rounded-lg hover:bg-white/10"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'gif' && <GifTabContent onSelectGif={onSelectGif} />}
                    {activeTab === 'sticker' && <StickerTabContent onSelectSticker={onSelectSticker} currentUser={currentUser} onNavigate={onNavigate} onClose={onClose} />}
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 border-t border-gray-700 bg-[#2f2f2f] rounded-b-t-lg">
                    <PickerTabButton active={activeTab === 'emoji'} onClick={() => setActiveTab('emoji')}>
                        <span className="text-2xl">😀</span>
                    </PickerTabButton>
                    <PickerTabButton active={activeTab === 'gif'} onClick={() => setActiveTab('gif')}>
                        <span className="font-bold text-xl text-gray-300">GIF</span>
                    </PickerTabButton>
                     <PickerTabButton active={activeTab === 'sticker'} onClick={() => setActiveTab('sticker')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </PickerTabButton>
                </div>
            </div>
        </div>
    );
};

export default EmojiPicker;