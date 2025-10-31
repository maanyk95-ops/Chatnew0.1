import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, update, get, off } from 'firebase/database';
import type { User, StickerPack, Sticker } from '../types';

interface StickerPackDetailScreenProps {
    currentUser: User;
    packId: string;
    onBack: () => void;
    isBottomSheet?: boolean;
}

const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;

const StickerPackDetailScreen: React.FC<StickerPackDetailScreenProps> = ({ currentUser, packId, onBack, isBottomSheet = false }) => {
    const [pack, setPack] = useState<StickerPack | null>(null);
    const [isAdded, setIsAdded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!packId) return;

        const fetchPack = async () => {
            setLoading(true);
            let packData: StickerPack | null = null;
            let packSnap = await get(ref(db, `sticker_packs/pre-made/${packId}`));
            if (packSnap.exists()) {
                packData = { id: packSnap.key, ...packSnap.val() };
            } else {
                packSnap = await get(ref(db, `sticker_packs/user-created/${packId}`));
                if (packSnap.exists()) {
                    packData = { id: packSnap.key, ...packSnap.val() };
                }
            }
            
            if (packData) {
                setPack(packData);
            } else {
                setError('Sticker pack not found.');
            }
            setLoading(false);
        };
        
        fetchPack();

        const userPackRef = ref(db, `users/${currentUser.uid}/stickerPacks/${packId}`);
        const userPackListener = onValue(userPackRef, (snapshot) => {
            setIsAdded(snapshot.exists());
        });

        return () => {
            off(userPackRef, 'value', userPackListener);
        }

    }, [packId, currentUser.uid]);

    const handleAddPack = async () => {
        if (!pack) return;
        const userPackRef = ref(db, `users/${currentUser.uid}/stickerPacks/${pack.id}`);
        await set(userPackRef, true);
    };

    const handleRemovePack = async () => {
        if (!pack) return;
        const userPackRef = ref(db, `users/${currentUser.uid}/stickerPacks/${pack.id}`);
        await set(userPackRef, null);
    };

    const isOwner = pack?.ownerId === currentUser.uid;
    const stickerCount = pack ? Object.keys(pack.stickers).length : 0;
    
    const content = (
        <>
             <div className="p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex-1"></div> {/* Spacer */}
                    <div className="bg-[#2f2f2f] rounded-full px-4 py-2">
                        <h1 className="text-lg font-bold text-white text-center">{pack?.name || '...'}</h1>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <button className="p-2 rounded-full hover:bg-white/10">
                            <MoreVertIcon />
                        </button>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto p-4">
                    {loading && <p className="text-center text-gray-400">Loading...</p>}
                    {error && <p className="text-center text-red-400">{error}</p>}
                    
                    {pack && (
                        <div className="grid grid-cols-4 gap-4">
                            {Object.values(pack.stickers).map((sticker: Sticker) => (
                                <div key={sticker.id} className="aspect-square bg-white/5 rounded-lg p-1">
                                    <img src={sticker.url} className="w-full h-full object-contain"/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 flex-shrink-0">
                    {pack && (isAdded ? (
                        <button onClick={handleRemovePack} className="w-full p-3 rounded-lg font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                            Remove {stickerCount} Stickers
                        </button>
                    ) : (
                        <button onClick={handleAddPack} className="w-full p-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            Add {stickerCount} Stickers
                        </button>
                    ))}
                </div>
        </>
    )

    if (isBottomSheet) {
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onBack}>
                <style>{`
                    @keyframes slide-up-sticker-detail { from { transform: translateY(100%); } to { transform: translateY(0); } }
                    .animate-slide-up-sticker-detail { animation: slide-up-sticker-detail 0.3s ease-out forwards; }
                `}</style>
                <div
                    className="w-full max-w-md h-[70vh] bg-[#1e1e1e] rounded-t-2xl flex flex-col animate-slide-up-sticker-detail"
                    onClick={(e) => e.stopPropagation()}
                >
                   {content}
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black z-40 flex flex-col" onClick={onBack}>
            {content}
        </div>
    );
};

export default StickerPackDetailScreen;