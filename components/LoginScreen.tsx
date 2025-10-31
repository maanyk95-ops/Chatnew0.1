import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { ref, set, get } from 'firebase/database';
import type { CustomElement, User } from '../types';
import { getStoredAccounts, AccountInfo } from '../hooks/useAuth';
import Avatar from './Avatar';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>;
const GoogleIcon = () => <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.41-11.054-7.962l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.471 36.928 48 30.825 48 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>;

const Logo = ({ logoUrl }: { logoUrl?: string }) => (
  <div className="w-20 h-20 bg-[var(--theme-color-primary)] rounded-full flex items-center justify-center mb-8 shadow-lg overflow-hidden">
     {logoUrl ? (
        <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
     ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
     )}
  </div>
);

const NameWithBadges: React.FC<{ user: Partial<AccountInfo> | null, textClass?: string }> = ({ user, textClass="font-semibold" }) => {
    if (!user) return null;
    return (
        <div className="flex items-center gap-1.5">
            <p className={`${textClass} truncate`}>{user.displayName}</p>
            {user.isPremium && user.profileBadgeUrl && (
                <img src={user.profileBadgeUrl} alt="badge" className="w-4 h-4 flex-shrink-0" title="Profile Badge" />
            )}
        </div>
    );
};

const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please log in.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters long.';
        case 'auth/too-many-requests':
            return 'Access to this account has been temporarily disabled. Please reset your password or try again later.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in window was closed. Please try again.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
};

interface LoginScreenProps {
    appSettings: {
        appName: string;
        logoURL?: string;
        loginTitle?: CustomElement;
        hideLoginLogo?: boolean;
        showGoogleLogin?: boolean;
    };
    isAddingAccount?: boolean;
    onBack?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ appSettings, isAddingAccount, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState<AccountInfo[]>([]);
  const [loginView, setLoginView] = useState<'list' | 'form'>('form');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  useEffect(() => {
    if (!isAddingAccount) {
        const accounts = getStoredAccounts();
        setStoredAccounts(accounts);
        const targetEmail = sessionStorage.getItem('batchat_login_email');

        if (accounts.length > 0 && !targetEmail) {
            setLoginView('list');
        } else {
            setLoginView('form');
        }
    }
  }, [isAddingAccount]);

  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    if (reason === 'blocked') {
        setError("Your account has been blocked by an administrator.");
        sessionStorage.removeItem('logout_reason');
    }
    const targetEmail = sessionStorage.getItem('batchat_login_email');
    if (targetEmail) {
        setEmail(targetEmail);
        sessionStorage.removeItem('batchat_login_email');
    }
  }, []);

  const handleSelectAccount = (account: AccountInfo) => {
    setEmail(account.email || '');
    setLoginView('form');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in the database
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            // New user, create a basic profile. They will be forced to complete it.
            await set(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                phoneNumber: '', // To be completed
                handle: '',      // To be completed
            });
        }
        // If user exists, the useAuth hook will handle login automatically.
    } catch (err: any) {
        setError(getAuthErrorMessage(err.code));
    } finally {
        setLoading(false);
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) {
            await sendEmailVerification(user);
            // Create a basic user profile in the database
            const userRef = ref(db, `users/${user.uid}`);
            await set(userRef, {
                uid: user.uid,
                email: user.email,
                phoneNumber: phoneNumber,
                photoURL: null,
                displayName: '', // To be completed in the next step
                handle: '',
            });
            setSignupSuccess(true);
        }
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
        setLoading(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
          await sendPasswordResetEmail(auth, email);
          setPasswordResetSuccess(true);
      } catch (err: any) {
          setError(getAuthErrorMessage(err.code));
      } finally {
          setLoading(false);
      }
  };

  if (signupSuccess) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white">
            <h1 className="text-2xl font-bold mb-4 text-center">Verification Email Sent</h1>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                We've sent a verification link to <span className="font-semibold text-[var(--theme-color-primary)]">{email}</span>.
                Please check your inbox and click the link to continue.
            </p>
            <button onClick={() => { setSignupSuccess(false); setIsLogin(true); }} className="mt-6 text-sm text-[var(--theme-color-primary)] hover:underline">
                Back to Login
            </button>
        </div>
    );
  }

  if (passwordResetSuccess) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white">
            <h1 className="text-2xl font-bold mb-4 text-center">Password Reset Email Sent</h1>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                We've sent a password reset link to <span className="font-semibold text-[var(--theme-color-primary)]">{email}</span>.
                Please check your inbox to reset your password.
            </p>
            <button onClick={() => { setPasswordResetSuccess(false); setIsForgotPassword(false); }} className="mt-6 text-sm text-[var(--theme-color-primary)] hover:underline">
                Back to Login
            </button>
        </div>
    );
  }

  if (isForgotPassword) {
      return (
          <div className="relative flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white overflow-y-auto">
              <button onClick={() => setIsForgotPassword(false)} className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                  <BackIcon />
              </button>
              {!appSettings.hideLoginLogo && <Logo logoUrl={appSettings.logoURL} />}
              <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your email to receive a reset link.</p>
              
              {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4 text-center">{error}</p>}
              
              <form onSubmit={handlePasswordReset} className="w-full max-w-xs">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                  />
                  <button type="submit" disabled={loading} className="w-full bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg shadow-lg shadow-[var(--theme-color-primary)]/20 hover:opacity-90 transition-all duration-300 disabled:bg-gray-200 dark:disabled:bg-[#2f2f2f] disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed">
                    {loading ? '...' : 'Send Reset Link'}
                  </button>
              </form>
          </div>
      );
  }

  if (!isAddingAccount && loginView === 'list') {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white overflow-y-auto">
            {!appSettings.hideLoginLogo && <Logo logoUrl={appSettings.logoURL} />}
            <h1 className="text-3xl font-bold mb-8">{appSettings.appName}</h1>

            <div className="w-full max-w-xs space-y-3">
                {storedAccounts.map(account => (
                    <button key={account.uid} onClick={() => handleSelectAccount(account)} className="w-full flex items-center p-3 bg-gray-100 dark:bg-[#2f2f2f] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Avatar photoURL={account.photoURL} name={account.displayName} sizeClass="w-12 h-12" />
                        <div className="ml-4 text-left min-w-0">
                            <NameWithBadges user={account} />
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{account.email}</p>
                        </div>
                    </button>
                ))}
            </div>

            <button onClick={() => { setLoginView('form'); setEmail(''); }} className="mt-6 text-sm text-[var(--theme-color-primary)] hover:underline">
                Log in to another account
            </button>
        </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] text-black dark:text-white overflow-y-auto">
      {(isAddingAccount && onBack) && (
        <button onClick={onBack} className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
          <BackIcon />
        </button>
      )}
      {(!isAddingAccount && loginView === 'form' && storedAccounts.length > 0) && (
        <button onClick={() => { setLoginView('list'); setEmail(''); setPassword(''); setError(''); }} className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <BackIcon />
        </button>
      )}
      {!appSettings.hideLoginLogo && <Logo logoUrl={appSettings.logoURL} />}
      {appSettings.loginTitle?.type === 'image' && appSettings.loginTitle.content ? (
        <img 
            src={appSettings.loginTitle.content} 
            alt={appSettings.appName} 
            style={{
                width: appSettings.loginTitle?.style?.width ? `${appSettings.loginTitle.style.width}px` : 'auto',
                height: appSettings.loginTitle?.style?.height ? `${appSettings.loginTitle.style.height}px` : 'auto',
                marginTop: `${appSettings.loginTitle?.style?.marginTop || 0}px`,
                marginBottom: `${appSettings.loginTitle?.style?.marginBottom || 8}px`,
            }}
        />
        ) : (
        <h1 
            className="text-3xl font-bold mb-2"
            style={{
                fontSize: `${appSettings.loginTitle?.style?.fontSize || 30}px`,
                marginTop: `${appSettings.loginTitle?.style?.marginTop || 0}px`,
                marginBottom: `${appSettings.loginTitle?.style?.marginBottom || 8}px`,
            }}
        >
            {appSettings.loginTitle?.content || appSettings.appName}
        </h1>
    )}
      <p className="text-gray-500 dark:text-gray-400 mb-8">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
      
      {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4 text-center">{error}</p>}
      
      <form onSubmit={handleAuthAction} className="w-full max-w-xs">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
        />
        {!isLogin && (
             <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone Number"
              required
              className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
            />
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
        />
        <button type="submit" disabled={loading} className="w-full bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg shadow-lg shadow-[var(--theme-color-primary)]/20 hover:opacity-90 transition-all duration-300 disabled:bg-gray-200 dark:disabled:bg-[#2f2f2f] disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed">
          {loading ? '...' : (isLogin ? 'Log In' : 'Sign Up')}
        </button>
      </form>

      {isLogin && appSettings.showGoogleLogin && (
        <>
            <div className="my-4 flex items-center w-full max-w-xs">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full max-w-xs flex items-center justify-center bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 text-black dark:text-white font-semibold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
                <GoogleIcon />
                Sign in with Google
            </button>
        </>
      )}

      {isLogin && (
          <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setPassword(''); }} className="mt-4 text-xs text-gray-500 dark:text-gray-400 hover:text-[var(--theme-color-primary)] hover:underline">
              Forgot Password?
          </button>
      )}

      <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="mt-6 text-sm text-[var(--theme-color-primary)] hover:underline">
        {isLogin ? 'Need an account? Sign Up' : 'Have an account? Log In'}
      </button>

    </div>
  );
};

export default LoginScreen;