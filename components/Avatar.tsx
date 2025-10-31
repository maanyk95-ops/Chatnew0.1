
import React from 'react';
import { generateAvatarColor, getContrastColor } from '../utils/colors';

interface AvatarProps {
    photoURL: string | null | undefined;
    name: string | null | undefined;
    sizeClass?: string;
    textClass?: string;
}

const Avatar: React.FC<AvatarProps> = ({ photoURL, name, sizeClass = 'w-10 h-10', textClass = 'text-xl' }) => {
    if (photoURL) {
        return <img src={photoURL} alt={name || 'avatar'} className={`${sizeClass} rounded-full object-cover bg-gray-700`} />;
    }

    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const bgColor = generateAvatarColor(name || 'default');
    const textColor = getContrastColor(bgColor);

    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${textClass}`}
            style={{ backgroundColor: bgColor, color: textColor }}
        >
            <span>{initial}</span>
        </div>
    );
};

export default Avatar;