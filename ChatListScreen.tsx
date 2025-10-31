import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, off, query, orderByChild, startAt, endAt, get, update, push, serverTimestamp, set } from 'firebase/database';
import type { User, Chat, Message, CustomElement } from '../types';
import { ChatType } from '../types';
import Drawer from './Drawer';
import Avatar from './Avatar';

interface ChatListScreenProps {
  currentUser: User;
  onSelectChat: (chat: Chat, messageId?: string, options?: { searchQuery?: string }) => void;
  onNavigate: (view: string, payload?: any) => void;
  appSettings: {
      appName: string;
      chatListTitle?: CustomElement;
  };
  onTriggerUndo: (message: string, onConfirm: () => Promise<void>, onUndo?: () => void) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

// --- Icons ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
const SingleTickIcon = () => <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
const DoubleTickIcon = ({ isRead }: { isRead: boolean }) => <svg className={`w-5 h-5 ${isRead ? 'text-[#4FC3F7]' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7m-3-4l-8.5 8.5"></path></svg>;
const PinIcon = () => <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" transform="rotate(-45 12 12)"/></svg>;
const BellSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 dark:text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg>;
const PhotoIcon = () => <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>;
const StickerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const GifIcon = () => <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 9H13v6h-1.5zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5H7.5v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1z"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const HeaderPinIcon = () => <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>;
const HeaderUnpinIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 12V4h-1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z M4 4l16 16"/></svg>;
const HeaderMuteIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" /></svg>;
const HeaderDeleteIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const MoreHorizIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;


const stories = [
    { id: 'you', name: 'You', avatar: 'https://i.pravatar.cc/150?u=you' },
    { id: '1', name: 'Leah', avatar: 'https://i.pravatar.cc/150?u=leah' },
    { id: '2', name: 'Ella', avatar: 'https://i.pravatar.cc/150?u=ella' },
    { id: '3', name: 'Ronnie', avatar: 'https://i.pravatar.cc/150?u=ronnie' },
    { id: '4', name: 'Sansa', avatar: 'https://i.pravatar.cc/150?u=sansa' },
    { id: '5', name: 'John', avatar: 'https://i.pravatar.cc/150?u=john' },
];

function isUser(item: User | Chat): item is User {
    return (item as User).uid !== undefined;
}

const getChatDisplayInfo = (chat: Chat, currentUserId: string) => {
      if (chat.type === ChatType.Group || chat.type === ChatType.Channel) {
          return {
              name: chat.name || 'Unnamed Group',
              photoURL: chat.photoURL
          }
      }
      const otherUserId = Object.keys(chat.participants || {}).find(uid => uid !== currentUserId);
      if (!otherUserId) {
        return { name: 'Unknown User', photoURL: null };
      }
      const otherUser = chat.participantInfo?.[otherUserId];
      if (!otherUser) {
          return { name: 'Unknown User', photoURL: null };
      }
      return { 
          name: otherUser.displayName || 'Unknown User', 
          photoURL: otherUser.photoURL
      };
}

const ChatListItemSkeleton = () => (
    <div className="flex items-center px-4 py-3 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 mr-4"></div>
        <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="text-right flex flex-col items-end space-y-2 ml-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
    </div>
);


const ChatListScreen: React.FC<ChatListScreenProps> = ({ currentUser, onSelectChat, onNavigate, appSettings, onTriggerUndo, theme, setTheme }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [publicResults, setPublicResults] = useState<(User | Chat)[]>([]);
  const [myChatResults, setMyChatResults] = useState<Chat[]>([]);
  const [messageResults, setMessageResults] = useState<(Message & { chat: Chat })[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'users' | 'groups' | 'messages'>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selection Mode State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    if (!currentUser.uid) return;
    
    const userChatsRef = ref(db, `user-chats/${currentUser.uid}`);
    
    const listener = onValue(userChatsRef, (snapshot) => {
        if (!snapshot.exists()) {
            setChats([]);
            setLoading(false);
            return;
        }

        const userChatsData = snapshot.val();
        const chatIds = Object.keys(userChatsData);
        const chatPromises = chatIds.map(chatId => get(ref(db, `chats/${chatId}`)));

        Promise.all(chatPromises).then(chatSnaps => {
            const chatsData = chatSnaps
                .map(snap => {
                    if (!snap.exists()) return null;
                    const chat = { id: snap.key, ...snap.val() } as Chat;
                    const userChatInfo = userChatsData[chat.id];
                    chat.isPinned = typeof userChatInfo === 'object' && userChatInfo.isPinned;
                    chat.isMuted = typeof userChatInfo === 'object' && userChatInfo.isMuted;
                    chat.isArchived = typeof userChatInfo === 'object' && userChatInfo.isArchived;
                    return chat;
                })
                .filter(Boolean) as Chat[]
            
            chatsData.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0);
            });
            
            setChats(chatsData);
            setLoading(false);
        }).catch(error => {
            console.error("Error fetching chat details: ", error);
            setLoading(false);
        });
    }, (error) => {
        console.error("Error fetching user chats: ", error);
        setLoading(false);
    });

    return () => off(userChatsRef, 'value', listener);
  }, [currentUser.uid]);

    useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setPublicResults([]);
      setMyChatResults([]);
      setMessageResults([]);
      setSearchLoading(false);
      return;
    }
    
    setSearchLoading(true);

    const handleSearch = async () => {
      const searchTerm = trimmedQuery.toLowerCase();
      const joinedChatIds = new Set(chats.map(c => c.id));
      
      const userChats = chats.filter(chat => {
          const info = getChatDisplayInfo(chat, currentUser.uid);
          return info.name.toLowerCase().includes(searchTerm);
      });
      setMyChatResults(userChats);
      
      const publicResultsData: (User | Chat)[] = [];
      try {
          const promises = [];
          if (filter === 'all' || filter === 'users') {
              const usersQuery = query(ref(db, 'users'), orderByChild('handle'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
              promises.push(get(usersQuery));
          } else {
              promises.push(Promise.resolve(null));
          }

          if (filter === 'all' || filter === 'groups') {
              const groupsQuery = query(ref(db, 'chats'), orderByChild('handle'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
              promises.push(get(groupsQuery));
          } else {
              promises.push(Promise.resolve(null));
          }
          
          const [userSnapshot, groupSnapshot] = await Promise.all(promises);

          if (userSnapshot && userSnapshot.exists()) {
            publicResultsData.push(...Object.values(userSnapshot.val() as { [key: string]: User }).filter(u => u.uid !== currentUser.uid));
          }
          if (groupSnapshot && groupSnapshot.exists()) {
            const groupsData = groupSnapshot.val();
            publicResultsData.push(...Object.entries(groupsData).map(([id, data]) => ({ id, ...(data as Omit<Chat, 'id'>) }))
                            .filter(c => 
                                (c.type === ChatType.Group || c.type === ChatType.Channel) && 
                                c.isPublic &&
                                !joinedChatIds.has(c.id)
                            ));
          }
        setPublicResults(publicResultsData);

        if (filter === 'all' || filter === 'messages') {
            const messageSearchPromises = chats.map(chat =>
                get(ref(db, `messages/${chat.id}`)).then(snapshot => {
                    if (!snapshot.exists()) return [];
                    const messagesData = snapshot.val();
                    return Object.entries(messagesData)
                        .map(([id, data]) => ({ id, ...(data as Omit<Message, 'id'>), chat }))
                        .filter(msg => msg.text && msg.text.toLowerCase().includes(searchTerm));
                })
            );
            const resultsByChat = await Promise.all(messageSearchPromises);
            const allMessageResults = resultsByChat.flat().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            const latestMessagesByChat = new Map<string, Message & { chat: Chat }>();
            allMessageResults.forEach(msg => {
                if (!latestMessagesByChat.has(msg.chat.id)) {
                    latestMessagesByChat.set(msg.chat.id, msg);
                }
            });
            setMessageResults(Array.from(latestMessagesByChat.values()));

        } else {
            setMessageResults([]);
        }

      } catch (error) {
          console.error("Error searching:", error);
      } finally {
          setSearchLoading(false);
      }
    };
    
    const debounceSearch = setTimeout(() => {
        handleSearch();
    }, 300);

    return () => clearTimeout(debounceSearch);

  }, [searchQuery, currentUser.uid, filter, chats]);

  const handleSelectSearchResult = async (item: User | Chat) => {
      if (isUser(item)) { 
          const selectedUser = item;
          // Find if a private chat already exists from the current user's chat list
          const existingChat = chats.find(chat => 
              chat.type === ChatType.Private &&
              chat.participants[selectedUser.uid] &&
              Object.keys(chat.participants).length === 2
          );
  
          if (existingChat) {
              onSelectChat(existingChat);
          } else {
              // If no chat found, create a new one.
              const user1 = currentUser;
              const user2 = selectedUser;
      
              const newChatRef = push(ref(db, 'chats'));
              const newChatId = newChatRef.key;
              if (!newChatId) return;
      
              const newChatData = {
                  type: ChatType.Private,
                  participants: { [user1.uid]: true, [user2.uid]: true },
                  participantInfo: {
                      [user1.uid]: { displayName: user1.displayName || '', photoURL: user1.photoURL || null, handle: user1.handle || '' },
                      [user2.uid]: { displayName: user2.displayName || 'Unknown User', photoURL: user2.photoURL || null, handle: user2.handle || '' }
                  },
                  lastMessage: '',
                  lastMessageTimestamp: serverTimestamp(),
                  lastMessageSenderId: '',
                  unreadCounts: { [user1.uid]: 0, [user2.uid]: 0 }
              };
              
              const updates: { [key: string]: any } = {};
              updates[`/chats/${newChatId}`] = newChatData;
              updates[`/user-chats/${user1.uid}/${newChatId}`] = true;
              updates[`/user-chats/${user2.uid}/${newChatId}`] = true;
              
              await update(ref(db), updates);
              onSelectChat({ id: newChatId, ...newChatData, unreadCounts: { [user1.uid]: 0, [user2.uid]: 0 } } as Chat);
          }
      } else {
          onSelectChat(item);
      }
      setSearchQuery('');
      setPublicResults([]);
      setMyChatResults([]);
      setMessageResults([]);
      setSearchActive(false);
  };
  
    const highlightText = (text: string, highlight: string): React.ReactNode[] => {
        if (!highlight.trim()) {
            return [text];
        }
        const regex = new RegExp(`(${highlight})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-500 text-black rounded px-0.5">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const renderMessageResultItem = (item: Message & { chat: Chat }) => {
        const key = `${item.chat.id}-${item.id}`;
        const chatInfo = getChatDisplayInfo(item.chat, currentUser.uid);
        const senderInfo = item.chat.participantInfo[item.senderId];
        const date = new Date(item.timestamp);
        const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        return (
            <div key={key} onClick={() => onSelectChat(item.chat, item.id, { searchQuery })} className="flex items-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] cursor-pointer">
                <div className="mr-4">
                    <Avatar photoURL={chatInfo.photoURL} name={chatInfo.name} sizeClass="w-14 h-14" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-black dark:text-white truncate">{chatInfo.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">{dateString}</p>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 truncate text-sm">
                        <span className="font-semibold">{senderInfo?.displayName || 'Unknown'}: </span>
                        {highlightText(item.text, searchQuery)}
                    </p>
                </div>
            </div>
        );
    }
  
  const renderSearchResultItem = (item: User | Chat) => {
      const key = isUser(item) ? item.uid : item.id;
      const name = isUser(item) ? item.displayName || "Unnamed User" : item.name || "Unnamed Group";
      const photoURL = isUser(item) ? item.photoURL : item.photoURL;
      const handle = item.handle || "no_handle";
      const typeText = isUser(item) ? '' : ` - ${item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}`;
      const subtext = `@${handle}${typeText}`;

      return (
          <div key={key} onClick={() => handleSelectSearchResult(item)} className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] cursor-pointer">
              <div className="mr-4">
                  <Avatar photoURL={photoURL} name={name} sizeClass="w-14 h-14" />
              </div>
              <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black dark:text-white truncate">{name}</p>
                  <p className="text-gray-500 dark:text-gray-400 truncate text-sm">{subtext}</p>
              </div>
          </div>
      );
  }
  
  const renderSearchContent = () => {
      if (searchLoading && (publicResults.length === 0 && myChatResults.length === 0 && messageResults.length === 0)) {
          return <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Searching...</p>;
      }
      if (searchQuery.trim() !== '' && publicResults.length === 0 && myChatResults.length === 0 && messageResults.length === 0) {
          return <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No results found for "{searchQuery}"</p>;
      }
      return (
        <>
            {myChatResults.length > 0 && (
                <div>
                    <h3 className="px-4 pt-4 pb-2 font-bold text-gray-500 dark:text-gray-400 text-sm">FRIENDS & GROUPS</h3>
                    {myChatResults.map(chat => renderSearchResultItem(chat))}
                </div>
            )}
            {publicResults.length > 0 && (
                 <div>
                    <h3 className="px-4 pt-4 pb-2 font-bold text-gray-500 dark:text-gray-400 text-sm">GLOBAL SEARCH</h3>
                    {publicResults.map(item => renderSearchResultItem(item))}
                </div>
            )}
            {messageResults.length > 0 && (
                 <div>
                    <h3 className="px-4 pt-4 pb-2 font-bold text-gray-500 dark:text-gray-400 text-sm">MESSAGES</h3>
                    {messageResults.map(item => renderMessageResultItem(item))}
                </div>
            )}
        </>
      );
  }

  const FilterButton: React.FC<{ value: typeof filter, label: string }> = ({ value, label }) => (
      <button onClick={() => setFilter(value)} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === value ? 'bg-[var(--theme-color-primary)] text-[var(--theme-text-color)]' : 'bg-gray-200 dark:bg-[#2f2f2f] text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4a4a4a]'}`}>
          {label}
      </button>
  );

  const regularChats = chats.filter(c => !c.isArchived);
  const archivedChats = chats.filter(c => c.isArchived);
  
  // --- SELECTION MODE ---
  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedChats(new Set());
    setShowMoreMenu(false);
  };

  const handleToggleSelection = (chatId: string) => {
    const newSelection = new Set(selectedChats);
    if (newSelection.has(chatId)) {
        newSelection.delete(chatId);
    } else {
        newSelection.add(chatId);
    }
    if (newSelection.size === 0) {
        cancelSelectionMode();
    } else {
        setSelectedChats(newSelection);
    }
  };

  const handleLongPress = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    if (!selectionMode) {
        setSelectionMode(true);
        setSelectedChats(new Set([chatId]));
    }
  };
  
  const handleItemClick = (chat: Chat) => {
    if (selectionMode) {
        handleToggleSelection(chat.id);
    } else {
        onSelectChat(chat);
    }
  };

    const singleSelectedChat = useMemo(() => {
        if (selectedChats.size !== 1) return null;
        const chatId = selectedChats.values().next().value;
        return chats.find(c => c.id === chatId) || null;
    }, [selectedChats, chats]);

    const handleMarkAsRead = async (chatId: string) => {
        await update(ref(db), { [`/chats/${chatId}/unreadCounts/${currentUser.uid}`]: null });
        cancelSelectionMode();
    };

    const handleMarkAsUnread = async (chatId: string) => {
        await update(ref(db), { [`/chats/${chatId}/unreadCounts/${currentUser.uid}`]: 1 });
        cancelSelectionMode();
    };

    const handlePinUnpinSingle = async (chatId: string) => {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        await update(ref(db), { [`/user-chats/${currentUser.uid}/${chatId}/isPinned`]: !chat.isPinned });
        cancelSelectionMode();
    };

    const handleClearHistory = (chatId: string) => {
        cancelSelectionMode();

        const onConfirm = async () => {
            const messagesRef = ref(db, `messages/${chatId}`);
            const messagesSnap = await get(messagesRef);
            if (messagesSnap.exists()) {
                const updates: { [key: string]: any } = {};
                messagesSnap.forEach(messageSnap => {
                    updates[`/messages/${chatId}/${messageSnap.key}/deletedFor/${currentUser.uid}`] = true;
                });
                await update(ref(db), updates);
            }
        };

        onTriggerUndo(`History cleared`, onConfirm);
    };


  const handleSelectionAction = async (action: 'pin' | 'mute' | 'archive' | 'delete') => {
      const updates: { [key: string]: any } = {};
      const selectedArr = Array.from(selectedChats);
      
      const onConfirm = async () => {
          for (const chatId of selectedArr) {
              const chat = chats.find(c => c.id === chatId);
              if (!chat) continue;

              switch(action) {
                  case 'pin':
                    const areAllSelectedPinned = selectedArr.every(id => chats.find(c => c.id === id)?.isPinned);
                    updates[`/user-chats/${currentUser.uid}/${chatId}/isPinned`] = !areAllSelectedPinned;
                    break;
                  case 'mute':
                      updates[`/user-chats/${currentUser.uid}/${chatId}/isMuted`] = !chat.isMuted;
                      break;
                  case 'archive':
                      updates[`/user-chats/${currentUser.uid}/${chatId}/isArchived`] = true;
                      break;
                  case 'delete':
                        updates[`/user-chats/${currentUser.uid}/${chatId}`] = null;
                        if (chat.type === ChatType.Group || chat.type === ChatType.Channel) {
                            updates[`/chats/${chatId}/participants/${currentUser.uid}`] = null;
                            updates[`/chats/${chatId}/participantInfo/${currentUser.uid}`] = null;
                        } else if (chat.type === ChatType.Private) {
                            updates[`/chats/${chatId}/participants/${currentUser.uid}`] = null;
                        }
                        break;
              }
          }
          await update(ref(db), updates);
      };

      if (action === 'delete' || action === 'archive') {
          const originalChats = [...chats];
          const optimisticChats = chats.filter(c => !selectedChats.has(c.id));
          setChats(optimisticChats);
          
          onTriggerUndo(
              `${selectedChats.size} chat${selectedChats.size > 1 ? 's' : ''} ${action === 'archive' ? 'archived' : 'deleted'}`, 
              onConfirm,
              () => setChats(originalChats)
          );
      } else {
          await onConfirm();
      }

      cancelSelectionMode();
  };

  const areAllSelectedPinned = useMemo(() => {
        if (selectedChats.size === 0) return false;
        return Array.from(selectedChats).every(chatId => chats.find(c => c.id === chatId)?.isPinned);
    }, [selectedChats, chats]);

  const LastMessagePreview: React.FC<{ chat: Chat }> = ({ chat }) => {
    const msg = chat.lastMessage || 'No messages yet';

    if (msg === 'Sticker') {
        return <div className="flex items-center space-x-1.5"><StickerIcon /><span>Sticker</span></div>;
    }
    if (msg === '📷 GIF') {
        return <div className="flex items-center space-x-1.5"><GifIcon /><span>GIF</span></div>;
    }
    if (msg.startsWith('📷')) {
        return <div className="flex items-center space-x-1.5"><PhotoIcon /><span>Photo</span></div>;
    }
    return <span>{msg}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-black dark:text-white relative">
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentUser={currentUser} onNavigate={(view) => { onNavigate(view); setIsDrawerOpen(false); }} theme={theme} setTheme={setTheme} />
      
      <header className="p-4 flex-shrink-0 sticky top-0 z-10 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm">
        {selectionMode ? (
            <div className="flex items-center justify-between space-x-2 relative">
                <button onClick={cancelSelectionMode} className="p-2 -ml-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CloseIcon /></button>
                <h1 className="text-xl font-bold">{selectedChats.size}</h1>
                <div className="flex items-center space-x-1">
                    <button onClick={() => handleSelectionAction('pin')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        {areAllSelectedPinned ? <HeaderUnpinIcon /> : <HeaderPinIcon />}
                    </button>
                    <button onClick={() => handleSelectionAction('mute')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><HeaderMuteIcon /></button>
                    <button onClick={() => handleSelectionAction('archive')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><ArchiveIcon/></button>
                    <button onClick={() => handleSelectionAction('delete')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><HeaderDeleteIcon /></button>
                    {selectedChats.size === 1 && singleSelectedChat && (
                        <>
                            <button onClick={() => setShowMoreMenu(p => !p)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><MoreHorizIcon /></button>
                            {showMoreMenu && (
                                <div className="absolute top-12 right-0 bg-gray-100 dark:bg-[#2f2f2f] rounded-lg shadow-xl z-20 w-56 py-1" onMouseLeave={() => setShowMoreMenu(false)}>
                                    <button onClick={() => handlePinUnpinSingle(singleSelectedChat.id)} className="w-full text-left px-4 py-2 hover:bg-black/10 dark:hover:bg-white/10">{singleSelectedChat.isPinned ? 'Unpin' : 'Pin'}</button>
                                    {(singleSelectedChat.unreadCounts?.[currentUser.uid] || 0) > 0 ? (
                                        <button onClick={() => handleMarkAsRead(singleSelectedChat.id)} className="w-full text-left px-4 py-2 hover:bg-black/10 dark:hover:bg-white/10">Mark as read</button>
                                    ) : (
                                        <button onClick={() => handleMarkAsUnread(singleSelectedChat.id)} className="w-full text-left px-4 py-2 hover:bg-black/10 dark:hover:bg-white/10">Mark as unread</button>
                                    )}
                                    <button onClick={() => handleClearHistory(singleSelectedChat.id)} className="w-full text-left px-4 py-2 hover:bg-black/10 dark:hover:bg-white/10">Clear history</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        ) : searchActive ? (
            <div className="flex items-center justify-between space-x-4">
                <button onClick={() => { setSearchQuery(''); setSearchActive(false); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><BackIcon /></button>
                <input 
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color-primary)]"
                />
            </div>
        ) : (
            <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => setIsDrawerOpen(true)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 -ml-2"><MenuIcon /></button>
                    {appSettings.chatListTitle?.type === 'image' && appSettings.chatListTitle.content ? (
                        <img 
                            src={appSettings.chatListTitle.content} 
                            alt={appSettings.appName} 
                            style={{
                                width: `${appSettings.chatListTitle.style?.width || 100}px`,
                                height: 'auto',
                                marginTop: `${appSettings.chatListTitle.style?.marginTop || 0}px`,
                                marginBottom: `${appSettings.chatListTitle.style?.marginBottom || 0}px`,
                            }}
                        />
                    ) : (
                        <h1 
                            className="text-2xl font-bold text-black dark:text-white"
                            style={{
                                fontSize: `${appSettings.chatListTitle?.style?.fontSize || 24}px`,
                                marginTop: `${appSettings.chatListTitle?.style?.marginTop || 0}px`,
                                marginBottom: `${appSettings.chatListTitle?.style?.marginBottom || 0}px`,
                            }}
                        >
                            {appSettings.chatListTitle?.content || appSettings.appName}
                        </h1>
                    )}
                </div>
                <button onClick={() => setSearchActive(true)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><SearchIcon /></button>
            </div>
        )}
        {searchActive && (
             <div className="pt-4 flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 pb-2 overflow-x-auto">
                <FilterButton value="all" label="All" />
                <FilterButton value="users" label="Users" />
                <FilterButton value="groups" label="Groups" />
                <FilterButton value="messages" label="Messages" />
            </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {searchActive ? (
            renderSearchContent()
        ) : (
          <>
            {archivedChats.length > 0 && (
                <div onClick={() => onNavigate('archived_chats')} className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] cursor-pointer border-b border-gray-200 dark:border-gray-800">
                    <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-4"><ArchiveIcon /></div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-black dark:text-white">Archived Chats</p>
                        <p className="text-gray-500 dark:text-gray-400 truncate text-sm">{archivedChats.length} chat{archivedChats.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
            )}
            
            <div>
              {loading ? (
                  <div>
                      {[...Array(6)].map((_, i) => <ChatListItemSkeleton key={i} />)}
                  </div>
              ) : (
                  regularChats.map(chat => {
                      const displayInfo = getChatDisplayInfo(chat, currentUser.uid);
                      const lastMessageDate = chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp) : null;
                      const time = lastMessageDate 
                          ? lastMessageDate.toDateString() === new Date().toDateString()
                              ? lastMessageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                              : lastMessageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                          : '';
                      const unreadCount = chat.unreadCounts?.[currentUser.uid] || 0;
                      const hasUnreadMention = !!chat.unreadMentions?.[currentUser.uid];
                      const isSelected = selectedChats.has(chat.id);

                      const isSentByMe = chat.lastMessageSenderId === currentUser.uid;
                      let isReadByAll = false;
                      if (isSentByMe) {
                          if (chat.type === ChatType.Private) {
                              const otherUserId = Object.keys(chat.participants).find(p => p !== currentUser.uid);
                              isReadByAll = otherUserId ? (chat.unreadCounts?.[otherUserId] || 0) === 0 : false;
                          } else if (chat.type === ChatType.Group) {
                              const otherParticipantIds = Object.keys(chat.participants).filter(p => p !== currentUser.uid);
                              if (otherParticipantIds.length > 0) {
                                  isReadByAll = otherParticipantIds.every(uid => (chat.unreadCounts?.[uid] || 0) === 0);
                              } else {
                                  isReadByAll = true; 
                              }
                          }
                      }

                      return (
                          <div 
                            key={chat.id} 
                            onClick={() => handleItemClick(chat)} 
                            onContextMenu={(e) => handleLongPress(e, chat.id)}
                            className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-200 ${chat.isPinned ? 'bg-black/5 dark:bg-white/5' : ''} ${isSelected ? 'bg-blue-200 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-[#2f2f2f]'}`}
                          >
                              <div className="relative mr-4">
                                <Avatar photoURL={displayInfo.photoURL} name={displayInfo.name} sizeClass="w-14 h-14" />
                                {isSelected && (
                                    <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-[#1e1e1e] flex items-center justify-center">
                                        <CheckCircleIcon />
                                    </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <p className="font-semibold text-black dark:text-white truncate">{displayInfo.name}</p>
                                  </div>
                                  <p className="text-gray-500 dark:text-gray-400 truncate text-sm">
                                      <LastMessagePreview chat={chat} />
                                  </p>
                              </div>
                              <div className="text-right flex flex-col items-end space-y-1 ml-2">
                                  <div className="flex items-center space-x-1">
                                    {isSentByMe && (isReadByAll ? <DoubleTickIcon isRead={true} /> : <SingleTickIcon />)}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{time}</p>
                                  </div>
                                  <div className="flex items-center justify-end space-x-1 h-5">
                                      {chat.isPinned && <PinIcon/>}
                                      {chat.isMuted && <BellSlashIcon />}
                                      {(hasUnreadMention || unreadCount > 0) && (
                                        <span className={`ml-1 inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 ${chat.isMuted ? 'bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200' : 'bg-[var(--theme-color-primary)] text-[var(--theme-text-color)]'}`}>
                                            {hasUnreadMention && <span>@</span>}
                                            {unreadCount > 0 && <span className={hasUnreadMention ? 'ml-0.5' : ''}>{unreadCount}</span>}
                                        </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )
                  })
              )}
              { !loading && regularChats.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No chats yet. Start a new one!</p>}
            </div>
          </>
        )}
      </div>

      {!searchActive && !selectionMode && (
          <button 
            onClick={() => onNavigate('new_message')}
            className="absolute bottom-6 right-6 bg-[var(--theme-color-primary)] text-[var(--theme-text-color)] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--theme-color-primary)]/40 hover:scale-105 transition-transform"
            aria-label="New message"
          >
            <PencilIcon />
          </button>
      )}
    </div>
  );
};

export default ChatListScreen;