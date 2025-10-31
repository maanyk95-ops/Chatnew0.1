import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { sendEmailVerification, signOut, User as FirebaseUser } from 'firebase/auth';
import type { User } from '../types';

interface EmailVerificationScreenProps {
    currentUser: User;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ currentUser }) => {
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const interval = setInterval(async () => {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                // The useAuth hook will detect the change in emailVerified and update the app state
            }
        }, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResendEmail = async () => {
        if (isResending || resendCooldown > 0 || !auth.currentUser) return;
        setIsResending(true);
        setError('');
        try {
            await sendEmailVerification(auth.currentUser);
            setResendCooldown(60); // 60 second cooldown
        } catch (err: any) {
            setError('Failed to send verification email. Please try again later.');
        } finally {
            setIsResending(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-white dark:bg-[#1e1e1e] text-black dark:text-white text-center">
            <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                A verification link has been sent to <span className="font-semibold text-[var(--theme-color-primary)]">{currentUser.email}</span>. Please check your inbox (and spam folder) to continue.
            </p>
            
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            
            <button 
                onClick={handleResendEmail} 
                disabled={isResending || resendCooldown > 0}
                className="w-full max-w-xs bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg shadow-lg shadow-[var(--theme-color-primary)]/20 hover:opacity-90 transition-all duration-300 disabled:bg-gray-200 dark:disabled:bg-[#2f2f2f] disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
            >
                {isResending ? 'Sending...' : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email')}
            </button>
            
            <button onClick={handleLogout} className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:underline">
                Use a different account
            </button>
        </div>
    );
};

export default EmailVerificationScreen;
