export enum ChatType {
    Private = 'private',
    Group = 'group',
    Channel = 'channel',
}

export interface PrivacySettings {
    lastSeen: 'everybody' | 'contacts' | 'nobody';
    profilePhoto: 'everybody' | 'contacts' | 'nobody';
    phoneNumber: 'everybody' | 'contacts' | 'nobody';
    forwardedMessages?: 'everybody' | 'contacts' | 'nobody';
}

export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean;
    photoURL: string | null;
    // FIX: Add missing 'phoneNumber' property to User type
    phoneNumber?: string;
    handle?: string;
    isPremium?: boolean;
    premiumExpiryTimestamp?: number; // New field for expiry tracking
    profileBadgeUrl?: string;
    nameplateStatusUrl?: string;
    isAdmin?: boolean;
    bio?: string;
    birthday?: string; // Storing as string for simplicity, e.g., 'YYYY-MM-DD'
    privacySettings?: PrivacySettings;
    role?: 'user' | 'admin';
    status?: 1 | 0; // 1 for active, 0 for blocked
    themeColor?: string;
    isOnline?: boolean;
    lastSeen?: number;
    isPublic?: boolean;
    stickerPacks?: { [packId: string]: boolean };
    sessionId?: string;
    blockedUsers?: { [uid: string]: boolean };
    paymentRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'hold';
    paymentRequestId?: string;
}

export interface AdminPermissions {
    canChangeInfo: boolean;
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canInviteUsers: boolean;
    canPinMessages: boolean;
    canManageVideoChats: boolean;
    canAddAdmins: boolean;
    isAnonymous: boolean;
    customTitle: string;
}

export interface MemberPermissions {
    canSendMessages: boolean;
    canSendMedia: boolean; // Photos, Videos, Files
    canSendPolls: boolean;
    canSendStickersAndGifs: boolean;
    canEmbedLinks: boolean;
    canAddUsers: boolean;
    canPinMessages: boolean;
    canChangeInfo: boolean;
}


export interface Chat {
    id: string;
    type: ChatType;
    participants: { [uid: string]: boolean }; // Changed to an object for easier querying in RTDB
    participantInfo: {
        [key: string]: {
            displayName: string;
            photoURL: string;
            handle?: string;
            joinedAt?: number;
            profileBadgeUrl?: string;
            nameplateStatusUrl?: string;
            isPremium?: boolean;
        }
    };
    // Group/Channel specific properties
    name?: string;
    description?: string;
    photoURL?: string;
    handle?: string;
    isPublic?: boolean;
    ownerId?: string;
    admins?: { [uid: string]: AdminPermissions };
    permissions?: MemberPermissions;
    slowMode?: number; // in seconds
    topicsEnabled?: boolean;
    chatHistoryVisibleForNewMembers?: boolean;
    reactionsMode?: 'all' | 'none';
    blockedUsers?: { [uid: string]: boolean };
    signMessages?: boolean; // For channels

    // Standard properties
    lastMessage?: string;
    lastMessageTimestamp?: number; // Changed Timestamp to number
    lastMessageSenderId?: string;
    unreadCounts?: { [uid: string]: number };
    unreadMentions?: { [uid: string]: boolean };
    pinnedMessages?: {
        [messageId: string]: {
            text: string;
            senderName: string;
            timestamp: number;
            pinnedAt: number;
            isPremium?: boolean;
            profileBadgeUrl?: string;
        };
    };

    // User-specific properties (not stored in /chats, but merged in client)
    isPinned?: boolean;
    isMuted?: boolean;
    isArchived?: boolean;
}

export interface LinkPreview {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
}

export interface Message {
    id: string;
    senderId: string;
    text: string; // Can be a message or a caption for an image
    timestamp: number; // Changed Timestamp to number
    readBy: { [uid: string]: number };
    imageUrl?: string; // URL for the image - kept for backward compatibility
    imageUrls?: string[]; // New: For multiple images
    stickerUrl?: string; // URL for stickers
    stickerPackId?: string; // ID of the sticker pack
    gifUrl?: string; // URL for GIFs
    deletedFor?: { [uid: string]: boolean }; // Tracks per-user deletion
    replyTo?: {
        messageId: string;
        senderId: string;
        senderName: string;
        text: string;
        isPremium?: boolean;
        profileBadgeUrl?: string;
    };
    isEdited?: boolean;
    reactions?: {
        [emoji: string]: { [uid: string]: boolean }; // value is map of user UIDs
    };
    mentions?: { [uid: string]: boolean }; // map of UIDs of mentioned users
    forwardedFrom?: {
        senderId?: string;
        senderName?: string | null;
        photoURL?: string | null;
        handle?: string | null;
        profileBadgeUrl?: string | null;
        nameplateStatusUrl?: string | null;
        isPremium?: boolean;
    };
    linkPreview?: LinkPreview;
    isSystemMessage?: boolean;
    systemMessageType?: 'group_created' | 'channel_created' | 'message_pinned' | 'message_unpinned';
}

export interface SupportMessage {
    id: string;
    senderId: string; // user's UID, guest's ID, or 'admin_support'
    senderName: string;
    text: string;
    timestamp: number;
    imageUrl?: string;
}

export interface SupportChat {
    id: string; // user's UID or guest's ID
    userInfo: {
        name: string;
        phoneNumber?: string;
        uid?: string;
        photoURL?: string | null;
        isGuest: boolean;
        isOnline?: boolean;
        lastSeen?: number;
    };
    messages?: { [messageId: string]: SupportMessage };
    lastMessage?: string;
    lastMessageTimestamp?: number;
    unreadForAdmin: boolean;
    unreadForUser: boolean;
}

export interface ElementStyle {
    fontSize?: number; // px
    width?: number; // px
    height?: number; // px
    marginTop?: number; // px
    marginBottom?: number; // px
}

export interface ThemedAsset {
    light?: string;
    dark?: string;
    common?: string;
}

export interface CustomElement {
    type: 'text' | 'image';
    content: string; // For text content
    imageContent?: ThemedAsset; // For image URLs
    style: ElementStyle;
}

export interface ThemedCustomElement {
    light?: CustomElement;
    dark?: CustomElement;
    common?: CustomElement;
}

export interface ThemeColors {
    primary: string;
    bubbleUserBg: string;
    bubbleUserText: string;
    bubbleOtherBg: string;
    bubbleOtherText: string;
}

export interface PremiumPlan {
    id: string;
    name: string;
    priceCurrency: string;
    priceValue: number;
    period: string;
    durationDays: number;
    discountText?: string;
    monthlyEquivalent?: string;
    originalPrice?: string;
}

export interface PremiumFeature {
    id: string;
    icon: string;
    title: string;
    description: string;
}

export interface PremiumHeaderImageSettings {
    url: string;
    width?: number;
    height?: number;
    marginTop?: number;
    marginBottom?: number;
}

export interface PremiumScreenSettings {
    starIcon: string;
    headerImage?: PremiumHeaderImageSettings;
    header: string;
    subHeader: string;
    plans: PremiumPlan[];
    features: PremiumFeature[];
}

export interface PaymentDetailField {
    id: string;
    label: string;
    value: string;
}

export interface PaymentSettings {
    instructions: string;
    qrCodeUrl: string;
    fields: PaymentDetailField[];
}

export interface AppSettings {
    appName: string;
    defaultTheme: 'light' | 'dark';
    lightThemeColors: ThemeColors;
    darkThemeColors: ThemeColors;
    logoURL?: ThemedAsset;
    loginTitle?: ThemedCustomElement;
    chatListTitle?: ThemedCustomElement;
    hideLoginLogo?: boolean;
    showGoogleLogin?: boolean;
    premiumScreen?: PremiumScreenSettings;
    paymentSettings?: PaymentSettings;
}

export interface PaymentRequest {
    id: string; // The request ID
    userId: string;
    userInfo: { // Denormalize user info for easy display
        displayName: string | null;
        photoURL: string | null;
        handle?: string;
    };
    plan: PremiumPlan; // Store the whole plan object
    submittedData: { // Data submitted by user
        transactionId: string;
        screenshotUrl?: string;
    };
    submittedAt: number;
    status: 'pending' | 'accepted' | 'rejected' | 'hold';
    reviewNote?: string; // Optional note from admin
    reviewedAt?: number;
    reviewedBy?: string; // Admin UID
}

export interface Sticker {
    id: string;
    url: string;
}

export interface StickerPack {
    id: string;
    name: string;
    coverStickerUrl: string;
    stickers: { [stickerId: string]: Sticker };
    ownerId?: string; // If it's a user-created pack
    ownerInfo?: {
        displayName: string;
        handle: string;
    };
    isPreMade?: boolean;
    isPublic?: boolean;
}