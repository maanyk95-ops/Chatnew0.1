import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, off, remove, get } from 'firebase/database';
import type { User, StickerPack } from '../types';
import StickerPackDetailScreen from './StickerPackDetailScreen';

interface StickerStoreScreenProps {
    currentUser: User;
    onBack: () => void;
    onNavigate: (view: string, payload?: any) => void;
}

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;


const StickerStoreScreen: React.FC<StickerStoreScreenProps> = ({ currentUser, onBack, onNavigate }) => {
    const [preMadePacks, setPreMadePacks] = useState<StickerPack[]>([]);
    const [userPackIds, setUserPackIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [viewingPackId, setViewingPackId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<StickerPack | null>(null);

    useEffect(() => {
        // Fetch pre-made packs - REMOVED as per request to have an empty store
        setPreMadePacks([]);
        setLoading(false);

        // Fetch user's added pack IDs
        const userStickerPacksRef = ref(db, `users/${currentUser.uid}/stickerPacks`);
        const userPacksListener = onValue(userStickerPacksRef, (snapshot) => {
            setUserPackIds(new Set(Object.keys(snapshot.val() || {})));
        });

        return () => {
             off(userStickerPacksRef, 'value', userPacksListener);
        }
    }, [currentUser.uid]);

    const handleAddPack = async (packId: string) => {
        const userPackRef = ref(db, `users/${currentUser.uid}/stickerPacks/${packId}`);
        await set(userPackRef, true);
    };
    
    const handleDeletePack = async (pack: StickerPack) => {
        const preMadePackRef = ref(db, `sticker_packs/pre-made/${pack.id}`);
        await remove(preMadePackRef);
        setShowDeleteConfirm(null);
    };

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <header className="flex items-center p-3 border-b border-gray-800 flex-shrink-0 bg-black sticky top-0 z-10">
                 <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold">Sticker Store</h1>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4">
                <button 
                    onClick={() => onNavigate('create_sticker_pack')}
                    className="w-full flex items-center justify-center space-x-2 p-3 mb-6 bg-[#2f2f2f] rounded-lg text-white font-semibold hover:bg-white/10 transition-colors"
                >
                    <PlusIcon />
                    <span>Create New Pack</span>
                </button>

                <h2 className="text-lg font-bold text-gray-300 mb-4">Featured Packs</h2>
                {loading ? (
                    <p className="text-center text-gray-400">Loading...</p>
                ) : preMadePacks.length > 0 ? (
                    <div className="space-y-4">
                        {preMadePacks.map((pack) => {
                            const isAdded = userPackIds.has(pack.id);
                            return (
                                <div key={pack.id} className="flex items-center p-3 bg-[#1e1e1e] rounded-lg">
                                    <button onClick={() => setViewingPackId(pack.id)} className="flex-1 flex items-center min-w-0">
                                        <div className="w-16 h-16 mr-4 bg-white/10 rounded-lg p-1 flex-shrink-0">
                                            <img src={pack.coverStickerUrl} alt={pack.name} className="w-full h-full object-contain"/>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="font-semibold truncate">{pack.name}</p>
                                            <p className="text-sm text-gray-400">{Object.keys(pack.stickers).length} Stickers</p>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); !isAdded && handleAddPack(pack.id); }}
                                        disabled={isAdded}
                                        className="px-4 py-2 ml-2 rounded-full font-semibold text-sm transition-colors disabled:cursor-not-allowed flex-shrink-0"
                                        style={{ 
                                            backgroundColor: isAdded ? '#3a3a3a' : 'var(--theme-color)', 
                                            color: isAdded ? '#888888' : 'var(--theme-text-color)' 
                                        }}
                                    >
                                        {isAdded ? 'Added' : 'Add'}
                                    </button>
                                    {currentUser.isAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(pack); }}
                                            className="p-2 ml-1 rounded-full text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <DeleteIcon />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                     <p className="text-center text-gray-400 py-8">No public sticker packs available.</p>
                )}
            </div>

            {viewingPackId && (
                <StickerPackDetailScreen
                    currentUser={currentUser}
                    packId={viewingPackId}
                    onBack={() => setViewingPackId(null)}
                />
            )}
            
            {currentUser.isAdmin && showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-[#2a2a2a] rounded-lg w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
                        <h2 className="font-bold text-lg mb-2 text-white">Delete Sticker Pack?</h2>
                        <p className="text-gray-300 text-sm mb-4">
                           Are you sure you want to permanently delete the "{showDeleteConfirm.name}" pack? This cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10 font-semibold">
                                Cancel
                            </button>
                            <button onClick={() => handleDeletePack(showDeleteConfirm)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StickerStoreScreen;