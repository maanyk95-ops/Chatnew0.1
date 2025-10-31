
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import ChatListScreen from './components/ChatListScreen';
import ChatScreen from './components/ChatScreen';
import CreateChatScreen from './components/CreateChatScreen';
import AdminPanel from './components/AdminPanel';
import SettingsScreen from './components/SettingsScreen';
import EditProfileScreen from './components/EditProfileScreen';
import PrivacySecurityScreen from './components/PrivacySecurityScreen';
import CompleteProfileScreen from './components/CompleteProfileScreen';
import StickerStoreScreen from './components/StickerStoreScreen';
import CreateStickerPackScreen from './components/CreateStickerPackScreen';
import StickerPackDetailScreen from './components/StickerPackDetailScreen';
import ForwardScreen from './components/ForwardScreen';
import NewMessageScreen from './components/NewMessageScreen';
import { NewContactScreen } from './components/NewContactScreen';
import UserProfileScreen from './components/UserProfileScreen';
import GroupInfoScreen from './components/GroupInfoScreen';
import AddMembersScreen from './components/AddMembersScreen';
import AdminRightsScreen from './components/AdminRightsScreen';
import EmailVerificationScreen from './components/EmailVerificationScreen';
import ArchivedChatsScreen from './components/ArchivedChatsScreen';
import PremiumScreen from './components/PremiumScreen';
import PaymentScreen from './components/PaymentScreen';
import HelpChatScreen from './components/HelpChatScreen'; 
import { db, auth } from './services/firebase';
import { ref, onValue, update, onDisconnect, serverTimestamp, off, set } from 'firebase/database';
import { signOut } from 'firebase/auth';
import type { User, Chat, AppSettings, Message, CustomElement, ThemedAsset, ThemedCustomElement, PremiumPlan } from './types';
import { ChatType } from './types';
import { getContrastColor } from './utils/colors';

const defaultAppSettings: AppSettings = {
    appName: 'Batchat',
    defaultTheme: 'dark',
    lightThemeColors: {
      primary: '#f59e0b', // amber-500
      bubbleUserBg: '#dcf8c6', // Will be overridden by primary color
      bubbleUserText: '#000000', // Will be overridden
      bubbleOtherBg: '#e5e7eb', // gray-200
      bubbleOtherText: '#000000',
    },
    darkThemeColors: {
      primary: '#facc15', // yellow-400 (Golden)
      bubbleUserBg: '#facc15', // Will be overridden by primary color
      bubbleUserText: '#000000', // Will be overridden
      bubbleOtherBg: '#2f2f2f', // dark gray
      bubbleOtherText: '#ffffff',
    },
    hideLoginLogo: false,
    showGoogleLogin: true,
    premiumScreen: {
        headerImage: {
            url: '', // Default to no image
            width: 128,
            height: 128,
            marginTop: 32,
            marginBottom: 32,
        },
        starIcon: 'premium',
        header: 'App Premium',
        subHeader: 'Go beyond the limits and unlock dozens of exclusive features by subscribing to App Premium.',
        plans: [
            {
                id: 'annual',
                name: 'Annual',
                priceCurrency: '₹',
                priceValue: 2399.00,
                period: 'year',
                durationDays: 365,
                discountText: '-37%',
                monthlyEquivalent: '₹199.92/month',
                originalPrice: '₹3,828',
            },
            {
                id: 'monthly',
                name: 'Monthly',
                priceCurrency: '₹',
                priceValue: 319.00,
                period: 'month',
                durationDays: 30,
            }
        ],
        features: [
            { id: 'feat1', icon: 'stories', title: "Stories", description: "Unlimited posting, priority order, stealth mode, permanent view history and more." },
            { id: 'feat2', icon: 'cloud', title: "Unlimited Cloud Storage", description: "4 GB per each document, unlimited storage for your chats and media overall." },
            { id: 'feat3', icon: 'x2', title: "Doubled Limits", description: "Up to 1000 channels, 30 folders, 10 pins, 20 public links, 4 accounts and more." },
        ]
    },
    paymentSettings: {
        instructions: 'Please make a payment to one of the methods below and submit the Transaction ID to get your request approved.',
        qrCodeUrl: '',
        fields: [
            { id: 'upi', label: 'UPI ID', value: 'example@upi' },
            { id: 'bank', label: 'Bank Account', value: '1234567890 (IFSC: ABCD0123456)'}
        ]
    }
};

const hexToRgb = (hex: string): string | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : null;
};

const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const GuestHelpForm: React.FC<{ onStart: (details: { name: string, phoneNumber: string }) => void, onBack: () => void }> = ({ onStart, onBack }) => {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && phoneNumber.trim()) {
            onStart({ name, phoneNumber });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-30 flex items-center justify-center" onClick={onBack}>
             <div className="bg-white dark:bg-[#2a2a2a] rounded-lg w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-xl mb-4 text-center">Contact Support</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">Please provide your details so we can assist you.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        required
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                     <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone Number"
                        required
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                    />
                    <button type="submit" className="w-full bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] font-bold py-3 rounded-lg">
                        Start Chat
                    </button>
                </form>
             </div>
        </div>
    );
};


const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [managingChat, setManagingChat] = useState<Chat | null>(null);
  const [initialMessageId, setInitialMessageId] = useState<string | null>(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState<string | null>(null);
  const [initialReplyToId, setInitialReplyToId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('chatlist');
  const [modalView, setModalView] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<Message[] | null>(null);
  const [previousView, setPreviousView] = useState('chatlist');
  const [previousChat, setPreviousChat] = useState<Chat | null>(null);
  const [createChatPayload, setCreateChatPayload] = useState<{type: ChatType} | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [adminRightsPayload, setAdminRightsPayload] = useState<{chat: Chat, user: User} | null>(null);
  const [addMembersPayload, setAddMembersPayload] = useState<{chat: Chat} | null>(null);
  const [sessionToastMessage, setSessionToastMessage] = useState<string | null>(null);
  const [profileBackTarget, setProfileBackTarget] = useState('chatlist');
  const [helpChatPayload, setHelpChatPayload] = useState<{ chatId: string; isGuest: boolean; guestName?: string; } | null>(null);
  const [hasUnreadGuestHelp, setHasUnreadGuestHelp] = useState(false);
  const [paymentPayload, setPaymentPayload] = useState<{ plan: PremiumPlan } | null>(null);
  
  const [theme, setTheme] = useState(localStorage.getItem('batchat-theme') || appSettings.defaultTheme);
  const appSettingsRef = useRef(appSettings);
  appSettingsRef.current = appSettings;

  useEffect(() => {
    const storedTheme = localStorage.getItem('batchat-theme');
    const newTheme = storedTheme || appSettingsRef.current.defaultTheme;
    setTheme(newTheme);
  }, [appSettings.defaultTheme]);


  useEffect(() => {
    localStorage.setItem('batchat-theme', theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Undo Action State
  const [undoAction, setUndoAction] = useState<{ id: string; message: string; onConfirm: () => Promise<void>; onUndo?: () => void; } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simple Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerToast = (message: string) => {
      if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
      }
      setToastMessage(message);
      toastTimeoutRef.current = setTimeout(() => {
          setToastMessage(null);
      }, 2000);
  };

  const handleUndo = () => {
      if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
      }
      if (undoAction?.onUndo) {
          undoAction.onUndo();
      }
      setUndoAction(null);
  };

  const triggerUndo = (message: string, onConfirm: () => Promise<void>, onUndo?: () => void) => {
      if (undoAction && undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
          undoAction.onConfirm();
      }

      const id = `undo-${Date.now()}`;
      setUndoAction({ id, message, onConfirm, onUndo });

      undoTimeoutRef.current = setTimeout(() => {
          onConfirm();
          setUndoAction(prev => (prev?.id === id ? null : prev));
      }, 5000);
  };

  // Ref to store the previous user's UID to detect an account switch.
  const previousUserUidRef = useRef<string | undefined | null>(user?.uid);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousUid = previousUserUidRef.current;
    const currentUid = user?.uid;

    if (currentUid && currentUid !== previousUid) {
        // This is an account switch (login or change)
        // Reset core navigation state to show the default screen for the new user
        setCurrentView('chatlist');
        setSelectedChat(null);
        setManagingChat(null);
        setInitialMessageId(null);
        setInitialSearchQuery(null);
        setInitialReplyToId(null);
        setModalView(null);
        setMessagesToForward(null);
        setPreviousView('chatlist');
        setPreviousChat(null);
        setCreateChatPayload(null);
        setViewingProfileId(null);
        setAdminRightsPayload(null);
        setAddMembersPayload(null);
        setJustLoggedIn(true);
    }
    
    if (!currentUid && previousUid) {
        // User logged out, reset everything
        setCurrentView('chatlist');
        setSelectedChat(null);
        setManagingChat(null);
        setInitialMessageId(null);
        setInitialSearchQuery(null);
        setInitialReplyToId(null);
        setModalView(null);
        setMessagesToForward(null);
        setPreviousView('chatlist');
        setPreviousChat(null);
        setCreateChatPayload(null);
        setViewingProfileId(null);
        setAdminRightsPayload(null);
        setAddMembersPayload(null);
        setJustLoggedIn(false);
        sessionIdRef.current = null;
    }

    previousUserUidRef.current = currentUid;
  }, [user]);


  useEffect(() => {
    const settingsRef = ref(db, 'settings/global');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const remoteSettings = snapshot.val();
            const mergedPremiumSettings = {
                ...defaultAppSettings.premiumScreen,
                ...(remoteSettings.premiumScreen || {}),
                headerImage: {
                    ...defaultAppSettings.premiumScreen?.headerImage,
                    ...(remoteSettings.premiumScreen?.headerImage || {}),
                },
                plans: remoteSettings.premiumScreen?.plans || defaultAppSettings.premiumScreen?.plans,
                features: remoteSettings.premiumScreen?.features || defaultAppSettings.premiumScreen?.features,
            };
            const mergedPaymentSettings = {
                ...defaultAppSettings.paymentSettings,
                ...(remoteSettings.paymentSettings || {}),
                fields: remoteSettings.paymentSettings?.fields || defaultAppSettings.paymentSettings.fields,
            };

            setAppSettings({
                ...defaultAppSettings,
                ...remoteSettings,
                premiumScreen: mergedPremiumSettings,
                paymentSettings: mergedPaymentSettings,
            });
        } else {
            setAppSettings(defaultAppSettings);
        }
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
      if (user) {
          // Check if essential profile info is present
          if (user.displayName && user.handle && user.phoneNumber) {
              setIsProfileComplete(true);
          } else {
              setIsProfileComplete(false);
          }
      } else {
        setIsProfileComplete(false);
      }
  }, [user]);

    useEffect(() => {
        let onlineListener: any;
        let sessionListenerUnsubscribe: (() => void) | null = null;
    
        if (user) {
            const userStatusRef = ref(db, `users/${user.uid}`);
            const connectedRef = ref(db, '.info/connected');

            // Online status management
            onlineListener = onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    update(userStatusRef, { isOnline: true });
                    onDisconnect(userStatusRef).update({ isOnline: false, lastSeen: serverTimestamp() });
                }
            });

            // Single device session management
            if (!sessionIdRef.current) {
                sessionIdRef.current = `${Date.now()}-${Math.random()}`;
            }
            update(userStatusRef, { sessionId: sessionIdRef.current });

            const userSessionRef = ref(db, `users/${user.uid}/sessionId`);
            const sessionListener = onValue(userSessionRef, (snapshot) => {
                const remoteSessionId = snapshot.val();
                if (remoteSessionId && sessionIdRef.current && remoteSessionId !== sessionIdRef.current) {
                    setSessionToastMessage("You have been logged out because your account is signed in on another device.");
                    setTimeout(() => {
                        signOut(auth);
                        setSessionToastMessage(null);
                    }, 3000);
                }
            });
            sessionListenerUnsubscribe = () => off(userSessionRef, 'value', sessionListener);
        }

        return () => {
            if (onlineListener) {
                // How to properly detach this? The API is a bit tricky.
                // For now, we rely on onDisconnect to handle cleanup.
            }
            if (sessionListenerUnsubscribe) {
                sessionListenerUnsubscribe();
            }
        };
  }, [user]);
  
  useEffect(() => {
    if (loading || user) {
        setHasUnreadGuestHelp(false); // Reset when logged in or loading
        return;
    }

    const guestId = localStorage.getItem('batchat_guest_support_id');
    if (!guestId) return;

    const unreadRef = ref(db, `supportChats/${guestId}/unreadForUser`);
    const listener = onValue(unreadRef, (snapshot) => {
        setHasUnreadGuestHelp(snapshot.val() === true);
    });

    return () => off(unreadRef, 'value', listener);
  }, [loading, user]);

  useEffect(() => {
    document.title = appSettings.appName;
    
    const currentThemeColors = theme === 'dark' ? appSettings.darkThemeColors : appSettings.lightThemeColors;
    const userThemeColor = user?.themeColor || currentThemeColors.primary;
    const userThemeTextColor = getContrastColor(userThemeColor);
    const primaryRgb = hexToRgb(currentThemeColors.primary);

    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --theme-color-primary: ${currentThemeColors.primary};
            --theme-color-primary-rgb: ${primaryRgb};
            --theme-color-bubble-user-bg: ${currentThemeColors.primary};
            --theme-color-bubble-user-text: ${getContrastColor(currentThemeColors.primary)};
            --theme-color-bubble-other-bg: ${currentThemeColors.bubbleOtherBg};
            --theme-color-bubble-other-text: ${currentThemeColors.bubbleOtherText};

            /* For user-specific theme color overrides */
            --user-theme-color: ${userThemeColor};
            --user-theme-text-color: ${userThemeTextColor};
            
            /* Old variables for compatibility */
            --theme-color: ${currentThemeColors.primary};
            --theme-text-color: ${getContrastColor(currentThemeColors.primary)};
        }
    `;
    document.head.appendChild(style);
    return () => {
        document.head.removeChild(style);
    };
  }, [appSettings, user, theme]);

  const handleStartGuestHelpChat = async ({ name, phoneNumber }: { name: string, phoneNumber: string }) => {
    let guestId = localStorage.getItem('batchat_guest_support_id');
    if (!guestId) {
        guestId = `guest_${Date.now()}`;
        localStorage.setItem('batchat_guest_support_id', guestId);
    }
    
    const supportChatRef = ref(db, `supportChats/${guestId}`);
    await set(supportChatRef, {
        userInfo: {
            name,
            phoneNumber,
            isGuest: true,
        },
        lastMessageTimestamp: serverTimestamp(),
        unreadForAdmin: true,
        unreadForUser: false
    });
    
    setHelpChatPayload({
        chatId: guestId,
        isGuest: true,
        guestName: name
    });
    setModalView(null);
    setCurrentView('help_chat');
  };

  const handleSelectChat = (chat: Chat, messageId?: string, options?: { searchQuery?: string; replyToId?: string }) => {
    setPreviousView(currentView);
    setCurrentView('chat');
    setSelectedChat(chat);
    setManagingChat(null);
    setInitialMessageId(messageId || null);
    setInitialSearchQuery(options?.searchQuery || null);
    setInitialReplyToId(options?.replyToId || null);
  };
  
  const handleNavigate = (view: string, payload?: any) => {
      if (view === 'new_contact') {
        setModalView('new_contact');
        return;
      }

      if (view === 'user_profile' && payload?.userId) {
        setProfileBackTarget(currentView);
      }
      
      setPreviousView(currentView);
      if (selectedChat) {
          setPreviousChat(selectedChat);
      }

      if (view === 'forwarding' && payload?.messages) {
          setMessagesToForward(payload.messages);
      } else {
          setMessagesToForward(null);
      }

      if (view === 'create_chat') {
        setCreateChatPayload(payload);
      }
      
      if (view === 'user_profile' && payload?.userId) {
        setViewingProfileId(payload.userId);
      } else {
        setViewingProfileId(null);
      }

      if (view === 'group_info' && payload?.chat) {
          setManagingChat(payload.chat);
      } else if (view !== 'admin_rights' && view !== 'add_members') {
          setManagingChat(null);
      }

      if (view === 'admin_rights' && payload?.chat && payload?.user) {
        setAdminRightsPayload(payload);
      } else {
        setAdminRightsPayload(null);
      }

      if (view === 'add_members' && payload?.chat) {
        setAddMembersPayload(payload);
      }

      if (view === 'help_chat' && user) {
        setHelpChatPayload({ chatId: user.uid, isGuest: false });
      }

      if (view === 'premium_payment' && payload?.plan) {
        setPaymentPayload(payload);
      }

      setSelectedChat(null);
      setCurrentView(view);
  }
  
  const handleBackFromForwarding = () => {
        setMessagesToForward(null);
        setCurrentView(previousView);
        setSelectedChat(previousChat);
  };

  const handleBackFromGroupInfo = () => {
    if (managingChat) {
      setCurrentView('chat');
      setSelectedChat(managingChat);
      setPreviousView('chatlist');
      setManagingChat(null);
      setPreviousChat(null); // also clean this up
    } else {
      setCurrentView('chatlist');
    }
  };

  const handleBackFromProfile = () => {
      setViewingProfileId(null);
      if (profileBackTarget === 'chat' && previousChat) {
        setCurrentView('chat');
        setSelectedChat(previousChat);
        setPreviousView('chatlist'); // a safe reset
        setPreviousChat(null);
      } else {
        setCurrentView(profileBackTarget || 'chatlist');
      }
  };
  
  const selectAsset = (asset: ThemedAsset | undefined) => asset?.[theme as 'light' | 'dark'] || asset?.common;
  const selectCustomElement = (themedElement: ThemedCustomElement | undefined): CustomElement | undefined => {
      const element = themedElement?.[theme as 'light' | 'dark'] || themedElement?.common;
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

  const loginScreenSettings = {
    appName: appSettings.appName,
    logoURL: selectAsset(appSettings.logoURL),
    loginTitle: selectCustomElement(appSettings.loginTitle),
    hideLoginLogo: appSettings.hideLoginLogo,
    showGoogleLogin: appSettings.showGoogleLogin,
  };

  const renderLoadingOrLogin = () => (
    <div className="h-screen w-screen bg-gray-100 dark:bg-black flex items-center justify-center">
        <div className="w-full h-full max-w-md mx-auto bg-white dark:bg-[#1e1e1e] relative">
             {loading ? <div className="text-center text-gray-500 dark:text-gray-400 p-8">Loading...</div> : <LoginScreen appSettings={loginScreenSettings} />}
             {!loading && !user && (
                 <button
                    onClick={() => {
                        const guestId = localStorage.getItem('batchat_guest_support_id');
                        if (guestId) {
                            setHelpChatPayload({ chatId: guestId, isGuest: true });
                            setCurrentView('help_chat');
                        } else {
                            setModalView('guest_help_form');
                        }
                    }}
                    className="absolute top-6 right-6 text-gray-500 dark:text-gray-400 w-14 h-14 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="Help & Support"
                >
                    <HelpIcon />
                    {hasUnreadGuestHelp && (
                        <span className="absolute top-3 right-3 block h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-[#1e1e1e]"></span>
                    )}
                 </button>
             )}
        </div>
    </div>
  );
  
  const renderContent = () => {
      if (currentView === 'help_chat' && helpChatPayload?.isGuest) {
          return <HelpChatScreen 
              payload={helpChatPayload} 
              currentUser={null} 
              onBack={() => {
                  setCurrentView('login'); // Use a non-view to trigger login screen
                  setHelpChatPayload(null);
              }} 
          />;
      }

      if (loading || !user) return renderLoadingOrLogin();
      if (!user.emailVerified) return <EmailVerificationScreen currentUser={user} />;
      if (!isProfileComplete) return <CompleteProfileScreen currentUser={user} onProfileComplete={() => setIsProfileComplete(true)} />;

      // One-time redirect for admin after login and profile completion
      if (justLoggedIn && user.isAdmin) {
        setTimeout(() => {
            setCurrentView('admin');
            setJustLoggedIn(false);
        }, 0);
      } else if (justLoggedIn) {
        // For non-admins, clear the flag. The view remains the default 'chatlist'.
        setTimeout(() => {
            setJustLoggedIn(false);
        }, 0);
      }

      const chatListScreenSettings = {
        appName: appSettings.appName,
        chatListTitle: selectCustomElement(appSettings.chatListTitle),
        premiumScreen: appSettings.premiumScreen,
      };

      const renderMainView = () => {
        if (currentView === 'chat' && selectedChat) {
            return (
              <ChatScreen 
                  chat={selectedChat}
                  currentUser={user as User} 
                  onBack={() => {
                      setCurrentView(previousView || 'chatlist');
                      setSelectedChat(null);
                      setInitialMessageId(null);
                      setInitialSearchQuery(null);
                      setInitialReplyToId(null);
                  }}
                  onNavigate={handleNavigate}
                  onSelectChat={handleSelectChat}
                  initialMessageId={initialMessageId}
                  initialSearchQuery={initialSearchQuery}
                  initialReplyToId={initialReplyToId}
                  onTriggerUndo={triggerUndo}
                  onTriggerToast={triggerToast}
              />
            );
        }
        
        switch (currentView) {
          case 'create_chat': return <CreateChatScreen currentUser={user} onBack={() => setCurrentView('new_message')} onChatCreated={handleSelectChat} type={createChatPayload?.type || ChatType.Group} />;
          case 'new_message': return <NewMessageScreen currentUser={user} onBack={() => setCurrentView('chatlist')} onNavigate={handleNavigate} onSelectChat={handleSelectChat} />;
          case 'admin': return <AdminPanel currentUser={user} onBack={() => setCurrentView('chatlist')} />;
          case 'settings': return <SettingsScreen currentUser={user} onBack={() => setCurrentView('chatlist')} onNavigate={handleNavigate} />;
          case 'edit_profile': return <EditProfileScreen currentUser={user} onBack={() => setCurrentView('settings')} />;
          case 'privacy_security': return <PrivacySecurityScreen currentUser={user} onBack={() => setCurrentView('settings')} />;
          case 'sticker_store': return <StickerStoreScreen currentUser={user} onBack={() => setCurrentView('settings')} onNavigate={handleNavigate} />;
          case 'create_sticker_pack': return <CreateStickerPackScreen currentUser={user} onBack={() => setCurrentView('sticker_store')} />;
          case 'forwarding': return <ForwardScreen messages={messagesToForward!} currentUser={user} onClose={handleBackFromForwarding} onSelectChat={handleSelectChat}/>;
          case 'user_profile': return <UserProfileScreen userId={viewingProfileId!} currentUser={user} onBack={handleBackFromProfile} onNavigate={handleNavigate} onSelectChat={handleSelectChat} onTriggerToast={triggerToast} />;
          case 'group_info': return <GroupInfoScreen chat={managingChat!} currentUser={user as User} onBack={handleBackFromGroupInfo} onNavigate={handleNavigate} onSelectChat={handleSelectChat} onTriggerUndo={triggerUndo} />;
          case 'add_members': return <AddMembersScreen currentUser={user} chat={addMembersPayload!.chat} onBack={() => handleNavigate('group_info', { chat: addMembersPayload!.chat })} />;
          case 'admin_rights': return <AdminRightsScreen chat={adminRightsPayload!.chat} user={adminRightsPayload!.user} currentUser={user} onBack={() => handleNavigate('group_info', { chat: adminRightsPayload!.chat })} />;
          case 'add_account': return <LoginScreen appSettings={loginScreenSettings} isAddingAccount={true} onBack={() => setCurrentView('chatlist')} />;
          case 'archived_chats': return <ArchivedChatsScreen currentUser={user} onBack={() => setCurrentView('chatlist')} onSelectChat={handleSelectChat} onTriggerUndo={triggerUndo} />;
          case 'global_search': return <ChatListScreen currentUser={user} onSelectChat={handleSelectChat} onNavigate={handleNavigate} appSettings={chatListScreenSettings} onTriggerUndo={triggerUndo} theme={theme} setTheme={setTheme} startInSearchMode={true} />;
          case 'help_chat': return <HelpChatScreen payload={helpChatPayload!} currentUser={user} onBack={() => setCurrentView('chatlist')} />;
          case 'premium': return <PremiumScreen currentUser={user} onBack={() => setCurrentView('chatlist')} settings={appSettings.premiumScreen!} onNavigate={handleNavigate} />;
          case 'premium_payment': return <PaymentScreen currentUser={user} plan={paymentPayload!.plan} settings={appSettings.paymentSettings!} onBack={() => setCurrentView('premium')} onTriggerToast={triggerToast} />;
          default:
            return <ChatListScreen currentUser={user} onSelectChat={handleSelectChat} onNavigate={handleNavigate} appSettings={chatListScreenSettings} onTriggerUndo={triggerUndo} theme={theme} setTheme={setTheme} />;
        }
      }

      return (
        <>
            {renderMainView()}
            {modalView === 'new_contact' && user && (
                <NewContactScreen 
                    currentUser={user} 
                    onBack={() => setModalView(null)}
                />
            )}
        </>
      );
  };

  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-black flex items-center justify-center">
      <div className="w-full h-full max-w-md mx-auto bg-white dark:bg-[#1e1e1e] relative overflow-hidden">
        {sessionToastMessage && (
            <div className="absolute top-0 left-0 right-0 p-4 bg-red-600 text-white text-center z-50 animate-pulse">
                {sessionToastMessage}
            </div>
        )}
        {renderContent()}

        {modalView === 'guest_help_form' && (
            <GuestHelpForm onStart={handleStartGuestHelpChat} onBack={() => setModalView(null)} />
        )}
        
        {toastMessage && (
            <div key={toastMessage} className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 dark:bg-black/80 text-white px-4 py-2 rounded-full z-50 shadow-lg animate-fade-in-out">
                <style>{`
                    @keyframes fade-in-out {
                        0% { opacity: 0; transform: translateY(-20px) translateX(-50%); }
                        10% { opacity: 1; transform: translateY(0) translateX(-50%); }
                        90% { opacity: 1; transform: translateY(0) translateX(-50%); }
                        100% { opacity: 0; transform: translateY(-20px) translateX(-50%); }
                    }
                    .animate-fade-in-out {
                        animation: fade-in-out 2s ease-in-out forwards;
                    }
                `}</style>
                {toastMessage}
            </div>
        )}
        {undoAction && (
            <div key={undoAction.id} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl flex items-center space-x-4 z-50 shadow-lg overflow-hidden">
                <style>{`
                    @keyframes shrink {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                    .undo-timer::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        height: 3px;
                        background-color: var(--theme-color-primary);
                        animation: shrink 5s linear forwards;
                    }
                `}</style>
                <div className="undo-timer relative w-full">
                    <span>{undoAction.message}</span>
                </div>
                <button onClick={handleUndo} className="font-bold text-[var(--theme-color-primary)] uppercase text-sm">Undo</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
