import React, { useState } from 'react';
import { db } from '../services/firebase';
import { ref, set, push, update } from 'firebase/database';
import { uploadImage } from '../services/imageUploader';
import type { User, Sticker, StickerPack } from '../types';

interface CreateStickerPackScreenProps {
    currentUser: User;
    onBack: () => void;
}

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;

const CreateStickerPackScreen: React.FC<CreateStickerPackScreenProps> = ({ currentUser, onBack }) => {
    const [packName, setPackName] = useState('');
    const [uploadedStickers, setUploadedStickers] = useState<Sticker[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setError('');
        
        try {
            const uploadPromises: Promise<string>[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (file) {
                    uploadPromises.push(uploadImage(file));
                }
            }
            const urls = await Promise.all(uploadPromises);
            const newStickers = urls.map(url => ({ id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2)}`, url }));
            setUploadedStickers(prev => [...prev, ...newStickers]);
        } catch (err) {
            console.error(err);
            setError('Some images failed to upload.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSavePack = async () => {
        if (!packName.trim()) {
            setError('Please enter a pack name.');
            return;
        }
        if (uploadedStickers.length === 0) {
            setError('Please upload at least one sticker.');
            return;
        }
        
        setIsSaving(true);
        setError('');
        
        try {
            const newPackRef = push(ref(db, 'sticker_packs/user-created'));
            const newPackId = newPackRef.key;
            if (!newPackId) throw new Error("Could not generate pack ID");

            const stickersObject = uploadedStickers.reduce((acc, sticker) => {
                acc[sticker.id] = sticker;
                return acc;
            }, {} as { [stickerId: string]: Sticker });

            const newPackData: Omit<StickerPack, 'id'> = {
                name: packName,
                ownerId: currentUser.uid,
                ownerInfo: {
                    displayName: currentUser.displayName || 'Unknown',
                    handle: currentUser.handle || 'unknown'
                },
                isPublic: false, // All packs start as private
                coverStickerUrl: uploadedStickers[0].url,
                stickers: stickersObject
            };
            
            const updates: { [key: string]: any } = {};
            updates[`/sticker_packs/user-created/${newPackId}`] = newPackData;
            updates[`/users/${currentUser.uid}/stickerPacks/${newPackId}`] = true;
            
            await update(ref(db), updates);
            onBack();

        } catch (err) {
            console.error(err);
            setError('Failed to save sticker pack.');
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUploading || isSaving;

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <header className="flex items-center justify-between p-3 border-b border-gray-800 flex-shrink-0 bg-black sticky top-0 z-10">
                <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10" disabled={isLoading}>
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold">Create Sticker Pack</h1>
                <button
                    onClick={handleSavePack}
                    disabled={isLoading}
                    className="font-bold text-[var(--theme-color, #facc15)] disabled:text-gray-500"
                >
                    Save
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label htmlFor="packName" className="block text-sm font-medium text-gray-300 mb-1">Pack Name</label>
                    <input
                      id="packName"
                      type="text"
                      value={packName}
                      onChange={(e) => setPackName(e.target.value)}
                      placeholder="My Awesome Stickers"
                      className="w-full px-4 py-3 bg-[#2f2f2f] border border-gray-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color, #facc15)]"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Stickers ({uploadedStickers.length}/50)</label>
                    <div className="grid grid-cols-4 gap-4 p-4 bg-[#1e1e1e] rounded-lg min-h-[10rem]">
                        {uploadedStickers.map(sticker => (
                            <div key={sticker.id} className="aspect-square bg-white/5 rounded-lg p-1">
                                <img src={sticker.url} className="w-full h-full object-contain"/>
                            </div>
                        ))}
                        {isUploading && (
                             <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>

                <label className="w-full flex items-center justify-center p-3 bg-[#2f2f2f] rounded-lg text-white font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                    <span>Upload Stickers</span>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/gif, image/png, image/jpeg" 
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </label>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                {isSaving && <p className="text-center text-gray-400">Saving pack...</p>}
            </div>
        </div>
    );
};

export default CreateStickerPackScreen;
