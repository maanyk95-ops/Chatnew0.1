
import React, { useState } from 'react';
import type { User } from '../types';
import { countries } from '../utils/countries';

interface NewContactScreenProps {
    currentUser: User;
    onBack: () => void;
}

export const NewContactScreen: React.FC<NewContactScreenProps> = ({ currentUser, onBack }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim()) {
            setError('First name is required.');
            return;
        }
        if (!countryCode) {
            setError('Please select a country code.');
            return;
        }
        const rawPhoneNumber = phoneNumber.replace(/\s/g, '');
        if (!rawPhoneNumber.trim()) {
            setError('Please enter a valid phone number.');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const fullPhoneNumber = `${countryCode}${rawPhoneNumber}`;
            const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${firstName} ${lastName}
N:${lastName};${firstName};;;
TEL;TYPE=CELL:${fullPhoneNumber}
END:VCARD`;

            // This is a placeholder. In a real app, you would use a contacts API
            // or save this to the user's device. For now, we'll just log it.
            console.log("VCard created:", vCard);
            alert(`Contact "${firstName} ${lastName}" created! (Check console for vCard)`);
            
            // Reset form
            setFirstName('');
            setLastName('');
            setCountryCode('');
            setPhoneNumber('');
            onBack();

        } catch (err) {
            setError('Failed to create contact.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-30 flex items-end" onClick={onBack}>
            <style>{`
                @keyframes slide-up-contact {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up-contact { animation: slide-up-contact 0.3s ease-out forwards; }
            `}</style>
            <div 
                className="w-full max-w-md h-[90vh] bg-white dark:bg-[#1e1e1e] rounded-t-2xl flex flex-col animate-slide-up-contact"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
                    <button onClick={onBack} className="p-2 font-semibold text-blue-500 dark:text-blue-400">Cancel</button>
                    <h1 className="font-bold text-lg text-black dark:text-white">New Contact</h1>
                    <button type="submit" form="new-contact-form" disabled={loading} className="p-2 font-bold text-blue-500 dark:text-blue-400 disabled:text-gray-500">
                        {loading ? '...' : 'Create'}
                    </button>
                </header>
                <form id="new-contact-form" onSubmit={handleCreateContact} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </div>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        required
                        className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                     <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                    <div className="flex space-x-2">
                        <select 
                            value={countryCode} 
                            onChange={e => setCountryCode(e.target.value)}
                            required
                            className="bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                        >
                            <option value="" disabled>Country</option>
                            {countries.map(c => <option key={c.code} value={c.dial_code}>{c.emoji} {c.dial_code}</option>)}
                        </select>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Phone Number"
                            required
                            className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};
