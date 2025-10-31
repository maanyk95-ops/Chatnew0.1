import React from 'react';

// Impressive Line Icons
const ChatIcon = ({ active }: { active: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${active ? 'text-[var(--theme-color, #facc15)]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CompassIcon = ({ active }: { active: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${active ? 'text-[var(--theme-color, #facc15)]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--theme-text-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const UserCircleIcon = ({ active }: { active: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${active ? 'text-[var(--theme-color, #facc15)]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SettingsIcon = ({ active }: { active: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${active ? 'text-[var(--theme-color, #facc15)]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


interface BottomNavProps {
    onNewChatClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onNewChatClick }) => {
    return (
        <footer className="absolute bottom-0 left-0 right-0 p-3">
            <div className="w-full bg-[#2f2f2f] border border-gray-700/50 rounded-2xl flex justify-around items-center h-16 shadow-lg">
                <button className="flex flex-col items-center p-2">
                    <ChatIcon active={true}/>
                </button>
                <button className="flex flex-col items-center p-2">
                    <CompassIcon active={false} />
                </button>
                <button onClick={onNewChatClick} className="bg-[var(--theme-color)] rounded-full w-14 h-14 flex items-center justify-center -mt-8 shadow-lg shadow-[var(--theme-color)]/40 hover:shadow-xl hover:shadow-[var(--theme-color)]/60 transition-all duration-300 border-4 border-[#1e1e1e]">
                    <PlusIcon />
                </button>
                <button className="flex flex-col items-center p-2">
                    <UserCircleIcon active={false} />
                </button>
                 <button className="flex flex-col items-center p-2">
                    <SettingsIcon active={false} />
                </button>
            </div>
        </footer>
    );
};

export default BottomNav;