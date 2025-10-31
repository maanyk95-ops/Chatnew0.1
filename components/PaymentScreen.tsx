import React, { useState, useRef } from 'react';
import { db } from '../services/firebase';
import { ref, push, update, serverTimestamp } from 'firebase/database';
import type { User, PremiumPlan, PaymentSettings } from '../types';
import { uploadImage } from '../services/imageUploader';

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


interface PaymentScreenProps {
    currentUser: User;
    plan: PremiumPlan;
    settings: PaymentSettings;
    onBack: () => void;
    onTriggerToast: (message: string) => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ currentUser, plan, settings, onBack, onTriggerToast }) => {
    const [transactionId, setTransactionId] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshotFile(file);
            setScreenshotPreview(URL.createObjectURL(file));
        }
    };

    const handleCopy = (value: string) => {
        navigator.clipboard.writeText(value);
        onTriggerToast('Copied to clipboard!');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId.trim()) {
            setError('Please enter a valid Transaction ID.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            let screenshotUrl: string | undefined = undefined;
            if (screenshotFile) {
                screenshotUrl = await uploadImage(screenshotFile);
            }

            const newRequestRef = push(ref(db, 'paymentRequests'));
            const newRequestId = newRequestRef.key;
            if (!newRequestId) throw new Error("Could not create request ID.");

            const submittedData: { transactionId: string, screenshotUrl?: string } = {
                transactionId: transactionId.trim(),
            };
    
            if (screenshotUrl) {
                submittedData.screenshotUrl = screenshotUrl;
            }

            const requestData = {
                userId: currentUser.uid,
                userInfo: {
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    handle: currentUser.handle,
                },
                plan: plan,
                submittedData: submittedData,
                submittedAt: serverTimestamp(),
                status: 'pending',
            };

            const updates: { [key: string]: any } = {};
            updates[`/paymentRequests/${newRequestId}`] = requestData;
            updates[`/users/${currentUser.uid}/paymentRequestStatus`] = 'pending';
            updates[`/users/${currentUser.uid}/paymentRequestId`] = newRequestId;
            
            await update(ref(db), updates);

            onTriggerToast('Your request has been submitted!');
            onBack();

        } catch (err: any) {
            setError(err.message || 'Failed to submit request. Please try again.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-black dark:text-white">
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScreenshotChange} />
            <header className="flex items-center p-3 flex-shrink-0 z-10 border-b border-gray-200 dark:border-gray-800">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold ml-4">Complete Payment</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-md mb-6">
                    <h2 className="font-bold text-lg">You are purchasing:</h2>
                    <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{plan.name} Plan</span>
                        <span className="font-bold text-xl text-[var(--theme-color-primary)]">{plan.priceCurrency}{plan.priceValue}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg mb-2">Payment Details</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{settings.instructions}</p>
                    
                    {settings.qrCodeUrl && (
                        <div className="flex justify-center my-4">
                            <img src={settings.qrCodeUrl} alt="Payment QR Code" className="w-48 h-48 rounded-lg bg-white p-2" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {settings.fields.map(field => (
                            <div key={field.id} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{field.label}</p>
                                    <p className="font-mono font-semibold break-all">{field.value}</p>
                                </div>
                                <button onClick={() => handleCopy(field.value)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/20 ml-2">
                                    <CopyIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6">
                     <h3 className="font-bold text-lg mb-2">Submit Your Details</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">After completing the payment, enter the required details below.</p>
                     
                     {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4 text-center">{error}</p>}

                     <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                        required
                        className="w-full px-4 py-3 bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                    
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-300">
                        <UploadIcon />
                        <span>Attach Screenshot (Optional)</span>
                    </button>
                    {screenshotPreview && <img src={screenshotPreview} alt="Screenshot preview" className="mt-2 rounded-lg max-h-40 mx-auto" />}

                    <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg shadow-lg shadow-[var(--theme-color-primary)]/20 hover:opacity-90 transition-all duration-300 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                        {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PaymentScreen;