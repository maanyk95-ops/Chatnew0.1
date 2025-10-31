import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { ref, onValue, off, update, get } from 'firebase/database';
import { auth, db } from '../services/firebase';
import type { User } from '../types';

// --- NEW ACCOUNT STORAGE LOGIC ---
export interface AccountInfo {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    handle?: string;
    isPremium?: boolean;
    profileBadgeUrl?: string;
}

const ACCOUNTS_KEY = 'batchat_accounts';

export const getStoredAccounts = (): AccountInfo[] => {
    try {
        const data = localStorage.getItem(ACCOUNTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse stored accounts", e);
        return [];
    }
};

export const removeStoredAccount = (uid: string): void => {
    try {
        const accounts = getStoredAccounts();
        const updatedAccounts = accounts.filter(acc => acc.uid !== uid);
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    } catch (e) {
        console.error("Failed to remove stored account", e);
    }
};

const storeAccount = (userInfo: AccountInfo): void => {
    if (!userInfo.uid || !userInfo.email) return;

    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(acc => acc.uid === userInfo.uid);

    if (existingIndex > -1) {
        // Update existing account info
        accounts[existingIndex] = userInfo;
    } else {
        // Add new account
        accounts.push(userInfo);
    }

    try {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
        console.error("Failed to store account", e);
    }
};

// --- EXISTING useAuth HOOK ---
interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // Unsubscribe from previous user's data listener
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }

      if (firebaseUser) {
        setLoading(true);
        const userDocRef = ref(db, `users/${firebaseUser.uid}`);
        
        const onValueCallback = async (snapshot: any) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();

            if (userData.status === 0) {
                sessionStorage.setItem('logout_reason', 'blocked');
                signOut(auth);
                return;
            }

            // --- NEW: Premium Expiry Check with Fan-out ---
            if (userData.isPremium && userData.premiumExpiryTimestamp && Date.now() > userData.premiumExpiryTimestamp) {
                console.log("Premium subscription expired. Updating user status.");
                userData.isPremium = false;
                userData.profileBadgeUrl = null;
                
                const updates: {[key: string]: any} = {};
                updates[`/users/${firebaseUser.uid}/isPremium`] = false;
                updates[`/users/${firebaseUser.uid}/profileBadgeUrl`] = null;
                
                const userChatsSnap = await get(ref(db, `user-chats/${firebaseUser.uid}`));
                if (userChatsSnap.exists()) {
                    const chatIds = Object.keys(userChatsSnap.val());
                    for (const chatId of chatIds) {
                        updates[`/chats/${chatId}/participantInfo/${firebaseUser.uid}/isPremium`] = false;
                        updates[`/chats/${chatId}/participantInfo/${firebaseUser.uid}/profileBadgeUrl`] = null;
                    }
                }
                await update(ref(db), updates);
            }
            // --- END: Premium Expiry Check ---

            const fullUser = { ...firebaseUser, ...userData } as User;
            
            // New logic to store account info
            storeAccount({
                uid: fullUser.uid,
                email: fullUser.email,
                displayName: fullUser.displayName,
                photoURL: fullUser.photoURL,
                handle: fullUser.handle,
                isPremium: fullUser.isPremium,
                profileBadgeUrl: fullUser.profileBadgeUrl,
            });

            setUser(fullUser);

          } else {
            setUser(firebaseUser as User);
          }
          setLoading(false);
        };

        const onErrorCallback = (error: any) => {
            console.error("Firebase read failed: " + error.code);
            setUser(firebaseUser as User);
            setLoading(false);
        };

        onValue(userDocRef, onValueCallback, onErrorCallback);

        unsubscribeDb = () => off(userDocRef, 'value', onValueCallback);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) {
        unsubscribeDb();
      }
    };
  }, []);

  return { user, loading };
};