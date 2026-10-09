"use client"

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaAudio, MediaVideo } from '@/components/ui/chat-bar-media';
import {
  Send,
  MessageCircle,
  X,
  Phone,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Loader2,
  Search,
  ChevronLeft,
  Star,
  Pencil,
  Info,
  BellOff,
  Image as ImageIcon,
  Link2,
  FileText,
  ShieldAlert,
  UserX,
  Plus,
  Trash2,
  Paperclip,
  Smile,
  Square,
  MoreVertical,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { buildEncryptedAttachmentLine, encryptAttachmentBytes } from '@/lib/messaging-attachments-e2ee';
import { openAttachmentUrlWith, threadSharedKeyFrom } from '@/lib/messaging-attachment-open';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CALL_SIGNAL_EVENT,
  PRIVATE_CHANNEL_CONFIG,
  buildRtcConfiguration,
  callInboxTopic,
  createCallSignalSender,
  fetchRtcConfiguration,
  type CallSignalSender,
} from '@/lib/call-signalling';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CiviAssistantHeading, CiviAvatar, CiviInboxRow } from '@/components/ui/civi-avatar';
import { ChatMessageRow } from '@/components/ui/chat-message-row';
import { MessagingPeopleSearch } from '@/components/ui/messaging-people-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CIVI_ASSISTANT_DISPLAY_NAME,
  CIVI_ASSISTANT_USERNAME,
  CIVI_ASSISTANT_PROFILE_ID,
  resolveMessagingAvatarUrl,
} from '@/lib/messaging-constants';
import { shareCivizenInvite } from '@/lib/civizen-invite';
import {
  dialDigitsFromProfileCountry,
  phoneLookupCandidates,
  phonesLikelyMatch,
} from '@/lib/contact-phone';
import {
  deviceContactsAreAvailable,
  filterDeviceContacts,
  getDeviceContactsAccess,
  nativeDeviceContactsAreAvailable,
  pickWebContacts,
  readDeviceContacts,
  requestDeviceContactsAccess,
  type DeviceContact,
  type DeviceContactsAccess,
} from '@/lib/device-contacts';
import {
  DISAPPEARING_MINUTE_OPTIONS,
  MESSAGE_EDIT_WINDOW_MS,
  MESSAGE_UNSEND_WINDOW_MS,
  isAllowedDisappearingMinutes,
  isWithinMessageActionWindow,
  messageIsVisibleUnderDisappearing,
} from '@/lib/messaging-thread-policy';
import {
  buildSharedEncryptionKey,
  decryptUtf8Plaintext,
  decodePublicKeyBase64,
  encryptUtf8Plaintext,
  getDeviceMessagingSecretKey,
} from '@/lib/messaging-e2ee';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

function MessagingPageProfile() {
  return (
    <div data-testid="messaging-page-profile" className="shrink-0">
      <Suspense fallback={<div className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-card/60" />}>
        <UserPageMenu size="sm" />
      </Suspense>
    </div>
  );
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_edited: boolean | null;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface SavedContact {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface PrivateConversationRow {
  conversation_id: string;
  kind: string;
  peer_profile_id: string;
  peer_username: string | null;
  peer_full_name: string | null;
  peer_avatar_url: string | null;
  last_content: string | null;
  last_at: string | null;
  last_is_e2ee?: boolean;
  disappearing_minutes?: number | null;
  disappearing_started_at?: string | null;
}

interface PrivateMsgRow {
  id: string;
  content: string | null;
  message_kind: string | null;
  cipher_nonce: string | null;
  cipher_text: string | null;
  created_at: string;
  sender_id: string;
  is_edited: boolean | null;
  sender: Message['sender'];
}

const PRIVATE_MESSAGES_LIST_SELECT = `
          id,
          content,
          message_kind,
          cipher_nonce,
          cipher_text,
          created_at,
          sender_id,
          is_edited,
          sender:profiles!private_messages_sender_id_fkey(id, username, full_name, avatar_url)
        `;

function toDisplayMessage(
  row: PrivateMsgRow,
  t: (key: string) => string,
  peerPkB64: string | null,
  mySk: Uint8Array | null,
): Message {
  const peerPk = peerPkB64 ? decodePublicKeyBase64(peerPkB64) : null;
  const shared =
    peerPk && mySk && peerPk.length === 32 && mySk.length === 32
      ? buildSharedEncryptionKey(mySk, peerPk)
      : null;

  if (row.message_kind === 'e2ee_v1' && row.cipher_nonce && row.cipher_text && shared) {
    const plain = decryptUtf8Plaintext(row.cipher_nonce, row.cipher_text, shared);
    return {
      id: row.id,
      content: plain ?? t('chatBar.private.e2eeUndecryptable'),
      created_at: row.created_at,
      sender_id: row.sender_id,
      is_edited: row.is_edited,
      sender: row.sender,
    };
  }

  return {
    id: row.id,
    content: row.content ?? '',
    created_at: row.created_at,
    sender_id: row.sender_id,
    is_edited: row.is_edited,
    sender: row.sender,
  };
}

const MESSAGING_LAST_READ_PREFIX = 'messaging_last_read_v1';
const MESSAGING_FAVOURITES_PREFIX = 'messaging_favourites_v1';
const MESSAGING_MUTED_PREFIX = 'messaging_muted_threads_v1';
const MESSAGING_STARRED_PREFIX = 'messaging_starred_v1';
const MESSAGING_WALLPAPER_PREFIX = 'messaging_wallpaper_v1';

function profileStorageKey(prefix: string, profileId: string) {
  return `${prefix}:${profileId}`;
}

function loadLastReadMap(profileId: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(profileStorageKey(MESSAGING_LAST_READ_PREFIX, profileId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function loadFavouriteIdSet(profileId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(profileStorageKey(MESSAGING_FAVOURITES_PREFIX, profileId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function loadMutedIdSet(profileId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(profileStorageKey(MESSAGING_MUTED_PREFIX, profileId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function conversationStorageKey(prefix: string, profileId: string, conversationId: string) {
  return `${prefix}:${profileId}:${conversationId}`;
}

function loadStarredIdSet(profileId: string, conversationId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(
      conversationStorageKey(MESSAGING_STARRED_PREFIX, profileId, conversationId),
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function resolveConversationKind(
  conversationId: string,
  rows: PrivateConversationRow[],
  kindByIdRef: { current: Record<string, string> },
): string | null {
  const hit = rows.find((c) => c.conversation_id === conversationId);
  if (hit?.kind) return hit.kind;
  return kindByIdRef.current[conversationId] ?? null;
}

type MessagingTab = 'chats' | 'calls' | 'video';
type BaseInboxFilter = 'all' | 'unread' | 'favourites';
type InboxFilter = BaseInboxFilter | `custom:${string}`;

const SAVED_MESSAGING_CONTACTS_KEY = 'civizen-messaging-saved-contacts-v1';
const SAVED_CONTACTS_CAP = 40;
const MESSAGING_CUSTOM_GROUPS_PREFIX = 'civizen-messaging-custom-groups-v1:';

type CallMode = 'voice' | 'video';
type CallScope = 'direct' | 'group';
type CallStatus = 'idle' | 'ringing' | 'calling' | 'connecting' | 'connected';
type CallRole = 'caller' | 'participant';

interface CallSession {
  callId: string;
  mode: CallMode;
  scope: CallScope;
  role: CallRole;
  hostId: string;
  hostName: string;
  targetProfileId: string | null;
}

interface IncomingCall {
  callId: string;
  fromProfileId: string;
  fromName: string;
  mode: CallMode;
  scope: CallScope;
  hostId: string;
  targetProfileId: string | null;
}

interface CustomInboxGroup {
  id: string;
  name: string;
}

function loadCustomInboxGroups(profileId: string): CustomInboxGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${MESSAGING_CUSTOM_GROUPS_PREFIX}${profileId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const id = (entry as { id?: unknown }).id;
        const name = (entry as { name?: unknown }).name;
        if (typeof id !== 'string' || typeof name !== 'string') return null;
        const trimmedName = name.trim();
        if (!trimmedName) return null;
        return { id, name: trimmedName };
      })
      .filter((entry): entry is CustomInboxGroup => Boolean(entry));
  } catch {
    return [];
  }
}

function saveCustomInboxGroups(profileId: string, groups: CustomInboxGroup[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${MESSAGING_CUSTOM_GROUPS_PREFIX}${profileId}`, JSON.stringify(groups));
  } catch {
    /* ignore */
  }
}

interface CallSignalPayload {
  type: 'invite' | 'join' | 'decline' | 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  callId: string;
  fromProfileId: string;
  fromName: string;
  mode?: CallMode;
  scope?: CallScope;
  hostId?: string;
  toProfileId?: string | null;
  reason?: 'busy' | 'declined' | 'permissions' | 'timeout' | 'end-call' | 'leave' | 'full';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const CALL_RING_TIMEOUT_MS = 30_000;
const GROUP_VIDEO_MAX_PARTICIPANTS = 4;
const GROUP_VOICE_MAX_PARTICIPANTS = 8;

const MESSAGING_ATTACHMENTS_BUCKET = 'messaging-attachments';
const MAX_MESSAGING_UPLOAD_BYTES = 12 * 1024 * 1024;
const SIGNED_ATTACHMENT_TTL_SECONDS = 60 * 60 * 24 * 30;

const MESSAGING_EMOJI_PALETTE: string[] = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤪', '😝', '🤑', '🤗', '🤭', '🤔', '🤐', '😐', '😑', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🔥', '✨', '⭐', '🎉', '🙏', '👍', '👎', '👏', '🙌', '💪', '👋', '🫡', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '✅', '❌', '⚠️', '📎', '📷', '🎤', '💬',
];
const RTC_CONFIGURATION: RTCConfiguration = buildRtcConfiguration([]);

const getRandomId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getGroupParticipantCap = (mode: CallMode) =>
  mode === 'video' ? GROUP_VIDEO_MAX_PARTICIPANTS : GROUP_VOICE_MAX_PARTICIPANTS;

export type ChatBarVariant = 'floating' | 'page';

export function ChatBar({
  initialExpanded = false,
  variant = 'floating',
  routeConversationId = null,
  routeFocusMessageId = null,
}: {
  initialExpanded?: boolean;
  variant?: ChatBarVariant;
  routeConversationId?: string | null;
  routeFocusMessageId?: string | null;
} = {}) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<PrivateConversationRow[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const conversationKindByIdRef = useRef<Record<string, string>>({});
  const [peerMessagingPublicKeyB64, setPeerMessagingPublicKeyB64] = useState<string | null>(null);
  const [localMessagingSecretKey, setLocalMessagingSecretKey] = useState<Uint8Array | null>(null);
  const peerMessagingPublicKeyB64Ref = useRef<string | null>(null);
  const localMessagingSecretKeyRef = useRef<Uint8Array | null>(null);
  const rawPrivateRowsRef = useRef<PrivateMsgRow[]>([]);
  const [messagingTab, setMessagingTab] = useState<MessagingTab>('chats');
  const [messageSelectionMode, setMessageSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [threadProfileOpen, setThreadProfileOpen] = useState(false);
  const [searchInConversationOpen, setSearchInConversationOpen] = useState(false);
  const [searchOnlyStarred, setSearchOnlyStarred] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(() => new Set());
  const [wallpaperByConversation, setWallpaperByConversation] = useState<Record<string, string>>({});
  /** "Now" used to expire disappearing messages; refreshed on the purge interval below. */
  const [disappearingNowMs, setDisappearingNowMs] = useState(() => Date.now());
  const [disappearingBusy, setDisappearingBusy] = useState(false);
  const messageLongPressTimerRef = useRef<number | null>(null);
  const longPressConsumedClickRef = useRef(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const composerFileInputRef = useRef<HTMLInputElement>(null);
  const composerCameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<SavedContact[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);
  const [peopleSearchFocused, setPeopleSearchFocused] = useState(false);
  const [deviceContactsAccess, setDeviceContactsAccess] = useState<DeviceContactsAccess>('unsupported');
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [deviceContactsDismissed, setDeviceContactsDismissed] = useState(false);
  const [registeredPhoneProfiles, setRegisteredPhoneProfiles] = useState<
    Array<{
      phone_digits: string;
      profile_id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [selectedCallScope, setSelectedCallScope] = useState<CallScope>('direct');
  const [selectedTargetProfileId, setSelectedTargetProfileId] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callMode, setCallMode] = useState<CallMode | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contactSearchInputRef = useRef<HTMLInputElement>(null);
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const callSenderRef = useRef<CallSignalSender | null>(null);
  const rtcConfigurationRef = useRef<RTCConfiguration>(RTC_CONFIGURATION);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const activeCallRef = useRef<CallSession | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const callStatusRef = useRef<CallStatus>('idle');
  const ringTimeoutRef = useRef<number | null>(null);

  const currentUserName = profile?.full_name || profile?.username || t('chatBar.anonymous');

  const conversationCallTargets = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    for (const row of conversations) {
      if (row.kind !== 'direct') continue;
      if (row.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID) continue;
      out.push({
        id: row.peer_profile_id,
        name: row.peer_full_name || row.peer_username || t('chatBar.anonymous'),
      });
    }
    return out;
  }, [conversations, t]);

  const mergedCallTargets = useMemo(() => {
    const byId = new Map<string, string>();
    for (const contact of savedContacts) {
      if (!contact.id || contact.id === profile?.id) continue;
      byId.set(
        contact.id,
        contact.full_name || contact.username || t('chatBar.anonymous')
      );
    }
    for (const target of conversationCallTargets) {
      byId.set(target.id, target.name);
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [savedContacts, conversationCallTargets, profile?.id, t]);

  const directDmE2eeReady = useMemo(() => {
    if (!selectedConversationId) return false;
    const row = conversations.find((c) => c.conversation_id === selectedConversationId);
    if (!row || row.kind !== 'direct' || row.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID) return false;
    if (!localMessagingSecretKey || localMessagingSecretKey.length !== 32) return false;
    if (!peerMessagingPublicKeyB64) return false;
    const peerPk = decodePublicKeyBase64(peerMessagingPublicKeyB64);
    return Boolean(peerPk && peerPk.length === 32);
  }, [conversations, selectedConversationId, localMessagingSecretKey, peerMessagingPublicKeyB64]);

  const selectedConversationRow = useMemo(
    () =>
      selectedConversationId
        ? (conversations.find((c) => c.conversation_id === selectedConversationId) ?? null)
        : null,
    [conversations, selectedConversationId],
  );

  const isMessagingPage = variant === 'page';
  const isMessagingInbox = isMessagingPage && !routeConversationId;
  const isMessagingThread = isMessagingPage && Boolean(routeConversationId);
  const customGroupsStorageOwner = profile?.id ?? 'guest';

  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [customInboxGroups, setCustomInboxGroups] = useState<CustomInboxGroup[]>([]);
  const [inboxSearchOpen, setInboxSearchOpen] = useState(false);
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [lastReadAtByConversation, setLastReadAtByConversation] = useState<Record<string, string>>({});
  const [favouriteConversationIds, setFavouriteConversationIds] = useState<Set<string>>(() => new Set());
  const [mutedConversationIds, setMutedConversationIds] = useState<Set<string>>(() => new Set());
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [clearChatBusy, setClearChatBusy] = useState(false);
  const [hideChatConfirmOpen, setHideChatConfirmOpen] = useState(false);
  const [hideChatBusy, setHideChatBusy] = useState(false);
  const [blockedProfileIds, setBlockedProfileIds] = useState<Set<string>>(() => new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportTargetMessageId, setReportTargetMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) {
      setLastReadAtByConversation({});
      setFavouriteConversationIds(new Set());
      setMutedConversationIds(new Set());
      setBlockedProfileIds(new Set());
      setWallpaperByConversation({});
      return;
    }
    setLastReadAtByConversation(loadLastReadMap(profile.id));
    setFavouriteConversationIds(loadFavouriteIdSet(profile.id));
    setMutedConversationIds(loadMutedIdSet(profile.id));
    try {
      const wallpaperRaw = window.localStorage.getItem(
        profileStorageKey(MESSAGING_WALLPAPER_PREFIX, profile.id),
      );
      if (wallpaperRaw) {
        const parsed = JSON.parse(wallpaperRaw) as Record<string, unknown>;
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed ?? {})) {
          if (typeof value === 'string' && value.trim()) next[key] = value;
        }
        setWallpaperByConversation(next);
      } else {
        setWallpaperByConversation({});
      }
    } catch {
      setWallpaperByConversation({});
    }
  }, [profile?.id]);

  useEffect(() => {
    setCustomInboxGroups(loadCustomInboxGroups(customGroupsStorageOwner));
  }, [customGroupsStorageOwner]);

  useEffect(() => {
    if (!isMessagingInbox) {
      setInboxSearchOpen(false);
      setContactQuery('');
      return;
    }
    setInboxSearchOpen(false);
  }, [isMessagingInbox]);

  useEffect(() => {
    if (!profile?.id) {
      setBlockedProfileIds(new Set());
      return;
    }
    let cancelled = false;
    void Promise.resolve(supabase.rpc('private_list_my_blocked_profiles'))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          if (error) console.warn('ChatBar: failed to load blocked profiles', error);
          setBlockedProfileIds(new Set());
          return;
        }
        const next = new Set<string>();
        for (const row of data as Array<Record<string, unknown>>) {
          const id = row.blocked_profile_id;
          if (typeof id === 'string') next.add(id);
        }
        setBlockedProfileIds(next);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('ChatBar: failed to load blocked profiles', error);
          setBlockedProfileIds(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!isMessagingThread || !routeConversationId || !profile?.id) return;
    const iso = new Date().toISOString();
    setLastReadAtByConversation((prev) => {
      const next = { ...prev, [routeConversationId]: iso };
      try {
        window.localStorage.setItem(
          profileStorageKey(MESSAGING_LAST_READ_PREFIX, profile.id),
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [isMessagingThread, routeConversationId, profile?.id]);

  useEffect(() => {
    if (!isMessagingPage) return;
    setSelectedConversationId((prev) => {
      const next = routeConversationId ?? null;
      return prev === next ? prev : next;
    });
  }, [isMessagingPage, routeConversationId]);

  useEffect(() => {
    setMessageSelectionMode(false);
    setSelectedMessageIds(new Set());
    setEditingMessageId(null);
    setSearchInConversationOpen(false);
    setSearchOnlyStarred(false);
    setSearchQuery('');
    if (messageLongPressTimerRef.current !== null) {
      window.clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  }, [selectedConversationId, routeConversationId]);

  useEffect(() => {
    if (!profile?.id || !selectedConversationId) {
      setStarredMessageIds(new Set());
      return;
    }
    setStarredMessageIds(loadStarredIdSet(profile.id, selectedConversationId));
  }, [profile?.id, selectedConversationId]);

  useEffect(() => {
    for (const row of conversations) {
      conversationKindByIdRef.current[row.conversation_id] = row.kind;
    }
  }, [conversations]);

  useEffect(() => {
    if (!isMessagingThread || !routeConversationId) return;
    const row = conversations.find((c) => c.conversation_id === routeConversationId);
    if (row?.kind === 'direct') {
      setSelectedTargetProfileId(row.peer_profile_id);
      setSelectedCallScope('direct');
    }
  }, [isMessagingThread, routeConversationId, conversations]);

  useEffect(() => {
    if (isMessagingPage) return;
    if (!selectedConversationId) {
      setMessagingTab('chats');
    }
  }, [isMessagingPage, selectedConversationId]);

  const openPrivateThread = useCallback(
    (conversationId: string, peerProfileId?: string | null) => {
      if (variant === 'page') {
        navigate(`/messaging/${conversationId}`);
        return;
      }
      setSelectedConversationId(conversationId);
      if (peerProfileId) {
        setSelectedTargetProfileId(peerProfileId);
      }
    },
    [variant, navigate],
  );

  const toggleFavouriteConversation = useCallback(
    (conversationId: string) => {
      if (!profile?.id) return;
      setFavouriteConversationIds((prev) => {
        const next = new Set(prev);
        if (next.has(conversationId)) next.delete(conversationId);
        else next.add(conversationId);
        try {
          window.localStorage.setItem(
            profileStorageKey(MESSAGING_FAVOURITES_PREFIX, profile.id),
            JSON.stringify([...next]),
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [profile?.id],
  );

  const toggleMuteConversation = useCallback((conversationId: string) => {
    if (!profile?.id) return;
    setMutedConversationIds((prev) => {
      const wasMuted = prev.has(conversationId);
      const next = new Set(prev);
      if (wasMuted) next.delete(conversationId);
      else next.add(conversationId);
      try {
        window.localStorage.setItem(
          profileStorageKey(MESSAGING_MUTED_PREFIX, profile.id),
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      queueMicrotask(() => {
        toast.info(
          wasMuted
            ? tRef.current('chatBar.inbox.menu.unmuteDone')
            : tRef.current('chatBar.inbox.menu.muteDone'),
        );
      });
      return next;
    });
  }, [profile?.id]);

  const toggleBlockedProfile = useCallback(
    async (targetProfileId: string) => {
      if (!profile?.id) return;
      const wasBlocked = blockedProfileIds.has(targetProfileId);
      const { error } = wasBlocked
        ? await supabase.rpc('private_unblock_profile', { target_profile_id: targetProfileId })
        : await supabase.rpc('private_block_profile', { target_profile_id: targetProfileId });
      if (error) {
        console.error('ChatBar: toggle block failed', error);
        toast.error(tRef.current('chatBar.private.profile.blockActionFailed'));
        return;
      }
      setBlockedProfileIds((prev) => {
        const next = new Set(prev);
        if (wasBlocked) next.delete(targetProfileId);
        else next.add(targetProfileId);
        return next;
      });
      toast.info(
        wasBlocked
          ? tRef.current('chatBar.private.profile.unblockDone')
          : tRef.current('chatBar.private.profile.blockDone'),
      );
    },
    [blockedProfileIds, profile?.id],
  );

  const civiListRow = useMemo(
    () =>
      conversations.find(
        (r) => r.kind === 'agent' && r.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID,
      ) ?? null,
    [conversations],
  );

  const dmRowsWithoutCivi = useMemo(
    () =>
      conversations.filter(
        (row) => !(row.kind === 'agent' && row.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID),
      ),
    [conversations],
  );

  const filteredDmRows = useMemo(() => {
    if (inboxFilter.startsWith('custom:')) {
      const group = customInboxGroups.find((entry) => `custom:${entry.id}` === inboxFilter);
      if (!group) return dmRowsWithoutCivi;
      const q = group.name.trim().toLowerCase();
      if (!q) return dmRowsWithoutCivi;
      return dmRowsWithoutCivi.filter((row) =>
        `${row.peer_full_name ?? ''} ${row.peer_username ?? ''} ${row.last_content ?? ''}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (inboxFilter === 'favourites') {
      return dmRowsWithoutCivi.filter((r) => favouriteConversationIds.has(r.conversation_id));
    }
    if (inboxFilter === 'unread') {
      return dmRowsWithoutCivi.filter((r) => {
        if (!r.last_at) return false;
        const readAt = lastReadAtByConversation[r.conversation_id];
        if (!readAt) return true;
        return new Date(r.last_at) > new Date(readAt);
      });
    }
    return dmRowsWithoutCivi;
  }, [dmRowsWithoutCivi, inboxFilter, favouriteConversationIds, lastReadAtByConversation, customInboxGroups]);

  const createCustomInboxGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    setCustomInboxGroups((prev) => {
      const lowered = name.toLowerCase();
      const existing = prev.find((entry) => entry.name.toLowerCase() === lowered);
      const next = existing
        ? prev
        : [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name }];
      saveCustomInboxGroups(customGroupsStorageOwner, next);
      const target = existing ?? next[next.length - 1];
      if (target) setInboxFilter(`custom:${target.id}`);
      setNewGroupName('');
      setAddGroupDialogOpen(false);
      if (existing) {
        toast.info('Group already exists.');
      } else {
        toast.success('Group added.');
      }
      return next;
    });
  }, [customGroupsStorageOwner, newGroupName]);

  const showCiviPinnedInInbox = useMemo(() => {
    if (inboxFilter === 'all') return true;
    if (!civiListRow) return true;
    if (inboxFilter === 'favourites') {
      return favouriteConversationIds.has(civiListRow.conversation_id);
    }
    if (inboxFilter === 'unread') {
      if (!civiListRow.last_at) return false;
      const readAt = lastReadAtByConversation[civiListRow.conversation_id];
      if (!readAt) return true;
      return new Date(civiListRow.last_at) > new Date(readAt);
    }
    return true;
  }, [inboxFilter, civiListRow, favouriteConversationIds, lastReadAtByConversation]);

  const threadPeerTitle = useMemo(() => {
    if (selectedConversationRow) {
      if (
        selectedConversationRow.kind === 'agent' &&
        selectedConversationRow.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID
      ) {
        return t('chatBar.private.civiPinnedLabel');
      }
      return (
        selectedConversationRow.peer_full_name ||
        selectedConversationRow.peer_username ||
        t('chatBar.anonymous')
      );
    }
    if (routeConversationId) {
      const k = resolveConversationKind(routeConversationId, conversations, conversationKindByIdRef);
      if (k === 'agent') {
        return t('chatBar.private.civiPinnedLabel');
      }
    }
    return t('chatBar.inbox.threadLoadingTitle');
  }, [selectedConversationRow, conversations, routeConversationId, t]);

  const threadMemberProfileId = selectedConversationRow?.peer_profile_id ?? null;
  const isDirectThread = selectedConversationRow?.kind === 'direct';
  const isThreadAgent = Boolean(
    selectedConversationRow &&
      selectedConversationRow.kind === 'agent' &&
      selectedConversationRow.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID,
  );
  const threadAvatarUrl = resolveMessagingAvatarUrl(
    selectedConversationRow?.peer_profile_id,
    selectedConversationRow?.peer_avatar_url,
  );
  const threadUsername = selectedConversationRow?.peer_username?.trim() || null;
  const isThreadBlocked = Boolean(threadMemberProfileId && blockedProfileIds.has(threadMemberProfileId));
  const activeDisappearingMinutes = selectedConversationRow?.disappearing_minutes ?? 0;
  const activeDisappearingStartedAt = selectedConversationRow?.disappearing_started_at ?? null;
  const activeWallpaper = selectedConversationId
    ? wallpaperByConversation[selectedConversationId] ?? 'default'
    : 'default';

  const disappearingDurationLabel = (minutes: number) => {
    if (minutes <= 0) return t('chatBar.private.profile.disappearOff');
    if (minutes < 1440) return t('chatBar.private.profile.disappearHours', { hours: minutes / 60 });
    return t('chatBar.private.profile.disappearDays', { days: minutes / 1440 });
  };

  const setDisappearingMinutes = useCallback(
    async (minutes: number) => {
      if (!profile?.id || !selectedConversationId || !isDirectThread) return;
      if (!isAllowedDisappearingMinutes(minutes)) return;
      setDisappearingBusy(true);
      try {
        const { error } = await supabase.rpc('private_set_conversation_disappearing', {
          p_conversation_id: selectedConversationId,
          p_minutes: minutes,
        });
        if (error) {
          const reason = error.message?.trim();
          toast.error(
            reason
              ? tRef.current('chatBar.private.profile.disappearingFailedWithReason', { reason })
              : tRef.current('chatBar.private.profile.disappearingFailed'),
          );
          return;
        }
        const startedAt = minutes > 0 ? new Date().toISOString() : null;
        setConversations((prev) =>
          prev.map((row) =>
            row.conversation_id === selectedConversationId
              ? { ...row, disappearing_minutes: minutes, disappearing_started_at: startedAt }
              : row,
          ),
        );
        toast.success(
          minutes > 0
            ? tRef.current('chatBar.private.profile.disappearingUpdated')
            : tRef.current('chatBar.private.profile.disappearingOff'),
        );
      } finally {
        setDisappearingBusy(false);
      }
    },
    [isDirectThread, profile?.id, selectedConversationId],
  );

  const setWallpaperTheme = useCallback(
    (theme: 'default' | 'mesh' | 'aurora' | 'paper') => {
      if (!profile?.id || !selectedConversationId) return;
      setWallpaperByConversation((prev) => {
        const next = { ...prev, [selectedConversationId]: theme };
        try {
          window.localStorage.setItem(
            profileStorageKey(MESSAGING_WALLPAPER_PREFIX, profile.id),
            JSON.stringify(next),
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [profile?.id, selectedConversationId],
  );

  const submitContactReport = useCallback(async () => {
    if (!profile?.id || !threadMemberProfileId || isThreadAgent) return;
    const reason = reportReason.trim();
    if (reason.length < 6) {
      toast.error(tRef.current('chatBar.private.profile.reportReasonTooShort'));
      return;
    }
    const targetMessage = reportTargetMessageId
      ? messages.find((message) => message.id === reportTargetMessageId) ?? null
      : null;
    const reportContext: Json = targetMessage
      ? {
          source: 'private_message',
          conversation_id: selectedConversationId,
          message_id: targetMessage.id,
          message_created_at: targetMessage.created_at,
          message_sender_id: targetMessage.sender_id,
          message_excerpt: (targetMessage.content || '').slice(0, 300),
        }
      : {
          source: 'private_contact',
          conversation_id: selectedConversationId,
        };
    setReportSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: profile.id,
      reported_user_id: threadMemberProfileId,
      reason,
      status: 'pending',
      report_context: reportContext,
    });
    setReportSubmitting(false);
    if (error) {
      console.error('ChatBar: report submit failed', error);
      toast.error(tRef.current('chatBar.private.profile.reportSubmitFailed'));
      return;
    }
    setReportDialogOpen(false);
    setReportReason('');
    setReportTargetMessageId(null);
    toast.success(tRef.current('chatBar.private.profile.reportSubmitted'));
  }, [isThreadAgent, messages, profile?.id, reportReason, reportTargetMessageId, selectedConversationId, threadMemberProfileId]);

  const threadMediaLinks = useMemo(() => {
    const rows: Array<{ id: string; created_at: string; url: string; kind: 'image' | 'link' | 'file' }> = [];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    for (const m of messages) {
      const body = m.content || '';
      const urls = body.match(urlRegex) ?? [];
      for (const url of urls) {
        const lower = url.toLowerCase();
        if (body.startsWith('📷 ') || /\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) {
          rows.push({ id: m.id, created_at: m.created_at, url, kind: 'image' });
        } else if (body.startsWith('📎 ') || body.startsWith('🎤 ')) {
          rows.push({ id: m.id, created_at: m.created_at, url, kind: 'file' });
        } else {
          rows.push({ id: m.id, created_at: m.created_at, url, kind: 'link' });
        }
      }
    }
    return rows;
  }, [messages]);

  const threadMediaCounts = useMemo(() => {
    let images = 0;
    let links = 0;
    let files = 0;
    for (const row of threadMediaLinks) {
      if (row.kind === 'image') images += 1;
      else if (row.kind === 'file') files += 1;
      else links += 1;
    }
    return { images, links, files };
  }, [threadMediaLinks]);

  const visibleMessages = useMemo(() => {
    let filtered = messages.filter((m) =>
      messageIsVisibleUnderDisappearing({
        createdAt: m.created_at,
        disappearingMinutes: activeDisappearingMinutes,
        disappearingStartedAt: activeDisappearingStartedAt,
        nowMs: disappearingNowMs,
      }),
    );
    if (searchOnlyStarred) {
      filtered = filtered.filter((m) => starredMessageIds.has(m.id));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((m) => (m.content || '').toLowerCase().includes(q));
  }, [
    activeDisappearingMinutes,
    activeDisappearingStartedAt,
    disappearingNowMs,
    messages,
    searchOnlyStarred,
    searchQuery,
    starredMessageIds,
  ]);

  const starredMessages = useMemo(
    () => messages.filter((m) => starredMessageIds.has(m.id)),
    [messages, starredMessageIds],
  );

  const messageWallpaperClass =
    activeWallpaper === 'mesh'
      ? 'bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.16),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.14),transparent_35%)]'
      : activeWallpaper === 'aurora'
        ? 'bg-[linear-gradient(135deg,rgba(20,184,166,0.14),rgba(14,165,233,0.12),rgba(168,85,247,0.1))]'
        : activeWallpaper === 'paper'
          ? 'bg-[repeating-linear-gradient(0deg,rgba(148,163,184,0.08),rgba(148,163,184,0.08)_1px,transparent_1px,transparent_24px)]'
          : '';

  const exportCurrentChat = useCallback(() => {
    if (!selectedConversationId) {
      toast.info(tRef.current('chatBar.inbox.menu.exportNeedsThread'));
      return;
    }
    if (!messages.length) {
      toast.info(tRef.current('chatBar.inbox.menu.exportEmpty'));
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      conversationId: selectedConversationId,
      title: threadPeerTitle,
      messages: messages.map((m) => ({
        id: m.id,
        at: m.created_at,
        from: m.sender?.full_name || m.sender?.username || '',
        text: m.content,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civizen-chat-${selectedConversationId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(tRef.current('chatBar.inbox.menu.exportDone'));
  }, [selectedConversationId, messages, threadPeerTitle]);

  const handleClearChatConfirmed = useCallback(async () => {
    if (!profile?.id || !selectedConversationId) {
      setClearChatConfirmOpen(false);
      return;
    }
    const convId = selectedConversationId;
    const kind = resolveConversationKind(convId, conversations, conversationKindByIdRef);
    if (kind !== 'agent') {
      setClearChatConfirmOpen(false);
      return;
    }
    setClearChatBusy(true);
    try {
      const { error } = await supabase.from('private_messages').delete().eq('conversation_id', convId);
      if (error) {
        console.error('ChatBar: clear chat delete failed', error);
        const reason = error.message?.trim();
        toast.error(
          reason
            ? tRef.current('chatBar.inbox.menu.clearChatFailedWithReason', { reason })
            : tRef.current('chatBar.inbox.menu.clearChatFailed'),
        );
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('private_messages')
        .select(PRIVATE_MESSAGES_LIST_SELECT)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (fetchError) {
        console.error('ChatBar: clear chat refetch failed', fetchError);
        rawPrivateRowsRef.current = [];
        setMessages([]);
      } else {
        const refetchedRows = (data ?? []) as PrivateMsgRow[];
        rawPrivateRowsRef.current = refetchedRows;
        setMessages(
          refetchedRows.map((row) =>
            toDisplayMessage(
              row,
              (key) => tRef.current(key),
              peerMessagingPublicKeyB64Ref.current,
              localMessagingSecretKeyRef.current,
            ),
          ),
        );
      }

      toast.success(tRef.current('chatBar.inbox.menu.clearChatDone'));

      const { data: list } = await supabase.rpc('private_list_my_conversations');
      if (list) setConversations(list as PrivateConversationRow[]);
    } finally {
      setClearChatBusy(false);
      setClearChatConfirmOpen(false);
    }
  }, [profile?.id, selectedConversationId, conversations]);

  const handleHideChatConfirmed = useCallback(async () => {
    if (!profile?.id || !selectedConversationId || !isDirectThread) {
      setHideChatConfirmOpen(false);
      return;
    }
    const convId = selectedConversationId;
    setHideChatBusy(true);
    try {
      const { error } = await supabase.rpc('private_hide_my_conversation', {
        p_conversation_id: convId,
      });
      if (error) {
        const reason = error.message?.trim();
        toast.error(
          reason
            ? tRef.current('chatBar.inbox.menu.hideChatFailedWithReason', { reason })
            : tRef.current('chatBar.inbox.menu.hideChatFailed'),
        );
        return;
      }
      setConversations((prev) => prev.filter((row) => row.conversation_id !== convId));
      toast.success(tRef.current('chatBar.inbox.menu.hideChatDone'));
      if (variant === 'page') {
        navigate('/messaging');
      } else {
        setSelectedConversationId(null);
      }
    } finally {
      setHideChatBusy(false);
      setHideChatConfirmOpen(false);
    }
  }, [isDirectThread, profile?.id, selectedConversationId, variant, navigate]);

  const isAgentThread = useMemo(() => {
    if (!routeConversationId) return false;
    return (
      resolveConversationKind(routeConversationId, conversations, conversationKindByIdRef) === 'agent'
    );
  }, [routeConversationId, conversations]);

  peerMessagingPublicKeyB64Ref.current = peerMessagingPublicKeyB64;
  localMessagingSecretKeyRef.current = localMessagingSecretKey;

  const remoteStreamEntries = useMemo(
    () => Object.entries(remoteStreams),
    [remoteStreams]
  );

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVED_MESSAGING_CONTACTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const next: SavedContact[] = [];
      for (const row of parsed) {
        if (
          row &&
          typeof row === 'object' &&
          'id' in row &&
          typeof (row as SavedContact).id === 'string'
        ) {
          const c = row as SavedContact;
          next.push({
            id: c.id,
            username: c.username ?? null,
            full_name: c.full_name ?? null,
            avatar_url: c.avatar_url ?? null,
          });
        }
      }
      setSavedContacts(next.slice(0, SAVED_CONTACTS_CAP));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (selectedCallScope !== 'direct') return;
    if (mergedCallTargets.length === 0) {
      if (selectedTargetProfileId) setSelectedTargetProfileId('');
      return;
    }

    const selectedStillExists = mergedCallTargets.some(
      (target) => target.id === selectedTargetProfileId
    );
    if (!selectedStillExists) {
      setSelectedTargetProfileId(mergedCallTargets[0].id);
    }
  }, [selectedCallScope, mergedCallTargets, selectedTargetProfileId]);

  useEffect(() => {
    if (!profile?.id) {
      setContactResults([]);
      return;
    }

    const q = contactQuery.trim();
    if (q.length < 2) {
      setContactResults([]);
      setContactSearchLoading(false);
      return;
    }

    setContactSearchLoading(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .neq('id', profile.id)
          .neq('id', CIVI_ASSISTANT_PROFILE_ID)
          .limit(12);

        if (!error && data) {
          setContactResults(data as SavedContact[]);
        } else {
          setContactResults([]);
        }
        setContactSearchLoading(false);
      })();
    }, 300);

    return () => window.clearTimeout(handle);
  }, [contactQuery, profile?.id]);

  const contactsPromptActive =
    peopleSearchFocused ||
    (isMessagingInbox && inboxSearchOpen) ||
    contactQuery.trim().length >= 2;

  useEffect(() => {
    if (!profile?.id || !contactsPromptActive) return;
    let cancelled = false;
    void getDeviceContactsAccess().then((access) => {
      if (!cancelled) setDeviceContactsAccess(access);
    });
    return () => {
      cancelled = true;
    };
  }, [contactsPromptActive, profile?.id]);

  const loadRegisteredFromDeviceContacts = useCallback(
    async (contacts: DeviceContact[]) => {
      if (!profile?.id || contacts.length === 0) {
        setRegisteredPhoneProfiles([]);
        return;
      }
      const dial = dialDigitsFromProfileCountry(profile.phone_country_code || profile.country_code);
      const phones = [
        ...new Set(
          contacts.flatMap((contact) =>
            contact.phones.flatMap((phone) => phoneLookupCandidates(phone, dial)),
          ),
        ),
      ].slice(0, 300);
      if (!phones.length) {
        setRegisteredPhoneProfiles([]);
        return;
      }
      const { data, error } = await supabase.rpc('lookup_civizen_contacts_by_phone', { p_phones: phones });
      if (error || !data) {
        console.warn('ChatBar: contact phone lookup skipped', error);
        setRegisteredPhoneProfiles([]);
        return;
      }
      setRegisteredPhoneProfiles(data);
    },
    [profile?.country_code, profile?.id, profile?.phone_country_code],
  );

  const refreshDeviceContacts = useCallback(async () => {
    try {
      const contacts = await readDeviceContacts();
      setDeviceContacts(contacts);
      await loadRegisteredFromDeviceContacts(contacts);
    } catch (error) {
      console.warn('ChatBar: device contacts failed', error);
      setDeviceContactsAccess('denied');
    }
  }, [loadRegisteredFromDeviceContacts]);

  useEffect(() => {
    if (deviceContactsAccess !== 'granted' || deviceContacts.length > 0) return;
    void refreshDeviceContacts();
  }, [deviceContactsAccess, deviceContacts.length, refreshDeviceContacts]);

  const defaultDialDigits = dialDigitsFromProfileCountry(
    profile?.phone_country_code || profile?.country_code,
  );
  const filteredDeviceContacts = useMemo(
    () => filterDeviceContacts(deviceContacts, contactQuery),
    [contactQuery, deviceContacts],
  );
  const registeredDeviceContacts = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      deviceName: string;
    }> = [];
    for (const contact of filteredDeviceContacts) {
      const match = registeredPhoneProfiles.find((row) =>
        contact.phones.some((phone) => phonesLikelyMatch(phone, row.phone_digits, defaultDialDigits)),
      );
      if (!match || seen.has(match.profile_id)) continue;
      seen.add(match.profile_id);
      rows.push({
        id: match.profile_id,
        username: match.username,
        full_name: match.full_name,
        avatar_url: match.avatar_url,
        deviceName: contact.name,
      });
    }
    return rows;
  }, [defaultDialDigits, filteredDeviceContacts, registeredPhoneProfiles]);
  const inviteDeviceContacts = useMemo(
    () =>
      filteredDeviceContacts.filter(
        (contact) =>
          !registeredPhoneProfiles.some((row) =>
            contact.phones.some((phone) => phonesLikelyMatch(phone, row.phone_digits, defaultDialDigits)),
          ),
      ),
    [defaultDialDigits, filteredDeviceContacts, registeredPhoneProfiles],
  );

  useEffect(() => {
    if (!profile?.id) {
      setLocalMessagingSecretKey(null);
      return;
    }
    let cancelled = false;
    void getDeviceMessagingSecretKey(profile.id).then((sk) => {
      if (!cancelled) setLocalMessagingSecretKey(sk);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !selectedConversationId) {
      setPeerMessagingPublicKeyB64(null);
      return;
    }
    const sel = conversations.find((c) => c.conversation_id === selectedConversationId);
    if (!sel || sel.kind !== 'direct' || sel.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID) {
      setPeerMessagingPublicKeyB64(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('messaging_x25519_public_key')
        .eq('id', sel.peer_profile_id)
        .single();
      if (cancelled) return;
      if (error || !data?.messaging_x25519_public_key) {
        setPeerMessagingPublicKeyB64(null);
        return;
      }
      setPeerMessagingPublicKeyB64(String(data.messaging_x25519_public_key));
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, selectedConversationId, conversations]);

  useEffect(() => {
    if (!rawPrivateRowsRef.current.length) return;
    setMessages((prev) => {
      const mapped = rawPrivateRowsRef.current.map((row) =>
        toDisplayMessage(
          row,
          (key) => tRef.current(key),
          peerMessagingPublicKeyB64Ref.current,
          localMessagingSecretKeyRef.current,
        ),
      );
      const locals = prev.filter((m) => m.id.startsWith('local-') || m.id.startsWith('failed-'));
      return [...mapped, ...locals];
    });
  }, [peerMessagingPublicKeyB64, localMessagingSecretKey]);

  useEffect(() => {
    if (!profile?.id) {
      setConversations([]);
      setSelectedConversationId(null);
      setLoading(false);
      setConversationsLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setConversationsLoading(true);
      try {
        const { data, error } = await supabase.rpc('private_list_my_conversations');
        if (cancelled) return;
        if (error) {
          console.error('ChatBar: list conversations failed', error);
          const reason = error.message?.trim();
          toast.error(
            reason
              ? tRef.current('chatBar.private.loadFailedWithReason', { reason })
              : tRef.current('chatBar.private.loadFailed'),
          );
          setConversations([]);
          return;
        }

        let rows = (data ?? []) as PrivateConversationRow[];
        if (!rows.some((r) => r.kind === 'agent')) {
          const { error: agentErr } = await supabase.rpc('private_get_or_create_agent_conversation');
          if (agentErr) {
            console.error('ChatBar: ensure Civi conversation failed', agentErr);
          } else {
            const { data: again } = await supabase.rpc('private_list_my_conversations');
            if (!cancelled && again) {
              rows = again as PrivateConversationRow[];
            }
          }
        }

        if (cancelled) return;
        for (const r of rows) {
          conversationKindByIdRef.current[r.conversation_id] = r.kind;
        }
        setConversations(rows);
        if (variant !== 'page') {
          setSelectedConversationId((prev) => {
            if (prev && rows.some((r) => r.conversation_id === prev)) return prev;
            const agent = rows.find((r) => r.kind === 'agent');
            return agent?.conversation_id ?? rows[0]?.conversation_id ?? null;
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('ChatBar: list conversations crashed', err);
        toast.error(tRef.current('chatBar.private.loadFailed'));
        setConversations([]);
      } finally {
        if (!cancelled) {
          setConversationsLoading(false);
        }
      }
    })();

    const unsubscribeCallSignals = subscribeToCallSignals();

    return () => {
      cancelled = true;
      unsubscribeCallSignals();
      void hangupActiveCall(false);
    };
    // Intentionally narrow deps: subscribeToCallSignals/hangupActiveCall would change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, variant]);

  useEffect(() => {
    if (!profile?.id || !selectedConversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { error: purgeError } = await supabase.rpc('private_purge_expired_disappearing_messages', {
        p_conversation_id: selectedConversationId,
      });
      if (purgeError) {
        console.warn('ChatBar: disappearing purge skipped', purgeError);
      }
      const { data: conversationRow, error: conversationError } = await supabase
        .from('private_conversations')
        .select('disappearing_minutes, disappearing_started_at')
        .eq('id', selectedConversationId)
        .maybeSingle();
      if (conversationError) {
        console.warn('ChatBar: conversation settings skipped', conversationError);
      } else if (!cancelled && conversationRow) {
        setConversations((prev) =>
          prev.map((row) =>
            row.conversation_id === selectedConversationId
              ? {
                  ...row,
                  disappearing_minutes: conversationRow.disappearing_minutes ?? 0,
                  disappearing_started_at: conversationRow.disappearing_started_at ?? null,
                }
              : row,
          ),
        );
      }

      const { data, error } = await supabase
        .from('private_messages')
        .select(PRIVATE_MESSAGES_LIST_SELECT)
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (cancelled) return;
      if (error) {
        console.error('ChatBar: fetch private messages failed', error);
        rawPrivateRowsRef.current = [];
        setMessages([]);
      } else {
        const rows = (data ?? []) as PrivateMsgRow[];
        rawPrivateRowsRef.current = rows;
        setMessages(
          rows.map((row) =>
            toDisplayMessage(
              row,
              (key) => tRef.current(key),
              peerMessagingPublicKeyB64Ref.current,
              localMessagingSecretKeyRef.current,
            ),
          ),
        );
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`private-messages-${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const insertedId = (payload.new as { id?: string }).id;
          if (!insertedId) return;
          void supabase
            .from('private_messages')
            .select(PRIVATE_MESSAGES_LIST_SELECT)
            .eq('id', insertedId)
            .single()
            .then(({ data: row }) => {
              if (!row) return;
              const pr = row as PrivateMsgRow;
              if (!rawPrivateRowsRef.current.some((r) => r.id === pr.id)) {
                rawPrivateRowsRef.current = [...rawPrivateRowsRef.current, pr];
              }
              const display = toDisplayMessage(
                pr,
                (key) => tRef.current(key),
                peerMessagingPublicKeyB64Ref.current,
                localMessagingSecretKeyRef.current,
              );
              setMessages((prev) => {
                if (prev.some((m) => m.id === display.id)) return prev;
                return [...prev, display];
              });
            });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const updatedId = (payload.new as { id?: string })?.id;
          if (!updatedId) return;
          void supabase
            .from('private_messages')
            .select(PRIVATE_MESSAGES_LIST_SELECT)
            .eq('id', updatedId)
            .single()
            .then(({ data: row }) => {
              if (!row) return;
              const pr = row as PrivateMsgRow;
              rawPrivateRowsRef.current = rawPrivateRowsRef.current.map((r) => (r.id === pr.id ? pr : r));
              const display = toDisplayMessage(
                pr,
                (key) => tRef.current(key),
                peerMessagingPublicKeyB64Ref.current,
                localMessagingSecretKeyRef.current,
              );
              setMessages((prev) => prev.map((m) => (m.id === display.id ? display : m)));
            });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (!deletedId) return;
          rawPrivateRowsRef.current = rawPrivateRowsRef.current.filter((r) => r.id !== deletedId);
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_conversations',
          filter: `id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const next = payload.new as {
            disappearing_minutes?: number | null;
            disappearing_started_at?: string | null;
          };
          setConversations((prev) =>
            prev.map((row) =>
              row.conversation_id === selectedConversationId
                ? {
                    ...row,
                    disappearing_minutes: next.disappearing_minutes ?? 0,
                    disappearing_started_at: next.disappearing_started_at ?? null,
                  }
                : row,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || activeDisappearingMinutes <= 0) return;
    setDisappearingNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setDisappearingNowMs(Date.now());
      void supabase.rpc('private_purge_expired_disappearing_messages', {
        p_conversation_id: selectedConversationId,
      });
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [activeDisappearingMinutes, selectedConversationId]);

  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const viewport =
      root.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? root;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!routeFocusMessageId) return;
    if (!selectedConversationId || !routeConversationId) return;
    if (selectedConversationId !== routeConversationId) return;
    if (!messages.some((message) => message.id === routeFocusMessageId)) return;
    const target = messageRowRefs.current[routeFocusMessageId];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(routeFocusMessageId);
    const timeout = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === routeFocusMessageId ? null : current));
    }, 2600);
    return () => window.clearTimeout(timeout);
  }, [messages, routeConversationId, routeFocusMessageId, selectedConversationId]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current !== null) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const closePeerConnection = (peerId: string) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    if (!peerConnection) return;

    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    peerConnectionsRef.current.delete(peerId);
    pendingIceCandidatesRef.current.delete(peerId);
  };

  const removePeerFromCall = (peerId: string) => {
    closePeerConnection(peerId);

    setRemoteStreams((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });

    setPeerNames((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });

    const session = activeCallRef.current;
    if (!session) return;

    if (peerConnectionsRef.current.size === 0) {
      if (session.scope === 'direct') {
        toast.info(t('chatBar.calls.ended'));
        resetCallState();
      } else if (callStatusRef.current !== 'calling') {
        setCallStatus('connecting');
      }
    }
  };

  const closeAllPeerConnections = () => {
    for (const peerId of peerConnectionsRef.current.keys()) {
      closePeerConnection(peerId);
    }
    setRemoteStreams({});
    setPeerNames({});
  };

  const releaseMediaTracks = () => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
    }
    localStreamRef.current = null;
    setLocalStream(null);
  };

  const resetCallState = () => {
    clearRingTimeout();
    closeAllPeerConnections();
    releaseMediaTracks();
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
    setCallMode(null);
    setIsMuted(false);
    setIsCameraEnabled(true);
  };

  const refreshRtcConfiguration = async () => {
    rtcConfigurationRef.current = await fetchRtcConfiguration(supabase);
  };

  const sendCallSignal = async (payload: CallSignalPayload) => {
    if (!callChannelRef.current) return;
    await callSenderRef.current?.send(payload);
  };

  const queueIceCandidate = (peerId: string, candidate: RTCIceCandidateInit) => {
    const queue = pendingIceCandidatesRef.current.get(peerId) || [];
    queue.push(candidate);
    pendingIceCandidatesRef.current.set(peerId, queue);
  };

  const flushPendingIceCandidates = async (peerId: string, peerConnection: RTCPeerConnection) => {
    const queue = pendingIceCandidatesRef.current.get(peerId) || [];
    pendingIceCandidatesRef.current.delete(peerId);

    for (const candidate of queue) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('ChatBar: Failed to flush queued ICE candidate:', error);
      }
    }
  };

  const ensureLocalStream = async (mode: CallMode) => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not available');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video:
        mode === 'video'
          ? {
              facingMode: 'user',
              width: { ideal: 960 },
              height: { ideal: 540 },
            }
          : false,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsMuted(false);
    setIsCameraEnabled(mode === 'video');
    return stream;
  };

  const addStreamTracks = (peerConnection: RTCPeerConnection, stream: MediaStream) => {
    const existingTrackIds = new Set(
      peerConnection
        .getSenders()
        .map((sender) => sender.track?.id)
        .filter((trackId): trackId is string => Boolean(trackId))
    );

    for (const track of stream.getTracks()) {
      if (existingTrackIds.has(track.id)) continue;
      peerConnection.addTrack(track, stream);
    }
  };

  const ensurePeerConnection = async (session: CallSession, peerId: string, peerName: string) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const peerConnection = new RTCPeerConnection(rtcConfigurationRef.current);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !profile?.id) return;
      void sendCallSignal({
        type: 'ice-candidate',
        callId: session.callId,
        fromProfileId: profile.id,
        fromName: currentUserName,
        toProfileId: peerId,
        candidate: event.candidate.toJSON(),
      });
    };

    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      setRemoteStreams((prev) =>
        prev[peerId] === stream ? prev : { ...prev, [peerId]: stream }
      );
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        clearRingTimeout();
        setCallStatus('connected');
        return;
      }

      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        removePeerFromCall(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, peerConnection);
    setPeerNames((prev) => ({ ...prev, [peerId]: peerName }));

    const stream = await ensureLocalStream(session.mode);
    addStreamTracks(peerConnection, stream);

    return peerConnection;
  };

  const createOfferForPeer = async (session: CallSession, peerId: string, peerName: string) => {
    const peerConnection = await ensurePeerConnection(session, peerId, peerName);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await sendCallSignal({
      type: 'offer',
      callId: session.callId,
      fromProfileId: profile?.id || '',
      fromName: currentUserName,
      toProfileId: peerId,
      mode: session.mode,
      scope: session.scope,
      hostId: session.hostId,
      sdp: offer,
    });
  };

  const handleCallSignal = async (signal: CallSignalPayload) => {
    if (!profile?.id) return;
    if (signal.fromProfileId === profile.id) return;
    if (signal.toProfileId && signal.toProfileId !== profile.id) return;

    if (signal.type === 'invite') {
      const scope: CallScope = signal.scope === 'group' ? 'group' : 'direct';
      const mode: CallMode = signal.mode === 'video' ? 'video' : 'voice';

      if (callStatusRef.current !== 'idle' || activeCallRef.current || incomingCallRef.current) {
        await sendCallSignal({
          type: 'decline',
          callId: signal.callId,
          fromProfileId: profile.id,
          fromName: currentUserName,
          toProfileId: signal.fromProfileId,
          reason: 'busy',
        });
        return;
      }

      setIncomingCall({
        callId: signal.callId,
        fromProfileId: signal.fromProfileId,
        fromName: signal.fromName || t('chatBar.anonymous'),
        mode,
        scope,
        hostId: signal.hostId || signal.fromProfileId,
        targetProfileId: signal.toProfileId || null,
      });
      setCallMode(mode);
      setCallStatus('ringing');
      setIsExpanded(true);
      toast.info(
        t('chatBar.calls.incomingToast', {
          name: signal.fromName || t('chatBar.anonymous'),
          type: mode === 'video' ? t('chatBar.calls.kindVideo') : t('chatBar.calls.kindVoice'),
        })
      );
      return;
    }

    if (signal.type === 'decline') {
      const session = activeCallRef.current;
      if (!session || session.callId !== signal.callId) return;

      if (session.scope === 'direct' && session.role === 'caller') {
        const messageKey = signal.reason === 'busy' ? 'chatBar.calls.targetBusy' : 'chatBar.calls.targetDeclined';
        toast.info(t(messageKey));
        resetCallState();
        return;
      }

      if (session.scope === 'group' && signal.reason === 'full') {
        toast.info(
          t('chatBar.calls.groupFull', {
            count: getGroupParticipantCap(session.mode),
          })
        );
        resetCallState();
        return;
      }

      return;
    }

    if (signal.type === 'join') {
      const session = activeCallRef.current;
      if (!session || session.callId !== signal.callId) return;

      if (session.scope === 'direct' && session.targetProfileId && signal.fromProfileId !== session.targetProfileId) {
        return;
      }

      if (session.scope === 'group' && !peerConnectionsRef.current.has(signal.fromProfileId)) {
        const participantCount = peerConnectionsRef.current.size + 1;
        const participantCap = getGroupParticipantCap(session.mode);

        if (participantCount >= participantCap) {
          await sendCallSignal({
            type: 'decline',
            callId: session.callId,
            fromProfileId: profile.id,
            fromName: currentUserName,
            toProfileId: signal.fromProfileId,
            reason: 'full',
          });
          return;
        }
      }

      const shouldCreateOffer =
        session.role === 'caller' || profile.id < signal.fromProfileId;

      if (!shouldCreateOffer) {
        return;
      }

      clearRingTimeout();
      setCallStatus('connecting');
      await createOfferForPeer(
        session,
        signal.fromProfileId,
        signal.fromName || t('chatBar.anonymous')
      );
      return;
    }

    if (signal.type === 'offer') {
      const session = activeCallRef.current;
      if (!session || session.callId !== signal.callId || !signal.sdp) return;

      try {
        setCallStatus('connecting');
        const peerConnection = await ensurePeerConnection(
          session,
          signal.fromProfileId,
          signal.fromName || t('chatBar.anonymous')
        );

        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushPendingIceCandidates(signal.fromProfileId, peerConnection);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await sendCallSignal({
          type: 'answer',
          callId: session.callId,
          fromProfileId: profile.id,
          fromName: currentUserName,
          toProfileId: signal.fromProfileId,
          mode: session.mode,
          scope: session.scope,
          hostId: session.hostId,
          sdp: answer,
        });
      } catch (error) {
        console.error('ChatBar: Failed to handle offer:', error);
      }
      return;
    }

    if (signal.type === 'answer') {
      if (!signal.sdp) return;
      const session = activeCallRef.current;
      if (!session || session.callId !== signal.callId) return;
      const peerConnection = peerConnectionsRef.current.get(signal.fromProfileId);
      if (!peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushPendingIceCandidates(signal.fromProfileId, peerConnection);
      } catch (error) {
        console.error('ChatBar: Failed to handle answer:', error);
      }
      return;
    }

    if (signal.type === 'ice-candidate') {
      if (!signal.candidate) return;
      const peerConnection = peerConnectionsRef.current.get(signal.fromProfileId);

      if (!peerConnection || !peerConnection.remoteDescription) {
        queueIceCandidate(signal.fromProfileId, signal.candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(signal.candidate);
      } catch (error) {
        console.error('ChatBar: Failed to add ICE candidate:', error);
      }
      return;
    }

    if (signal.type === 'hangup') {
      if (incomingCallRef.current?.callId === signal.callId) {
        setIncomingCall(null);
        setCallStatus('idle');
        setCallMode(null);
        return;
      }

      const session = activeCallRef.current;
      if (!session || session.callId !== signal.callId) return;

      if (session.scope === 'group' && signal.reason === 'leave' && signal.fromProfileId !== session.hostId) {
        removePeerFromCall(signal.fromProfileId);
        toast.info(
          t('chatBar.calls.participantLeft', {
            name: signal.fromName || t('chatBar.anonymous'),
          })
        );
        return;
      }

      toast.info(t('chatBar.calls.ended'));
      resetCallState();
    }
  };

  const subscribeToCallSignals = () => {
    if (!profile?.id) return () => {};

    const channel = supabase.channel(callInboxTopic(profile.id), PRIVATE_CHANNEL_CONFIG);
    callChannelRef.current = channel;
    callSenderRef.current = createCallSignalSender(supabase);
    void refreshRtcConfiguration();

    channel
      .on('broadcast', { event: CALL_SIGNAL_EVENT }, ({ payload }) => {
        void handleCallSignal(payload as CallSignalPayload);
      })
      .subscribe();

    return () => {
      if (callChannelRef.current === channel) {
        callChannelRef.current = null;
      }
      void supabase.removeChannel(channel);
      callSenderRef.current?.dispose();
      callSenderRef.current = null;
    };
  };

  async function sendToDatabase(messageObj: Message, content: string) {
    if (!profile?.id || !selectedConversationId) return;

    const conversationId = selectedConversationId;
    const activeKind = resolveConversationKind(conversationId, conversations, conversationKindByIdRef);
    const useE2ee = activeKind === 'direct' && directDmE2eeReady;

    let insertPayload: TablesInsert<'private_messages'> = {
      conversation_id: conversationId,
      sender_id: messageObj.sender_id,
      content,
      message_kind: 'plaintext',
    };

    if (useE2ee && localMessagingSecretKeyRef.current && peerMessagingPublicKeyB64Ref.current) {
      const peerPk = decodePublicKeyBase64(peerMessagingPublicKeyB64Ref.current);
      if (peerPk) {
        const shared = buildSharedEncryptionKey(localMessagingSecretKeyRef.current, peerPk);
        const enc = encryptUtf8Plaintext(content, shared);
        insertPayload = {
          conversation_id: conversationId,
          sender_id: messageObj.sender_id,
          content: null,
          message_kind: 'e2ee_v1',
          cipher_nonce: enc.nonceB64,
          cipher_text: enc.cipherB64,
        };
      }
    }

    try {
      const { data: inserted, error } = await supabase
        .from('private_messages')
        .insert(insertPayload)
        .select(PRIVATE_MESSAGES_LIST_SELECT)
        .single();

      if (error || !inserted) {
        const reason = error?.message?.trim();
        toast.error(
          reason ? t('chatBar.private.sendFailedWithReason', { reason }) : t('chatBar.private.sendFailed'),
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageObj.id ? { ...msg, id: `failed-${msg.id}` } : msg
          )
        );
        return;
      }

      const ins = inserted as unknown as PrivateMsgRow;
      if (!rawPrivateRowsRef.current.some((r) => r.id === ins.id)) {
        rawPrivateRowsRef.current = [...rawPrivateRowsRef.current, ins];
      }
      const display = toDisplayMessage(
        ins,
        (key) => t(key),
        peerMessagingPublicKeyB64Ref.current,
        localMessagingSecretKeyRef.current,
      );
      setMessages((prev) => prev.map((msg) => (msg.id === messageObj.id ? display : msg)));

      const usedE2ee = insertPayload.message_kind === 'e2ee_v1';
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId
            ? {
                ...c,
                last_content: usedE2ee ? null : content,
                last_at: display.created_at,
                last_is_e2ee: usedE2ee,
              }
            : c
        )
      );

      if (activeKind === 'agent') {
        void supabase.functions
          .invoke('messaging-agent-reply', { body: { conversation_id: conversationId } })
          .then(({ error: fnError }) => {
            if (fnError) {
              console.warn('ChatBar: agent reply function failed', fnError);
              const r = fnError.message?.trim();
              toast.error(
                r
                  ? t('chatBar.private.agentReplyFailedWithReason', { reason: r })
                  : t('chatBar.private.agentReplyFailed'),
              );
            }
          });
      }
    } catch (error) {
      console.error('ChatBar: send message failed:', error);
      toast.error(t('chatBar.private.sendFailed'));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageObj.id ? { ...msg, id: `failed-${msg.id}` } : msg
        )
      );
    }
  }

  const clearMessageLongPressTimer = () => {
    if (messageLongPressTimerRef.current !== null) {
      window.clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  };

  const isEditableMessage = useCallback(
    (message: Message) => {
      if (!profile?.id) return false;
      if (message.sender_id !== profile.id) return false;
      if (message.id.startsWith('local-') || message.id.startsWith('failed-')) return false;
      return isWithinMessageActionWindow(message.created_at, MESSAGE_EDIT_WINDOW_MS);
    },
    [profile?.id],
  );

  const isUnsendableMessage = useCallback(
    (message: Message) => {
      if (!profile?.id) return false;
      if (message.sender_id !== profile.id) return false;
      if (message.id.startsWith('local-') || message.id.startsWith('failed-')) return false;
      return isWithinMessageActionWindow(message.created_at, MESSAGE_UNSEND_WINDOW_MS);
    },
    [profile?.id],
  );

  const selectedEditableMessage = useMemo(() => {
    if (!messageSelectionMode || selectedMessageIds.size !== 1) return null;
    const [selectedId] = [...selectedMessageIds];
    const candidate = messages.find((m) => m.id === selectedId);
    if (!candidate) return null;
    return isEditableMessage(candidate) ? candidate : null;
  }, [isEditableMessage, messageSelectionMode, messages, selectedMessageIds]);

  const selectedReportableMessage = useMemo(() => {
    if (!messageSelectionMode || selectedMessageIds.size !== 1) return null;
    const [selectedId] = [...selectedMessageIds];
    const candidate = messages.find((m) => m.id === selectedId);
    if (!candidate) return null;
    if (candidate.id.startsWith('local-') || candidate.id.startsWith('failed-')) return null;
    if (!profile?.id) return null;
    if (candidate.sender_id === profile.id) return null;
    return candidate;
  }, [messageSelectionMode, messages, profile?.id, selectedMessageIds]);

  const selectedMessagesCanUnsend = useMemo(() => {
    if (!messageSelectionMode || selectedMessageIds.size === 0) return false;
    const selected = messages.filter((m) => selectedMessageIds.has(m.id));
    if (selected.length !== selectedMessageIds.size) return false;
    return selected.every((message) => isUnsendableMessage(message));
  }, [isUnsendableMessage, messageSelectionMode, messages, selectedMessageIds]);

  const selectedMessagesCanDeleteInAgent = useMemo(() => {
    if (!isThreadAgent && !isAgentThread) return false;
    if (!messageSelectionMode || selectedMessageIds.size === 0) return false;
    return [...selectedMessageIds].every((id) => !id.startsWith('local-') && !id.startsWith('failed-'));
  }, [isAgentThread, isThreadAgent, messageSelectionMode, selectedMessageIds]);

  const startEditingSelectedMessage = useCallback(() => {
    if (!selectedEditableMessage) return;
    setEditingMessageId(selectedEditableMessage.id);
    setNewMessage(selectedEditableMessage.content);
    setMessageSelectionMode(false);
    setSelectedMessageIds(new Set());
    clearMessageLongPressTimer();
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }, [selectedEditableMessage]);

  const saveEditedMessage = useCallback(async () => {
    if (!editingMessageId || !profile?.id || !selectedConversationId) return;
    const updatedContent = newMessage.trim();
    if (!updatedContent) return;
    const target = messages.find((m) => m.id === editingMessageId);
    if (!target || !isEditableMessage(target)) {
      toast.error(tRef.current('chatBar.private.editWindowExpired'));
      setEditingMessageId(null);
      return;
    }
    const { error } = await supabase
      .from('private_messages')
      .update({
        content: updatedContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', editingMessageId)
      .eq('sender_id', profile.id);
    if (error) {
      console.error('ChatBar: edit message failed', error);
      toast.error(tRef.current('chatBar.private.editFailed'));
      return;
    }
    setEditingMessageId(null);
    setNewMessage('');
  }, [editingMessageId, isEditableMessage, messages, newMessage, profile?.id, selectedConversationId]);

  const toggleStarForSelectedMessages = useCallback(() => {
    if (!profile?.id || !selectedConversationId) return;
    const ids = [...selectedMessageIds].filter((id) => !id.startsWith('local-') && !id.startsWith('failed-'));
    if (!ids.length) return;
    setStarredMessageIds((prev) => {
      const allSelectedStarred = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelectedStarred) next.delete(id);
        else next.add(id);
      }
      try {
        window.localStorage.setItem(
          conversationStorageKey(MESSAGING_STARRED_PREFIX, profile.id, selectedConversationId),
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
    setMessageSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [profile?.id, selectedConversationId, selectedMessageIds]);

  function enqueueOutgoingText(
    trimmedMessage: string,
    event?: React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLButtonElement>,
    options?: { clearInput?: boolean },
  ) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const trimmed = trimmedMessage.trim();
    if (!trimmed) return;

    if (profile?.id && !selectedConversationId) {
      toast.info(t('chatBar.private.sendingRequiresThread'));
      return;
    }

    const sender = profile || {
      id: `anonymous-${Date.now()}`,
      username: 'anonymous',
      full_name: t('chatBar.anonymous'),
      avatar_url: null,
    };

    if (options?.clearInput !== false) {
      setNewMessage('');
    }

    const localMessage: Message = {
      id: `local-${Date.now()}-${Math.random()}`,
      content: trimmed,
      created_at: new Date().toISOString(),
      sender_id: sender.id,
      is_edited: null,
      sender: {
        id: sender.id,
        username: sender.username,
        full_name: sender.full_name,
        avatar_url: sender.avatar_url,
      },
    };

    setMessages((prev) => [...prev, localMessage]);
    setIsExpanded(true);

    if (profile?.id) {
      void sendToDatabase(localMessage, trimmed);
    }
  }

  const handleSendMessage = (
    event?: React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (editingMessageId) {
      void saveEditedMessage();
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    enqueueOutgoingText(newMessage, event, { clearInput: true });
  };

  const autoResizeComposerInput = useCallback(() => {
    const input = messageInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, []);

  const insertEmojiAtCursor = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) {
      setNewMessage((prev) => `${prev}${emoji}`);
      return;
    }
    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const next = `${newMessage.slice(0, start)}${emoji}${newMessage.slice(end)}`;
    setNewMessage(next);
    requestAnimationFrame(() => {
      const el = messageInputRef.current;
      if (!el) return;
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    autoResizeComposerInput();
  }, [newMessage, autoResizeComposerInput]);

  const sanitizeUploadFilename = (name: string) => {
    const base = name.replace(/[/\\]/g, '_').replace(/\s+/g, ' ').trim() || 'file';
    return base.slice(0, 180);
  };

  const uploadBlobAndQueueMessage = async (blob: Blob, filename: string, labelPrefix: string) => {
    if (!profile?.id) {
      toast.info(t('chatBar.private.attachmentSignInRequired'));
      return;
    }
    if (!selectedConversationId) {
      toast.info(t('chatBar.private.sendingRequiresThread'));
      return;
    }
    const activeKind = resolveConversationKind(
      selectedConversationId,
      conversations,
      conversationKindByIdRef,
    );
    if (blob.size > MAX_MESSAGING_UPLOAD_BYTES) {
      toast.error(t('chatBar.private.attachmentTooLarge'));
      return;
    }
    const safeName = sanitizeUploadFilename(filename);
    const objectPath = `${selectedConversationId}/${crypto.randomUUID()}-${safeName}`;
    // In an encrypted chat the bytes are sealed with the thread key before they leave the device (step 7.1).
    const sealKey = activeKind === 'direct' && directDmE2eeReady ? threadSharedKey() : null;
    let uploadBody: Blob = blob;
    let sealNonce: string | null = null;
    if (sealKey) {
      const sealed = encryptAttachmentBytes(new Uint8Array(await blob.arrayBuffer()), sealKey);
      uploadBody = new Blob([sealed.cipher.slice()], { type: 'application/octet-stream' });
      sealNonce = sealed.nonceB64;
    }
    try {
      const { error: uploadError } = await supabase.storage
        .from(MESSAGING_ATTACHMENTS_BUCKET)
        .upload(objectPath, uploadBody, { upsert: false, contentType: sealKey ? 'application/octet-stream' : blob.type || undefined });
      if (uploadError) {
        console.error('ChatBar: attachment upload failed', uploadError);
        toast.error(t('chatBar.private.attachmentUploadFailed'));
        return;
      }
      const { data: signed, error: signError } = await supabase.storage
        .from(MESSAGING_ATTACHMENTS_BUCKET)
        .createSignedUrl(objectPath, SIGNED_ATTACHMENT_TTL_SECONDS);
      if (signError || !signed?.signedUrl) {
        console.error('ChatBar: signed URL failed', signError);
        toast.error(t('chatBar.private.attachmentUploadFailed'));
        return;
      }
      const line = sealNonce
        ? buildEncryptedAttachmentLine(labelPrefix, signed.signedUrl, sealNonce, filename, blob.type || 'application/octet-stream')
        : `${labelPrefix} ${signed.signedUrl}`;
      enqueueOutgoingText(line, undefined, { clearInput: false });
    } catch (e) {
      console.error('ChatBar: attachment error', e);
      toast.error(t('chatBar.private.attachmentUploadFailed'));
    }
  };

  const handleComposerFilesSelected = async (list: FileList | null, labelPrefix: string) => {
    if (!list?.length) return;
    for (let i = 0; i < list.length; i += 1) {
      const file = list.item(i);
      if (!file) continue;
      await uploadBlobAndQueueMessage(file, file.name, labelPrefix);
    }
    if (composerFileInputRef.current) composerFileInputRef.current.value = '';
    if (composerCameraInputRef.current) composerCameraInputRef.current.value = '';
  };

  const stopVoiceRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsRecordingVoice(false);
  };

  const startVoiceRecording = async () => {
    if (!profile?.id) {
      toast.info(t('chatBar.private.attachmentSignInRequired'));
      return;
    }
    if (!selectedConversationId) {
      toast.info(t('chatBar.private.sendingRequiresThread'));
      return;
    }
    const activeKind = resolveConversationKind(
      selectedConversationId,
      conversations,
      conversationKindByIdRef,
    );
    if (isRecordingVoice) {
      stopVoiceRecording();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const preferredMime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm')
            ? 'audio/webm'
            : '';
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecordingVoice(false);
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const ext = blob.type.includes('webm') ? 'webm' : 'm4a';
        void uploadBlobAndQueueMessage(blob, `voice-${Date.now()}.${ext}`, '🎤');
      };
      recorder.start();
      setIsRecordingVoice(true);
    } catch (e) {
      console.error('ChatBar: mic permission', e);
      toast.error(t('chatBar.private.micPermissionDenied'));
    }
  };

  const retryMessage = async (messageId: string) => {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message || !profile?.id || !selectedConversationId) return;

    const activeKind = resolveConversationKind(
      selectedConversationId,
      conversations,
      conversationKindByIdRef,
    );
    const useE2ee = activeKind === 'direct' && directDmE2eeReady;
    let insertPayload: TablesInsert<'private_messages'> = {
      conversation_id: selectedConversationId,
      sender_id: message.sender_id,
      content: message.content,
      message_kind: 'plaintext',
    };

    if (useE2ee && localMessagingSecretKeyRef.current && peerMessagingPublicKeyB64Ref.current) {
      const peerPk = decodePublicKeyBase64(peerMessagingPublicKeyB64Ref.current);
      if (peerPk) {
        const shared = buildSharedEncryptionKey(localMessagingSecretKeyRef.current, peerPk);
        const enc = encryptUtf8Plaintext(message.content, shared);
        insertPayload = {
          conversation_id: selectedConversationId,
          sender_id: message.sender_id,
          content: null,
          message_kind: 'e2ee_v1',
          cipher_nonce: enc.nonceB64,
          cipher_text: enc.cipherB64,
        };
      }
    }

    try {
      const { data: inserted, error } = await supabase
        .from('private_messages')
        .insert(insertPayload)
        .select(PRIVATE_MESSAGES_LIST_SELECT)
        .single();

      if (error || !inserted) {
        const reason = error?.message?.trim();
        toast.error(
          reason ? t('chatBar.private.sendFailedWithReason', { reason }) : t('chatBar.private.sendFailed'),
        );
        return;
      }

      const ins = inserted as unknown as PrivateMsgRow;
      if (!rawPrivateRowsRef.current.some((r) => r.id === ins.id)) {
        rawPrivateRowsRef.current = [...rawPrivateRowsRef.current, ins];
      }
      const display = toDisplayMessage(
        ins,
        (key) => t(key),
        peerMessagingPublicKeyB64Ref.current,
        localMessagingSecretKeyRef.current,
      );
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? display : msg)));

      if (activeKind === 'agent') {
        void supabase.functions
          .invoke('messaging-agent-reply', { body: { conversation_id: selectedConversationId } })
          .then(({ error: fnError }) => {
            if (fnError) {
              console.warn('ChatBar: agent reply function failed', fnError);
              const r = fnError.message?.trim();
              toast.error(
                r
                  ? t('chatBar.private.agentReplyFailedWithReason', { reason: r })
                  : t('chatBar.private.agentReplyFailed'),
              );
            }
          });
      }
    } catch (error) {
      console.error('ChatBar: retry failed:', error);
    }
  };

  const deleteSelectedMessages = useCallback(async () => {
    if (!profile?.id || !selectedConversationId) return;
    const ids = [...selectedMessageIds].filter((id) => !id.startsWith('local-') && !id.startsWith('failed-'));
    if (!ids.length) {
      toast.error(
        isDirectThread
          ? tRef.current('chatBar.inbox.unsendNone')
          : tRef.current('chatBar.inbox.deleteSelectedNone'),
      );
      return;
    }
    const kind = resolveConversationKind(selectedConversationId, conversations, conversationKindByIdRef);
    if (kind === 'direct') {
      const selected = messages.filter((m) => ids.includes(m.id));
      if (!selected.length || !selected.every((message) => isUnsendableMessage(message))) {
        toast.error(tRef.current('chatBar.inbox.unsendNone'));
        return;
      }
    }
    const { error } = await supabase.from('private_messages').delete().in('id', ids);
    if (error) {
      console.error('ChatBar: delete messages failed', error);
      const reason = error.message?.trim();
      toast.error(
        reason
          ? tRef.current('chatBar.inbox.deleteFailedWithReason', { reason })
          : kind === 'direct'
            ? tRef.current('chatBar.inbox.unsendFailed')
            : tRef.current('chatBar.inbox.deleteFailed'),
      );
      return;
    }
    rawPrivateRowsRef.current = rawPrivateRowsRef.current.filter((r) => !ids.includes(r.id));
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedMessageIds(new Set());
    setMessageSelectionMode(false);
    if (kind === 'direct') {
      toast.success(tRef.current('chatBar.inbox.unsendDone'));
    }
    const { data: list } = await supabase.rpc('private_list_my_conversations');
    if (list) setConversations(list as PrivateConversationRow[]);
  }, [
    conversations,
    isDirectThread,
    isUnsendableMessage,
    messages,
    profile?.id,
    selectedConversationId,
    selectedMessageIds,
  ]);

  const onMessageRowClick = (messageId: string) => {
    if (longPressConsumedClickRef.current) {
      longPressConsumedClickRef.current = false;
      return;
    }
    if (messageId.startsWith('local-') || messageId.startsWith('failed-')) return;

    if (!messageSelectionMode) {
      setMessageSelectionMode(true);
      setSelectedMessageIds(new Set([messageId]));
      return;
    }

    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const onMessagePointerDown = (event: React.PointerEvent, messageId: string) => {
    if (messageSelectionMode) return;
    if (event.button !== 0) return;
    if (messageId.startsWith('local-') || messageId.startsWith('failed-')) return;
    if (event.pointerType !== 'touch') return;
    clearMessageLongPressTimer();
    messageLongPressTimerRef.current = window.setTimeout(() => {
      messageLongPressTimerRef.current = null;
      longPressConsumedClickRef.current = true;
      setMessageSelectionMode(true);
      setSelectedMessageIds(new Set([messageId]));
    }, 550);
  };

  const openDirectConversation = async (peerProfileId: string) => {
    if (!profile?.id || peerProfileId === profile.id) return;
    const { data, error } = await supabase.rpc('private_get_or_create_direct_conversation', {
      p_other_profile_id: peerProfileId,
    });
    if (error || !data) {
      console.error('ChatBar: open direct conversation failed', error);
      toast.error(t('chatBar.private.openDmFailed'));
      return;
    }
    const convId = data as string;
    const { data: list } = await supabase.rpc('private_list_my_conversations');
    setConversations((list ?? []) as PrivateConversationRow[]);
    conversationKindByIdRef.current[convId] = 'direct';
    setSelectedConversationId(convId);
    setMessagingTab('chats');
    if (variant === 'page') {
      navigate(`/messaging/${convId}`);
    }
  };

  const openCiviConversation = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase.rpc('private_get_or_create_agent_conversation');
    if (error || data == null) {
      console.error('ChatBar: open Civi conversation failed', error);
      const reason = error?.message?.trim();
      toast.error(
        reason ? t('chatBar.private.civiOpenFailedWithReason', { reason }) : t('chatBar.private.civiOpenFailed'),
      );
      return;
    }
    const convId = String(data);
    conversationKindByIdRef.current[convId] = 'agent';
    setSelectedConversationId(convId);
    setMessagingTab('chats');
    setConversations((prev) => {
      if (prev.some((r) => r.conversation_id === convId)) return prev;
      const row: PrivateConversationRow = {
        conversation_id: convId,
        kind: 'agent',
        peer_profile_id: CIVI_ASSISTANT_PROFILE_ID,
        peer_username: CIVI_ASSISTANT_USERNAME,
        peer_full_name: CIVI_ASSISTANT_DISPLAY_NAME,
        peer_avatar_url: null,
        last_content: null,
        last_at: null,
        last_is_e2ee: false,
        disappearing_minutes: 0,
        disappearing_started_at: null,
      };
      return [row, ...prev];
    });
    const { data: list, error: listErr } = await supabase.rpc('private_list_my_conversations');
    if (!listErr && list?.length) {
      setConversations(list as PrivateConversationRow[]);
    }
    if (variant === 'page') {
      navigate(`/messaging/${convId}`);
    }
  }, [profile?.id, t, variant, navigate]);

  const startCall = async (mode: CallMode) => {
    if (!profile?.id) {
      toast.error(t('chatBar.calls.signInRequired'));
      return;
    }

    if (callStatusRef.current !== 'idle' || activeCallRef.current || incomingCallRef.current) {
      toast.info(t('chatBar.calls.finishCurrent'));
      return;
    }

    const scope = selectedCallScope;
    const targetProfileId = scope === 'direct' ? selectedTargetProfileId : null;

    if (scope === 'direct' && !targetProfileId) {
      toast.info(t('chatBar.calls.selectTarget'));
      return;
    }

    const session: CallSession = {
      callId: getRandomId(),
      mode,
      scope,
      role: 'caller',
      hostId: profile.id,
      hostName: currentUserName,
      targetProfileId,
    };

    try {
      await refreshRtcConfiguration();
      await ensureLocalStream(mode);
    } catch (error) {
      console.error('ChatBar: media permission error while starting call:', error);
      toast.error(t('chatBar.calls.permissionsError'));
      resetCallState();
      return;
    }

    setCallMode(mode);
    setCallStatus('calling');
    setActiveCall(session);
    setIncomingCall(null);
    setIsExpanded(true);
    setPeerNames({});

    clearRingTimeout();
    if (scope === 'direct') {
      ringTimeoutRef.current = window.setTimeout(() => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.callId !== session.callId || callStatusRef.current !== 'calling') return;
        toast.info(t('chatBar.calls.noAnswer'));
        void hangupActiveCall(true, 'timeout');
      }, CALL_RING_TIMEOUT_MS);
    }

    await sendCallSignal({
      type: 'invite',
      callId: session.callId,
      fromProfileId: profile.id,
      fromName: currentUserName,
      mode: session.mode,
      scope: session.scope,
      hostId: session.hostId,
      toProfileId: session.scope === 'direct' ? session.targetProfileId : null,
    });
  };

  const acceptIncomingCall = async () => {
    if (!profile?.id || !incomingCallRef.current) return;

    const invite = incomingCallRef.current;
    const session: CallSession = {
      callId: invite.callId,
      mode: invite.mode,
      scope: invite.scope,
      role: 'participant',
      hostId: invite.hostId,
      hostName: invite.fromName,
      targetProfileId: invite.scope === 'direct' ? invite.fromProfileId : null,
    };

    try {
      await refreshRtcConfiguration();
      await ensureLocalStream(invite.mode);
      setIncomingCall(null);
      setCallMode(invite.mode);
      setCallStatus('connecting');
      setActiveCall(session);
      setPeerNames({
        [invite.fromProfileId]: invite.fromName,
      });

      await sendCallSignal({
        type: 'join',
        callId: invite.callId,
        fromProfileId: profile.id,
        fromName: currentUserName,
        mode: invite.mode,
        scope: invite.scope,
        hostId: invite.hostId,
        toProfileId: invite.scope === 'direct' ? invite.fromProfileId : null,
      });
    } catch (error) {
      console.error('ChatBar: accept call failed:', error);
      toast.error(t('chatBar.calls.permissionsError'));
      await sendCallSignal({
        type: 'decline',
        callId: invite.callId,
        fromProfileId: profile.id,
        fromName: currentUserName,
        toProfileId: invite.fromProfileId,
        reason: 'permissions',
      });
      resetCallState();
    }
  };

  const declineIncomingCall = async () => {
    if (!profile?.id || !incomingCallRef.current) return;

    await sendCallSignal({
      type: 'decline',
      callId: incomingCallRef.current.callId,
      fromProfileId: profile.id,
      fromName: currentUserName,
      toProfileId: incomingCallRef.current.fromProfileId,
      reason: 'declined',
    });

    setIncomingCall(null);
    setCallStatus('idle');
    setCallMode(null);
  };

  const hangupActiveCall = async (
    notifyPeers = true,
    reasonOverride?: 'timeout' | 'end-call' | 'leave'
  ) => {
    const session = activeCallRef.current;

    if (notifyPeers && profile?.id && session) {
      const reason =
        reasonOverride ||
        (session.scope === 'group' && session.role !== 'caller' ? 'leave' : 'end-call');

      await sendCallSignal({
        type: 'hangup',
        callId: session.callId,
        fromProfileId: profile.id,
        fromName: currentUserName,
        scope: session.scope,
        hostId: session.hostId,
        toProfileId: session.scope === 'direct' ? session.targetProfileId : null,
        reason,
      });
    }

    resetCallState();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraEnabled(videoTrack.enabled);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canStartCall =
    Boolean(profile?.id) &&
    callStatus === 'idle' &&
    (selectedCallScope === 'group' || Boolean(selectedTargetProfileId));

  const isCallLive = callStatus === 'connecting' || callStatus === 'connected';
  const callTypeLabel = callMode === 'video' ? t('chatBar.calls.kindVideo') : t('chatBar.calls.kindVoice');
  const activePeerCount = Object.keys(peerNames).length;
  const callStatusLabel =
    callStatus === 'calling'
      ? t('chatBar.calls.calling', { type: callTypeLabel })
      : callStatus === 'ringing'
        ? t('chatBar.calls.incomingStatus', { type: callTypeLabel })
        : callStatus === 'connecting'
          ? t('chatBar.calls.connecting')
          : callStatus === 'connected'
            ? t('chatBar.calls.connected', { type: callTypeLabel })
            : '';

  if (!user) {
    console.log('ChatBar: No user; rendering chat in local-only mode');
  }

  const addContactFromSearch = (contact: SavedContact) => {
    if (!contact.id || contact.id === profile?.id) return;
    if (savedContacts.some((c) => c.id === contact.id)) {
      toast.info(t('chatBar.contacts.alreadyAdded'));
      void openDirectConversation(contact.id);
      setSelectedTargetProfileId(contact.id);
      return;
    }
    const next = [...savedContacts, contact].slice(0, SAVED_CONTACTS_CAP);
    setSavedContacts(next);
    try {
      window.localStorage.setItem(SAVED_MESSAGING_CONTACTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage failures */
    }
    toast.success(t('chatBar.contacts.added'));
    void openDirectConversation(contact.id);
    setSelectedTargetProfileId(contact.id);
  };

  const handleAllowDeviceContacts = useCallback(async () => {
    setDeviceContactsDismissed(false);
    const next = await requestDeviceContactsAccess();
    setDeviceContactsAccess(next);
    if (next === 'granted') {
      await refreshDeviceContacts();
    }
  }, [refreshDeviceContacts]);

  const handlePickWebContacts = useCallback(async () => {
    try {
      const picked = await pickWebContacts();
      if (!picked.length) return;
      setDeviceContacts((prev) => {
        const byId = new Map(prev.map((row) => [row.id, row]));
        for (const row of picked) byId.set(row.id, row);
        const next = [...byId.values()];
        void loadRegisteredFromDeviceContacts(next);
        return next;
      });
      setDeviceContactsAccess('granted');
    } catch {
      /* user cancelled picker */
    }
  }, [loadRegisteredFromDeviceContacts]);

  const handleInviteContact = useCallback(
    async (contact: DeviceContact | { name: string; phones?: string[] }) => {
      try {
        const mode = await shareCivizenInvite({
          origin: window.location.origin,
          name: contact.name,
          phone: contact.phones?.[0] ?? null,
        });
        toast.success(
          mode === 'clipboard'
            ? tRef.current('chatBar.contacts.inviteCopied')
            : tRef.current('chatBar.contacts.inviteShared'),
        );
      } catch (error) {
        console.warn('ChatBar: invite failed', error);
        toast.error(tRef.current('chatBar.contacts.inviteFailed'));
      }
    },
    [],
  );

  const peopleSearchLabels = {
    loading: t('chatBar.loading'),
    noResults: t('chatBar.contacts.noResults'),
    viewProfile: t('chatBar.contacts.viewProfile'),
    add: t('chatBar.contacts.add'),
    invite: t('chatBar.contacts.invite'),
    inviteSomeone: t('chatBar.contacts.inviteSomeone'),
    permissionTitle: t('chatBar.contacts.permissionTitle'),
    permissionBody: t('chatBar.contacts.permissionBody'),
    allow: t('chatBar.contacts.allow'),
    notNow: t('chatBar.contacts.notNow'),
    denied: t('chatBar.contacts.denied'),
    retry: t('chatBar.contacts.retry'),
    chooseFromPhone: t('chatBar.contacts.chooseFromPhone'),
    onCivizen: t('chatBar.contacts.onCivizen'),
    inviteToCivizen: t('chatBar.contacts.inviteToCivizen'),
    anonymous: t('chatBar.anonymous'),
  };

  const peopleSearchPanel = (queryActive: boolean) => (
    <MessagingPeopleSearch
      queryActive={queryActive}
      loading={contactSearchLoading}
      directoryResults={contactResults}
      registeredDeviceContacts={registeredDeviceContacts}
      inviteContacts={inviteDeviceContacts}
      access={deviceContactsDismissed && deviceContactsAccess === 'prompt' ? 'unsupported' : deviceContactsAccess}
      nativeAvailable={nativeDeviceContactsAreAvailable()}
      webPickerAvailable={deviceContactsAreAvailable() && !nativeDeviceContactsAreAvailable()}
      onAllowContacts={() => void handleAllowDeviceContacts()}
      onNotNow={() => setDeviceContactsDismissed(true)}
      onRetryContacts={() => void handleAllowDeviceContacts()}
      onPickWebContacts={() => void handlePickWebContacts()}
      onOpenProfile={(id) => navigate(`/user/${id}`)}
      onAddMember={addContactFromSearch}
      onInvite={(contact) => void handleInviteContact(contact)}
      labels={peopleSearchLabels}
    />
  );

  const isPage = variant === 'page';
  const showMessagingTabs = callStatus === 'idle' && !incomingCall;

  const callSetupFields = (callKind: 'voice' | 'video') => (
    <div className="space-y-2 border-b border-border bg-muted/20 px-3 py-3">
      <div className="flex items-center gap-2">
        <label className="whitespace-nowrap text-xs text-muted-foreground">
          {t('chatBar.calls.scopeLabel')}
        </label>
        <select
          className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs"
          value={selectedCallScope}
          onChange={(event) => setSelectedCallScope(event.target.value as CallScope)}
          disabled={!profile?.id}
        >
          <option value="direct">{t('chatBar.calls.scopeDirect')}</option>
        </select>
      </div>

      {selectedCallScope === 'direct' && (
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap text-xs text-muted-foreground">
            {t('chatBar.calls.targetLabel')}
          </label>
          <select
            className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs"
            value={selectedTargetProfileId}
            onChange={(event) => setSelectedTargetProfileId(event.target.value)}
            disabled={!profile?.id || mergedCallTargets.length === 0}
          >
            {mergedCallTargets.length === 0 ? (
              <option value="">{t('chatBar.calls.noTargets')}</option>
            ) : (
              mergedCallTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <Button
        variant="default"
        size="default"
        className="h-10 w-full gap-2"
        onClick={() => void startCall(callKind === 'voice' ? 'voice' : 'video')}
        disabled={!canStartCall}
      >
        {callKind === 'voice' ? (
          <Phone className="h-4 w-4 shrink-0" />
        ) : (
          <Video className="h-4 w-4 shrink-0" />
        )}
        {callKind === 'voice' ? t('chatBar.calls.startCall') : t('chatBar.calls.startVideo')}
      </Button>

      <p className="text-[11px] text-muted-foreground leading-snug">{t('chatBar.calls.mediaEncryptionHint')}</p>
    </div>
  );

  const messageThread = (
    <div>
      {loading ? (
        <div className="py-4 text-center text-muted-foreground">{t('chatBar.loading')}</div>
      ) : profile?.id && !selectedConversationId ? (
        <div className="py-4 text-center text-muted-foreground">
          <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>{t('chatBar.private.selectThread')}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="py-4 text-center text-muted-foreground">
          <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>{t('chatBar.emptyTitle')}</p>
          <p className="text-sm">{t('chatBar.emptySubtitle')}</p>
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="py-4 text-center text-muted-foreground">
          <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>{t('chatBar.private.searchNoResults')}</p>
        </div>
      ) : (
        <div
          className="space-y-3"
          role={messageSelectionMode ? 'listbox' : undefined}
          aria-multiselectable={messageSelectionMode ? true : undefined}
          aria-label={
            messageSelectionMode
              ? t('chatBar.inbox.selectionCount', { count: selectedMessageIds.size })
              : undefined
          }
        >
          {visibleMessages.map((message) => (
            <ChatMessageRow
              key={message.id}
              message={message}
              onOpenAttachment={(url) => void openAttachmentUrl(url)}
              attachmentLabel={t('chatBar.private.openAttachment')}
              selectionMode={messageSelectionMode}
              selected={selectedMessageIds.has(message.id)}
              highlighted={highlightedMessageId === message.id}
              starred={starredMessageIds.has(message.id)}
              senderInitials={getInitials(message.sender?.full_name)}
              formattedTime={formatTime(message.created_at)}
              labels={{
                openProfile: t('chatBar.private.openProfile'),
                anonymous: t('chatBar.anonymous'),
                edited: t('chatBar.private.edited'),
                retry: t('chatBar.retry'),
              }}
              onSelect={onMessageRowClick}
              onPointerDown={onMessagePointerDown}
              onPointerUp={clearMessageLongPressTimer}
              onPointerCancel={clearMessageLongPressTimer}
              onPointerLeave={(event) => {
                if (event.pointerType === 'touch') clearMessageLongPressTimer();
              }}
              onOpenProfile={(senderId) => navigate(`/user/${senderId}`)}
              onRetry={(messageId) => void retryMessage(messageId)}
              registerRef={(messageId, node) => {
                messageRowRefs.current[messageId] = node;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Do not gate typing on conversationsLoading: list/Civi-ensure can hang or take long,
  // and a selected thread (including Civi) must stay editable while the inbox refreshes.
  const composerDisabled =
    messageSelectionMode ||
    (isDirectThread && isThreadBlocked) ||
    Boolean(profile?.id && !selectedConversationId);

  const attachmentsDisabled = composerDisabled || !profile?.id;

  const threadSharedKey = () => threadSharedKeyFrom(localMessagingSecretKeyRef.current, peerMessagingPublicKeyB64Ref.current);
  const openAttachmentUrl = (url: string) => openAttachmentUrlWith(url, threadSharedKey(), () => toast.error(t('chatBar.private.attachmentOpenFailed')));

  const showSendButton = Boolean(newMessage.trim()) || isRecordingVoice;

  const messageComposerFooter = (
    <div className="shrink-0 border-t border-border p-2 sm:p-3">
      {editingMessageId ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
          <span>{t('chatBar.private.editingMessage')}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setEditingMessageId(null);
              setNewMessage('');
            }}
          >
            {t('chatBar.inbox.cancelSelection')}
          </Button>
        </div>
      ) : null}
      {isDirectThread && isThreadBlocked ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <span>{t('chatBar.private.profile.blockedComposerHint')}</span>
          {threadMemberProfileId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void toggleBlockedProfile(threadMemberProfileId)}
            >
              {t('chatBar.private.profile.unblock')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <input
        ref={composerFileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => void handleComposerFilesSelected(e.target.files, '📎')}
      />
      <input
        ref={composerCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleComposerFilesSelected(e.target.files, '📷')}
      />
      <div className="flex items-end gap-1 sm:gap-2">
        <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              disabled={composerDisabled}
              aria-label={t('chatBar.composer.emoji')}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] border-border p-2" align="start" side="top">
            <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto text-lg leading-none">
              {MESSAGING_EMOJI_PALETTE.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-md p-1.5 text-center hover:bg-muted"
                  onClick={() => {
                    insertEmojiAtCursor(em);
                    setEmojiPopoverOpen(false);
                  }}
                >
                  <span className="inline-block">{em}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Textarea
          ref={messageInputRef}
          value={newMessage}
          onChange={(event) => {
            setNewMessage(event.target.value);
            autoResizeComposerInput();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              handleSendMessage();
            }
          }}
          placeholder={t('chatBar.placeholder')}
          className="min-h-9 flex-1 resize-none overflow-hidden"
          rows={1}
          maxLength={500}
          disabled={composerDisabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          disabled={attachmentsDisabled}
          aria-label={t('chatBar.composer.attachFile')}
          title={t('chatBar.composer.attachFile')}
          onClick={() => composerFileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          disabled={attachmentsDisabled}
          aria-label={t('chatBar.composer.takePhoto')}
          title={t('chatBar.composer.takePhoto')}
          onClick={() => composerCameraInputRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
        </Button>
        {showSendButton ? (
          isRecordingVoice ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                stopVoiceRecording();
              }}
              aria-label={t('chatBar.composer.stopRecording')}
              title={t('chatBar.composer.stopRecording')}
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSendMessage(event);
              }}
              disabled={
                composerDisabled ||
                !newMessage.trim()
              }
              className="h-9 w-9 shrink-0 p-0"
              aria-label={t('chatBar.composer.send')}
              title={t('chatBar.composer.send')}
            >
              <Send className="h-4 w-4" />
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 w-9 shrink-0 bg-primary p-0"
            disabled={attachmentsDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void startVoiceRecording();
            }}
            aria-label={t('chatBar.composer.recordVoice')}
            title={t('chatBar.composer.recordVoice')}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'w-full',
        isPage
          ? 'relative z-30 flex min-h-0 flex-1 flex-col'
          : 'fixed bottom-28 right-4 z-40 max-w-md',
      )}
    >
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'flex w-full flex-col bg-background border border-border rounded-lg shadow-glow',
              isPage && 'min-h-0 flex-1 overflow-hidden rounded-xl',
            )}
          >
            {!isPage ? (
              <div className="flex items-center justify-between border-b border-border p-3">
                <h3 className="font-semibold text-foreground">{t('chatBar.title')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {(callStatus !== 'idle' || incomingCall) && (
              <div className="px-3 py-2 border-b border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground font-medium truncate">
                    {incomingCall
                      ? t('chatBar.calls.incomingFrom', { name: incomingCall.fromName })
                      : callStatusLabel}
                  </p>
                  {(callStatus === 'calling' || isCallLive) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => void hangupActiveCall(true)}
                    >
                      <PhoneOff className="h-3.5 w-3.5 mr-1" />
                      {t('chatBar.calls.end')}
                    </Button>
                  )}
                </div>

                {!incomingCall && activeCall && (
                  <p className="text-xs text-muted-foreground">
                    {t('chatBar.calls.participantsCount', { count: activePeerCount + 1 })}
                  </p>
                )}

                {incomingCall && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => void acceptIncomingCall()}
                    >
                      {incomingCall.mode === 'video' ? (
                        <Video className="h-4 w-4 mr-1" />
                      ) : (
                        <Phone className="h-4 w-4 mr-1" />
                      )}
                      {t('chatBar.calls.accept')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => void declineIncomingCall()}
                    >
                      {t('chatBar.calls.decline')}
                    </Button>
                  </div>
                )}

                {isCallLive && (
                  <div className="space-y-2">
                    {callMode === 'video' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {remoteStreamEntries.map(([peerId, stream]) => (
                          <div
                            key={peerId}
                            className="relative rounded-md overflow-hidden bg-black/80 h-24"
                          >
                            <MediaVideo
                              stream={stream}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute left-1 bottom-1 text-[10px] px-1 rounded bg-black/60 text-white">
                              {peerNames[peerId] || t('chatBar.anonymous')}
                            </span>
                          </div>
                        ))}

                        <div className="relative rounded-md overflow-hidden bg-black/90 border border-primary/40 h-24">
                          <MediaVideo
                            stream={localStream}
                            muted
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute left-1 bottom-1 text-[10px] px-1 rounded bg-black/60 text-white">
                            {t('chatBar.calls.you')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {remoteStreamEntries.map(([peerId, stream]) => (
                          <div key={peerId}>
                            <MediaAudio stream={stream} />
                            <p className="text-xs text-muted-foreground">
                              {peerNames[peerId] || t('chatBar.anonymous')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <MicOff className="h-4 w-4 mr-1" />
                        ) : (
                          <Mic className="h-4 w-4 mr-1" />
                        )}
                        {isMuted ? t('chatBar.calls.unmute') : t('chatBar.calls.mute')}
                      </Button>

                      {callMode === 'video' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={toggleCamera}
                        >
                          {isCameraEnabled ? (
                            <Camera className="h-4 w-4 mr-1" />
                          ) : (
                            <CameraOff className="h-4 w-4 mr-1" />
                          )}
                          {isCameraEnabled ? t('chatBar.calls.cameraOn') : t('chatBar.calls.cameraOff')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {callStatus === 'calling' && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    {t('chatBar.calls.waiting')}
                  </div>
                )}
              </div>
            )}

            {showMessagingTabs && isMessagingInbox ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border bg-muted/15 px-2 py-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
                    {(['all', 'unread', 'favourites'] as const).map((filterKey) => (
                      <Button
                        key={filterKey}
                        type="button"
                        variant={inboxFilter === filterKey ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 shrink-0 rounded-full px-3 text-xs"
                        onClick={() => setInboxFilter(filterKey)}
                      >
                        {filterKey === 'all'
                          ? t('chatBar.inbox.filterAll')
                          : filterKey === 'unread'
                            ? t('chatBar.inbox.filterUnread')
                            : t('chatBar.inbox.filterFavourites')}
                      </Button>
                    ))}
                    {customInboxGroups.map((group) => {
                      const filterKey: InboxFilter = `custom:${group.id}`;
                      return (
                        <Button
                          key={group.id}
                          type="button"
                          variant={inboxFilter === filterKey ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 shrink-0 rounded-full px-3 text-xs"
                          onClick={() => setInboxFilter(filterKey)}
                        >
                          {group.name}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto h-8 w-8 shrink-0 rounded-full p-0"
                      onClick={() => {
                        setInboxSearchOpen((prev) => !prev);
                        queueMicrotask(() => contactSearchInputRef.current?.focus());
                      }}
                      aria-label="Search chats"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 shrink-0 rounded-full p-0"
                      onClick={() => setAddGroupDialogOpen(true)}
                      aria-label="Add group"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {profile?.id ? <MessagingPageProfile /> : null}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="space-y-2 border-b border-border bg-muted/10 px-3 py-2">
                    {!profile?.id ? (
                      <p className="text-xs text-muted-foreground">{t('chatBar.contacts.signInToSearch')}</p>
                    ) : (
                      <>
                        {inboxSearchOpen ? (
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              ref={contactSearchInputRef}
                              type="search"
                              value={contactQuery}
                              onChange={(event) => setContactQuery(event.target.value)}
                              onFocus={() => setPeopleSearchFocused(true)}
                              onBlur={() => setPeopleSearchFocused(false)}
                              placeholder={t('chatBar.contacts.searchPlaceholder')}
                              className="h-9 border-border bg-background pl-9"
                              autoComplete="off"
                              enterKeyHint="search"
                            />
                          </div>
                        ) : null}
                        {inboxSearchOpen ? peopleSearchPanel(contactQuery.trim().length >= 2) : null}
                        {(!inboxSearchOpen || contactQuery.trim().length < 2) && savedContacts.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">{t('chatBar.contacts.savedHint')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {savedContacts.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="rounded-full border border-border bg-background px-2.5 py-1 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                  onClick={() => {
                                    void openDirectConversation(c.id);
                                    setSelectedTargetProfileId(c.id);
                                  }}
                                >
                                  {c.full_name || c.username || t('chatBar.anonymous')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {profile?.id ? (
                          <div className="rounded-md border border-border bg-background">
                            <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                              {t('chatBar.private.conversationsHint')}
                            </p>
                            <div className="max-h-[min(40vh,320px)] overflow-y-auto">
                              {showCiviPinnedInInbox ? (
                              <CiviInboxRow
                                label={t('chatBar.private.civiPinnedLabel')}
                                onOpen={() => void openCiviConversation()}
                              />
                              ) : null}
                              {conversationsLoading && conversations.length === 0 ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                  {t('chatBar.loading')}
                                </div>
                              ) : (
                                <ul className="divide-y divide-border">
                                  {filteredDmRows.map((row) => (
                                    <li key={row.conversation_id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openPrivateThread(
                                            row.conversation_id,
                                            row.kind === 'direct' ? row.peer_profile_id : null,
                                          )
                                        }
                                        className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-muted/50"
                                      >
                                        <Avatar className="h-9 w-9 shrink-0">
                                          <AvatarImage
                                            src={resolveMessagingAvatarUrl(row.peer_profile_id, row.peer_avatar_url)}
                                          />
                                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                            {getInitials(row.peer_full_name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-baseline justify-between gap-2">
                                            <p className="truncate text-sm font-medium text-foreground">
                                              {row.peer_full_name || row.peer_username || t('chatBar.anonymous')}
                                            </p>
                                            {row.last_at ? (
                                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                                {formatTime(row.last_at)}
                                              </span>
                                            ) : null}
                                          </div>
                                          {row.peer_username ? (
                                            <p className="truncate text-xs text-muted-foreground">@{row.peer_username}</p>
                                          ) : null}
                                          {row.last_is_e2ee ? (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                              {t('chatBar.private.encryptedPreview')}
                                            </p>
                                          ) : row.last_content ? (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.last_content}</p>
                                          ) : null}
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                    </div>
                  </div>
                </div>
            ) : showMessagingTabs && isMessagingThread ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/10 px-1 py-2 sm:gap-2 sm:px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 p-0"
                      onClick={() => {
                        if (messageSelectionMode) {
                          setMessageSelectionMode(false);
                          setSelectedMessageIds(new Set());
                          clearMessageLongPressTimer();
                        } else {
                          navigate('/messaging');
                        }
                      }}
                      aria-label={
                        messageSelectionMode
                          ? t('chatBar.inbox.cancelSelection')
                          : t('chatBar.inbox.backToChats')
                      }
                    >
                      {messageSelectionMode ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                    {messageSelectionMode ? (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {t('chatBar.inbox.selectionCount', { count: selectedMessageIds.size })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 shrink-0 gap-1 px-2"
                          disabled={selectedMessageIds.size === 0}
                          onClick={() => toggleStarForSelectedMessages()}
                        >
                          <Star className="h-4 w-4" />
                          <span className="hidden text-xs sm:inline">{t('chatBar.private.star')}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 shrink-0 gap-1 px-2"
                          disabled={!selectedReportableMessage}
                          onClick={() => {
                            if (!selectedReportableMessage) return;
                            setReportTargetMessageId(selectedReportableMessage.id);
                            setReportDialogOpen(true);
                          }}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          <span className="hidden text-xs sm:inline">{t('chatBar.private.profile.reportMessage')}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 shrink-0 gap-1 px-2"
                          disabled={!selectedEditableMessage}
                          onClick={() => startEditingSelectedMessage()}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="hidden text-xs sm:inline">{t('chatBar.private.editMessage')}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-9 shrink-0 gap-1 px-2"
                          disabled={
                            isDirectThread ? !selectedMessagesCanUnsend : !selectedMessagesCanDeleteInAgent
                          }
                          onClick={() => void deleteSelectedMessages()}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden text-xs sm:inline">
                            {isDirectThread ? t('chatBar.inbox.unsend') : t('chatBar.inbox.deleteSelected')}
                          </span>
                        </Button>
                      </>
                    ) : (
                      <>
                        {selectedConversationRow ? (
                          isThreadAgent ? (
                            <CiviAvatar className="h-9 w-9" />
                          ) : (
                            <button
                              type="button"
                              className="shrink-0 rounded-full"
                              onClick={() => setThreadProfileOpen(true)}
                              aria-label={t('chatBar.private.openProfile')}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={resolveMessagingAvatarUrl(
                                    selectedConversationRow.peer_profile_id,
                                    selectedConversationRow.peer_avatar_url,
                                  )}
                                />
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {getInitials(selectedConversationRow.peer_full_name)}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          )
                        ) : (
                          <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline"
                            onClick={() => setThreadProfileOpen(true)}
                          >
                            {isThreadAgent ? <CiviAssistantHeading /> : threadPeerTitle}
                          </button>
                        </div>
                        {routeConversationId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 shrink-0 p-0"
                            onClick={() => toggleFavouriteConversation(routeConversationId)}
                            aria-label={
                              favouriteConversationIds.has(routeConversationId)
                                ? t('chatBar.inbox.ariaUnfavouriteThread')
                                : t('chatBar.inbox.ariaFavouriteThread')
                            }
                          >
                            <Star
                              className={cn(
                                'h-4 w-4',
                                favouriteConversationIds.has(routeConversationId) &&
                                  'fill-primary text-primary',
                              )}
                            />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 shrink-0 p-0"
                            disabled={isAgentThread || (isDirectThread && isThreadBlocked)}
                          title={isAgentThread ? t('chatBar.inbox.agentCallsUnavailable') : undefined}
                          onClick={() => void startCall('voice')}
                          aria-label={t('chatBar.inbox.ariaVoiceCall')}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 shrink-0 p-0"
                            disabled={isAgentThread || (isDirectThread && isThreadBlocked)}
                          title={isAgentThread ? t('chatBar.inbox.agentCallsUnavailable') : undefined}
                          onClick={() => void startCall('video')}
                          aria-label={t('chatBar.inbox.ariaVideoCall')}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                        {selectedConversationId ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 shrink-0 p-0"
                                aria-label={t('chatBar.inbox.menu.threadActions')}
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setMessageSelectionMode(true);
                                  setSelectedMessageIds(new Set());
                                }}
                              >
                                {t('chatBar.inbox.selectMessages')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSearchInConversationOpen(true);
                                  setSearchOnlyStarred(false);
                                }}
                              >
                                {t('chatBar.private.profile.searchHint')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => toggleMuteConversation(selectedConversationId)}
                              >
                                {mutedConversationIds.has(selectedConversationId)
                                  ? t('chatBar.inbox.menu.unmuteThread')
                                  : t('chatBar.inbox.menu.muteThread')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => exportCurrentChat()}>
                                {t('chatBar.inbox.menu.exportChat')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isThreadAgent ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setClearChatConfirmOpen(true)}
                                >
                                  {t('chatBar.inbox.menu.clearChat')}
                                </DropdownMenuItem>
                              ) : isDirectThread ? (
                                <DropdownMenuItem
                                  onSelect={() => setHideChatConfirmOpen(true)}
                                >
                                  {t('chatBar.inbox.menu.hideChat')}
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                        {profile?.id ? <MessagingPageProfile /> : null}
                      </>
                    )}
                  </div>
                  {directDmE2eeReady ? (
                    <p className="border-b border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
                      {t('chatBar.private.directE2eeOnHint')}
                    </p>
                  ) : null}
                  {isDirectThread && activeDisappearingMinutes > 0 ? (
                    <p className="border-b border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
                      {t('chatBar.private.profile.disappearingBanner', {
                        duration: disappearingDurationLabel(activeDisappearingMinutes),
                      })}
                    </p>
                  ) : null}
                  {searchInConversationOpen ? (
                    <div className="flex items-center gap-2 border-b border-border/60 bg-muted/15 px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={t('chatBar.private.searchPlaceholder')}
                        className="h-8 flex-1 bg-background"
                      />
                      {searchOnlyStarred ? (
                        <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                          {t('chatBar.private.starredOnly')}
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setSearchInConversationOpen(false);
                          setSearchOnlyStarred(false);
                          setSearchQuery('');
                        }}
                      >
                        {t('chatBar.inbox.cancelSelection')}
                      </Button>
                    </div>
                  ) : null}
                  {isPage ? (
                    <div
                      ref={scrollAreaRef}
                      className={cn(
                        'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 touch-pan-y [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden',
                        messageWallpaperClass,
                      )}
                    >
                      {messageThread}
                    </div>
                  ) : (
                    <ScrollArea className={cn('h-64 p-3', messageWallpaperClass)} ref={scrollAreaRef} hideScrollbar>
                      {messageThread}
                    </ScrollArea>
                  )}
                  {messageComposerFooter}
                </div>
            ) : showMessagingTabs && variant !== 'page' ? (
              <Tabs
                value={messagingTab}
                onValueChange={(value) => setMessagingTab(value as MessagingTab)}
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList className="grid h-12 w-full shrink-0 grid-cols-3 rounded-none border-b border-border bg-muted/15 p-0">
                    <TabsTrigger
                      value="chats"
                      className="gap-1.5 rounded-none border-b-2 border-transparent px-1 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      {t('chatBar.tabs.chats')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="calls"
                      className="gap-1.5 rounded-none border-b-2 border-transparent px-1 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {t('chatBar.tabs.calls')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="video"
                      className="gap-1.5 rounded-none border-b-2 border-transparent px-1 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
                    >
                      <Video className="h-4 w-4 shrink-0" />
                      {t('chatBar.tabs.video')}
                    </TabsTrigger>
                  </TabsList>
                <TabsContent
                  value="chats"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                >
                  <div className="shrink-0 space-y-2 border-b border-border bg-muted/10 px-3 py-2">
                    {!profile?.id ? (
                      <p className="text-xs text-muted-foreground">{t('chatBar.contacts.signInToSearch')}</p>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            ref={contactSearchInputRef}
                            type="search"
                            value={contactQuery}
                            onChange={(event) => setContactQuery(event.target.value)}
                            onFocus={() => setPeopleSearchFocused(true)}
                            onBlur={() => setPeopleSearchFocused(false)}
                            placeholder={t('chatBar.contacts.searchPlaceholder')}
                            className="h-9 border-border bg-background pl-9"
                            autoComplete="off"
                            enterKeyHint="search"
                          />
                        </div>
                        {peopleSearchPanel(contactQuery.trim().length >= 2)}
                        {contactQuery.trim().length < 2 && savedContacts.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">{t('chatBar.contacts.savedHint')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {savedContacts.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="rounded-full border border-border bg-background px-2.5 py-1 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                  onClick={() => {
                                    void openDirectConversation(c.id);
                                    setSelectedTargetProfileId(c.id);
                                  }}
                                >
                                  {c.full_name || c.username || t('chatBar.anonymous')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {profile?.id ? (
                          <div className="max-h-44 overflow-hidden rounded-md border border-border bg-background">
                            <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                              {t('chatBar.private.conversationsHint')}
                            </p>
                            <div className="max-h-36 overflow-y-auto">
                              <CiviInboxRow
                                label={t('chatBar.private.civiPinnedLabel')}
                                selected={
                                  selectedConversationRow?.kind === 'agent' &&
                                  selectedConversationRow.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID
                                }
                                onOpen={() => void openCiviConversation()}
                              />
                              {conversationsLoading && conversations.length === 0 ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                  {t('chatBar.loading')}
                                </div>
                              ) : (
                                <ul className="divide-y divide-border">
                                  {conversations
                                    .filter(
                                      (row) =>
                                        !(
                                          row.kind === 'agent' &&
                                          row.peer_profile_id === CIVI_ASSISTANT_PROFILE_ID
                                        ),
                                    )
                                    .map((row) => (
                                    <li key={row.conversation_id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openPrivateThread(
                                            row.conversation_id,
                                            row.kind === 'direct' ? row.peer_profile_id : null,
                                          )
                                        }
                                        className={cn(
                                          'flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-muted/50',
                                          selectedConversationId === row.conversation_id &&
                                            'bg-primary/15 ring-2 ring-inset ring-primary/40',
                                        )}
                                      >
                                        <Avatar className="h-9 w-9 shrink-0">
                                          <AvatarImage
                                            src={resolveMessagingAvatarUrl(row.peer_profile_id, row.peer_avatar_url)}
                                          />
                                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                            {getInitials(row.peer_full_name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-baseline justify-between gap-2">
                                            <p className="truncate text-sm font-medium text-foreground">
                                              {row.peer_full_name || row.peer_username || t('chatBar.anonymous')}
                                            </p>
                                            {row.last_at ? (
                                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                                {formatTime(row.last_at)}
                                              </span>
                                            ) : null}
                                          </div>
                                          {row.peer_username ? (
                                            <p className="truncate text-xs text-muted-foreground">@{row.peer_username}</p>
                                          ) : null}
                                          {row.last_is_e2ee ? (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                              {t('chatBar.private.encryptedPreview')}
                                            </p>
                                          ) : row.last_content ? (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.last_content}</p>
                                          ) : null}
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>

                  {directDmE2eeReady ? (
                    <p className="border-b border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
                      {t('chatBar.private.directE2eeOnHint')}
                    </p>
                  ) : null}
                  {isDirectThread && activeDisappearingMinutes > 0 ? (
                    <p className="border-b border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
                      {t('chatBar.private.profile.disappearingBanner', {
                        duration: disappearingDurationLabel(activeDisappearingMinutes),
                      })}
                    </p>
                  ) : null}

                  <ScrollArea
                    className={cn('p-3', isPage ? 'min-h-0 flex-1' : 'h-64', messageWallpaperClass)}
                    ref={scrollAreaRef}
                    hideScrollbar
                  >
                    {messageThread}
                  </ScrollArea>

                  {messageComposerFooter}
                </TabsContent>

                <TabsContent
                  value="calls"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                >
                  {callSetupFields('voice')}
                </TabsContent>

                <TabsContent
                  value="video"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                >
                  {callSetupFields('video')}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="min-h-0 flex-1" />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn('flex justify-end', isPage && 'min-h-0 flex-1 flex-col justify-end')}
          >
            <Button
              onClick={() => setIsExpanded(true)}
              className="rounded-full shadow-glow h-12 w-12 p-0"
              size="lg"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={threadProfileOpen} onOpenChange={setThreadProfileOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('chatBar.private.profile.title')}</SheetTitle>
            <SheetDescription>{t('chatBar.private.profile.subtitle')}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/15 p-3">
              {isThreadAgent ? (
                <CiviAvatar className="h-16 w-16" />
              ) : (
                <Avatar className="h-16 w-16">
                  <AvatarImage src={threadAvatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-base text-primary">
                    {getInitials(selectedConversationRow?.peer_full_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {isThreadAgent ? <CiviAssistantHeading /> : threadPeerTitle}
                </p>
                {threadUsername ? (
                  <p className="truncate text-sm text-muted-foreground">@{threadUsername}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {isThreadAgent
                    ? t('chatBar.private.civiPinnedSubtitle')
                    : t('chatBar.private.profile.endToEndStatus', {
                        status: directDmE2eeReady ? t('chatBar.private.profile.encrypted') : t('chatBar.private.profile.standard'),
                      })}
                </p>
              </div>
              {threadMemberProfileId && !isThreadAgent ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => navigate(`/user/${threadMemberProfileId}`)}
                >
                  {t('chatBar.contacts.viewProfile')}
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/70">
              <button
                type="button"
                className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left hover:bg-muted/30"
                onClick={() =>
                  selectedConversationId ? toggleMuteConversation(selectedConversationId) : undefined
                }
              >
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {selectedConversationId && mutedConversationIds.has(selectedConversationId)
                    ? t('chatBar.inbox.menu.unmuteThread')
                    : t('chatBar.inbox.menu.muteThread')}
                </span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left hover:bg-muted/30"
                onClick={() => {
                  setThreadProfileOpen(false);
                  setSearchInConversationOpen(true);
                  setSearchOnlyStarred(false);
                }}
              >
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{t('chatBar.private.profile.searchHint')}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left hover:bg-muted/30"
                onClick={() => {
                  setThreadProfileOpen(false);
                  setSearchInConversationOpen(true);
                  setSearchOnlyStarred(true);
                }}
              >
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {t('chatBar.private.profile.viewStarred', { count: starredMessageIds.size })}
                </span>
              </button>
              {threadMemberProfileId && isDirectThread ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left hover:bg-muted/30"
                  onClick={() => void toggleBlockedProfile(threadMemberProfileId)}
                >
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {isThreadBlocked
                      ? t('chatBar.private.profile.unblock')
                      : t('chatBar.private.profile.block')}
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/30"
                onClick={() => {
                  if (!threadMemberProfileId || isThreadAgent) return;
                  setReportTargetMessageId(null);
                  setReportDialogOpen(true);
                }}
                disabled={!threadMemberProfileId || isThreadAgent}
              >
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{t('chatBar.private.profile.report')}</span>
              </button>
            </div>

            <div className="rounded-2xl border border-border/70 p-3">
              {starredMessages.length > 0 ? (
                <div className="mb-3 rounded-xl border border-border/70 p-2">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t('chatBar.private.profile.starredMessages')}
                  </p>
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {starredMessages
                      .slice()
                      .reverse()
                      .slice(0, 12)
                      .map((row) => (
                        <button
                          key={`starred-${row.id}`}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/40"
                          onClick={() => {
                            setThreadProfileOpen(false);
                            setSearchInConversationOpen(true);
                            setSearchOnlyStarred(true);
                            setSearchQuery(row.content.slice(0, 80));
                          }}
                        >
                          <span className="truncate text-xs text-foreground">{row.content}</span>
                          <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                            {formatTime(row.created_at)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
              {isDirectThread ? (
              <div className="mb-3 rounded-xl border border-border/70 p-2">
                <p className="mb-1 text-sm font-medium text-foreground">
                  {t('chatBar.private.profile.disappearingTitle')}
                </p>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {t('chatBar.private.profile.disappearingHint')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DISAPPEARING_MINUTE_OPTIONS.map((minutes) => (
                    <Button
                      key={`disappear-${minutes}`}
                      type="button"
                      variant={activeDisappearingMinutes === minutes ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={disappearingBusy}
                      onClick={() => void setDisappearingMinutes(minutes)}
                    >
                      {minutes === 0
                        ? t('chatBar.private.profile.disappearOff')
                        : minutes < 1440
                          ? t('chatBar.private.profile.disappearHours', { hours: minutes / 60 })
                          : t('chatBar.private.profile.disappearDays', { days: minutes / 1440 })}
                    </Button>
                  ))}
                </div>
              </div>
              ) : null}
              <div className="mb-3 rounded-xl border border-border/70 p-2">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {t('chatBar.private.profile.wallpaperTitle')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['default', 'mesh', 'aurora', 'paper'] as const).map((theme) => (
                    <Button
                      key={`wallpaper-${theme}`}
                      type="button"
                      variant={activeWallpaper === theme ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setWallpaperTheme(theme)}
                    >
                      {theme === 'default'
                        ? t('chatBar.private.profile.wallpaperDefault')
                        : theme === 'mesh'
                          ? t('chatBar.private.profile.wallpaperMesh')
                          : theme === 'aurora'
                            ? t('chatBar.private.profile.wallpaperAurora')
                            : t('chatBar.private.profile.wallpaperPaper')}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-sm font-medium text-foreground">{t('chatBar.private.profile.mediaLinksDocs')}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/70 p-2 text-center">
                  <ImageIcon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{threadMediaCounts.images}</p>
                  <p className="text-[11px] text-muted-foreground">{t('chatBar.private.profile.photos')}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-2 text-center">
                  <Link2 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{threadMediaCounts.links}</p>
                  <p className="text-[11px] text-muted-foreground">{t('chatBar.private.profile.links')}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-2 text-center">
                  <FileText className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{threadMediaCounts.files}</p>
                  <p className="text-[11px] text-muted-foreground">{t('chatBar.private.profile.docs')}</p>
                </div>
              </div>
              {threadMediaLinks.length > 0 ? (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
                  {threadMediaLinks.slice(-12).reverse().map((row) => (
                    <button
                      key={`${row.id}-${row.url}`}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/40"
                      onClick={() => void openAttachmentUrl(row.url)}
                    >
                      <span className="truncate text-xs text-foreground">{row.url}</span>
                      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(row.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={addGroupDialogOpen}
        onOpenChange={(open) => {
          setAddGroupDialogOpen(open);
          if (!open) setNewGroupName('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add group</AlertDialogTitle>
            <AlertDialogDescription>
              Create a custom chat group tab next to Unread and Favourites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="Group name"
            maxLength={40}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                createCustomInboxGroup();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!newGroupName.trim()}
              onClick={(event) => {
                event.preventDefault();
                createCustomInboxGroup();
              }}
            >
              Add
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearChatConfirmOpen} onOpenChange={setClearChatConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chatBar.inbox.menu.clearChatTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('chatBar.inbox.menu.clearChatDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearChatBusy}>{t('chatBar.inbox.menu.clearChatCancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={clearChatBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleClearChatConfirmed();
              }}
            >
              {t('chatBar.inbox.menu.clearChatConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={hideChatConfirmOpen} onOpenChange={setHideChatConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chatBar.inbox.menu.hideChatTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('chatBar.inbox.menu.hideChatDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hideChatBusy}>{t('chatBar.inbox.menu.clearChatCancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={hideChatBusy}
              onClick={(event) => {
                event.preventDefault();
                void handleHideChatConfirmed();
              }}
            >
              {t('chatBar.inbox.menu.hideChatConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) {
            setReportTargetMessageId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chatBar.private.profile.reportTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {reportTargetMessageId
                ? t('chatBar.private.profile.reportMessageDescription')
                : t('chatBar.private.profile.reportDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reportTargetMessageId ? (
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {messages.find((message) => message.id === reportTargetMessageId)?.content?.slice(0, 220) || ''}
            </div>
          ) : null}
          <Textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder={t('chatBar.private.profile.reportReasonPlaceholder')}
            rows={4}
            maxLength={1000}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reportSubmitting}>
              {t('chatBar.inbox.menu.clearChatCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reportSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void submitContactReport();
              }}
            >
              {reportSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('chatBar.private.profile.reportSubmit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
