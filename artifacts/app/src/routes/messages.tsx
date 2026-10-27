import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Send,
  Paperclip,
  Shield,
  MoreVertical,
  Loader2,
  Users,
  UserPlus,
  Check,
  CheckCheck,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Download,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      user: typeof search.user === "string" ? search.user : undefined,
      convo: typeof search.convo === "string" ? search.convo : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Messages — MyCommNet" },
      {
        name: "description",
        content: "Direct message inbox for mentors, organizations, and verified connections.",
      },
    ],
  }),
  component: MessagesPage,
});

type ConversationItem = {
  id: string;
  type: "direct" | "group";
  otherUser: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    headline: string | null;
  };
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  attachments?: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
    signedUrl?: string;
  }[];
};

type ConnectedPeer = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
};

export function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  // Navigation & Conversation selection
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(searchParams.convo ?? null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [convosError, setConvosError] = useState<string | null>(null);

  // Active Thread messages
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Message composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search & Filter
  const [inboxFilter, setInboxFilter] = useState<"All" | "Unread">("All");
  const [inboxSearch, setInboxSearch] = useState("");

  // New Conversation / Connection Search
  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [connections, setConnections] = useState<ConnectedPeer[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [peerSearchQuery, setPeerSearchQuery] = useState("");

  // Typing indicators via Realtime Broadcast
  const [isOtherTyping, setIsOtherTyping] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Schema readiness notice
  const [schemaPending, setSchemaPending] = useState(false);

  // Auto-scroll messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // 1. Fetch user's accepted connections for direct messaging search
  async function loadUserConnections() {
    if (!user) return;
    setLoadingConnections(true);
    try {
      const { data: rows, error: connErr } = await supabase
        .from("user_connections")
        .select("requester_id, receiver_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (connErr) throw connErr;

      if (!rows || rows.length === 0) {
        setConnections([]);
        return;
      }

      const peerIds = rows.map((r) => (r.requester_id === user.id ? r.receiver_id : r.requester_id));

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, headline")
        .in("id", peerIds);

      const peers: ConnectedPeer[] = peerIds.map((pid) => {
        const p = profileRows?.find((r) => r.id === pid);
        return {
          id: pid,
          fullName: p?.full_name || "Community Member",
          username: p?.username || `user${pid.replace(/-/g, "").slice(0, 8)}`,
          avatarUrl: p?.avatar_url || null,
          headline: p?.headline || null,
        };
      });

      setConnections(peers);
    } catch (err: any) {
      console.warn("Could not load peer connections:", err?.message);
    } finally {
      setLoadingConnections(false);
    }
  }

  // 2. Fetch conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvos(true);
    setConvosError(null);

    try {
      // Query conversation participants for current user
      const { data: partRows, error: partErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (partErr) {
        if (partErr.message.includes("Could not find the table") || partErr.code === "42P01") {
          setSchemaPending(true);
          setLoadingConvos(false);
          return;
        }
        throw partErr;
      }

      if (!partRows || partRows.length === 0) {
        setConversations([]);
        setLoadingConvos(false);
        return;
      }

      const convoIds = partRows.map((r) => r.conversation_id);

      // Query conversations
      const { data: convosData, error: convosErr } = await supabase
        .from("conversations")
        .select("id, type, user1_id, user2_id, updated_at")
        .in("id", convoIds)
        .order("updated_at", { ascending: false });

      if (convosErr) throw convosErr;

      // Find other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convoIds)
        .neq("user_id", user.id);

      const otherUserIds = Array.from(new Set(allParticipants?.map((p) => p.user_id) || []));

      // Resolve profile names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, headline")
        .in("id", otherUserIds);

      const profileMap = new Map<string, any>();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      // Fetch last message for each conversation
      const convoItems: ConversationItem[] = [];

      for (const c of convosData || []) {
        const otherParticipant = allParticipants?.find((p) => p.conversation_id === c.id);
        const otherId =
          otherParticipant?.user_id ||
          (c.user1_id === user.id ? c.user2_id : c.user1_id) ||
          "";

        const prof = profileMap.get(otherId);

        // Fetch last message
        const { data: lastMsgData } = await supabase
          .from("messages")
          .select("body, created_at, sender_id, is_read")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count unread
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        convoItems.push({
          id: c.id,
          type: c.type as "direct" | "group",
          otherUser: {
            id: otherId,
            fullName: prof?.full_name || "Community Member",
            username: prof?.username || `user${otherId.replace(/-/g, "").slice(0, 8)}`,
            avatarUrl: prof?.avatar_url || null,
            headline: prof?.headline || null,
          },
          lastMessage: lastMsgData
            ? {
                body: lastMsgData.body,
                createdAt: lastMsgData.created_at,
                senderId: lastMsgData.sender_id,
                isRead: lastMsgData.is_read,
              }
            : null,
          unreadCount: unreadCount || 0,
        });
      }

      setConversations(convoItems);

      // Auto-select first conversation if none selected and on desktop
      if (!activeConvoId && convoItems.length > 0 && typeof window !== "undefined" && window.innerWidth >= 1024) {
        setActiveConvoId(convoItems[0].id);
      }
    } catch (err: any) {
      console.warn("Conversations fetch note:", err?.message);
      setConvosError(err?.message ?? "Failed to load conversations.");
    } finally {
      setLoadingConvos(false);
    }
  }, [user, activeConvoId]);

  // 3. Load messages for the active conversation
  const loadMessages = useCallback(async (convoId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    setThreadError(null);

    try {
      const { data: msgRows, error: msgErr } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          body,
          is_read,
          read_at,
          created_at,
          message_attachments (
            id,
            file_name,
            file_size,
            file_type,
            storage_path
          )
        `)
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true });

      if (msgErr) throw msgErr;

      // Generate signed URLs for attachments if private
      const formattedMessages: MessageItem[] = await Promise.all(
        (msgRows || []).map(async (m: any) => {
          const attachments = await Promise.all(
            (m.message_attachments || []).map(async (att: any) => {
              try {
                const { data } = await supabase.storage
                  .from("message-attachments")
                  .createSignedUrl(att.storage_path, 3600);
                return {
                  id: att.id,
                  fileName: att.file_name,
                  fileSize: att.file_size,
                  fileType: att.file_type,
                  storagePath: att.storage_path,
                  signedUrl: data?.signedUrl || undefined,
                };
              } catch {
                return {
                  id: att.id,
                  fileName: att.file_name,
                  fileSize: att.file_size,
                  fileType: att.file_type,
                  storagePath: att.storage_path,
                };
              }
            })
          );

          return {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            body: m.body,
            isRead: m.is_read,
            readAt: m.read_at,
            createdAt: m.created_at,
            attachments,
          };
        })
      );

      setMessages(formattedMessages);

      // 4. Mark incoming messages as read
      const unreadIncoming = formattedMessages.filter(
        (m) => m.senderId !== user.id && !m.isRead
      );

      if (unreadIncoming.length > 0) {
        const unreadIds = unreadIncoming.map((m) => m.id);
        const now = new Date().toISOString();

        await supabase
          .from("messages")
          .update({ is_read: true, read_at: now })
          .in("id", unreadIds);

        await supabase
          .from("conversation_participants")
          .update({ last_read_at: now })
          .eq("conversation_id", convoId)
          .eq("user_id", user.id);

        // Update local state
        setMessages((prev) =>
          prev.map((m) => (unreadIds.includes(m.id) ? { ...m, isRead: true, readAt: now } : m))
        );

        setConversations((prev) =>
          prev.map((c) => (c.id === convoId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err: any) {
      console.warn("Messages load error:", err?.message);
      setThreadError(err?.message ?? "Unable to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      void loadConversations();
      void loadUserConnections();
    }
  }, [authLoading, user, loadConversations]);

  // Load messages when activeConvoId changes
  useEffect(() => {
    if (activeConvoId) {
      void loadMessages(activeConvoId);
    } else {
      setMessages([]);
    }
  }, [activeConvoId, loadMessages]);

  // 5. Direct message target from search params (?user=...)
  useEffect(() => {
    async function initUserConvo(targetUserId: string) {
      if (!user) return;
      try {
        // Try calling the idempotent RPC function
        const { data: convoId, error: rpcErr } = await supabase.rpc(
          "get_or_create_direct_conversation",
          { target_user_id: targetUserId }
        );

        if (!rpcErr && convoId) {
          setActiveConvoId(convoId);
          await loadConversations();
          return;
        }

        // Fallback: direct table queries
        const u1 = user.id < targetUserId ? user.id : targetUserId;
        const u2 = user.id < targetUserId ? targetUserId : user.id;

        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("user1_id", u1)
          .eq("user2_id", u2)
          .maybeSingle();

        if (existing) {
          setActiveConvoId(existing.id);
          await loadConversations();
        } else {
          // Insert new conversation
          const { data: newConvo, error: insErr } = await supabase
            .from("conversations")
            .insert({ type: "direct", user1_id: u1, user2_id: u2 })
            .select("id")
            .single();

          if (!insErr && newConvo) {
            await supabase.from("conversation_participants").insert([
              { conversation_id: newConvo.id, user_id: u1 },
              { conversation_id: newConvo.id, user_id: u2 },
            ]);
            setActiveConvoId(newConvo.id);
            await loadConversations();
          }
        }
      } catch (err) {
        console.warn("Direct convo initialization note:", err);
      }
    }

    if (searchParams.user && user && searchParams.user !== user.id) {
      void initUserConvo(searchParams.user);
    }
  }, [searchParams.user, user, loadConversations]);

  // 6. Realtime Subscriptions for Messages and Typing
  useEffect(() => {
    if (!activeConvoId || !user) return;

    // A. Realtime postgres changes for new messages and read receipts
    const messageChannel = supabase
      .channel(`convo-db-${activeConvoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvoId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== user.id) {
            // Mark read immediately since user is actively in this conversation
            const now = new Date().toISOString();
            void supabase
              .from("messages")
              .update({ is_read: true, read_at: now })
              .eq("id", newMsg.id);

            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderId: newMsg.sender_id,
                body: newMsg.body,
                isRead: true,
                readAt: now,
                createdAt: newMsg.created_at,
              },
            ]);
          } else {
            // Own message already added optimistically or confirm it
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  conversationId: newMsg.conversation_id,
                  senderId: newMsg.sender_id,
                  body: newMsg.body,
                  isRead: newMsg.is_read,
                  readAt: newMsg.read_at,
                  createdAt: newMsg.created_at,
                },
              ];
            });
          }

          // Update inbox preview
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvoId
                ? {
                    ...c,
                    lastMessage: {
                      body: newMsg.body,
                      createdAt: newMsg.created_at,
                      senderId: newMsg.sender_id,
                      isRead: true,
                    },
                  }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvoId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, isRead: updated.is_read, readAt: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    // B. Realtime Broadcast for transient typing indicators
    const typingChannel = supabase
      .channel(`typing-${activeConvoId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload?.payload?.userId && payload.payload.userId !== user.id) {
          setIsOtherTyping(payload.payload.name || "Connection");
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(null);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConvoId, user]);

  // Broadcast typing event (throttled)
  function handleTyping() {
    if (!activeConvoId || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1800) {
      lastTypingSentRef.current = now;
      void supabase.channel(`typing-${activeConvoId}`).send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, name: user.user_metadata?.full_name || "Connection" },
      });
    }
  }

  // 7. Send Message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user || !activeConvoId) return;

    const trimmedBody = draft.trim();
    if (!trimmedBody && !selectedFile) return;

    setSending(true);
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      // 1. Upload attachment if present
      let uploadedAttachment: any = null;
      if (selectedFile) {
        setUploadProgress(10);
        const fileExt = selectedFile.name.split(".").pop();
        const safeName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = `${activeConvoId}/${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("message-attachments")
          .upload(filePath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (upErr) throw upErr;
        setUploadProgress(60);

        uploadedAttachment = {
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          storage_path: filePath,
        };
      }

      // 2. Insert message record
      const { data: msgData, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConvoId,
          sender_id: user.id,
          body: trimmedBody || (selectedFile ? `Shared file: ${selectedFile.name}` : ""),
        })
        .select("id, created_at")
        .single();

      if (msgErr) throw msgErr;

      // 3. Insert attachment metadata if uploaded
      let attResult: any = null;
      if (uploadedAttachment && msgData) {
        const { data: attData, error: attErr } = await supabase
          .from("message_attachments")
          .insert({
            message_id: msgData.id,
            conversation_id: activeConvoId,
            uploader_id: user.id,
            ...uploadedAttachment,
          })
          .select("id, file_name, file_size, file_type, storage_path")
          .single();

        if (!attErr && attData) {
          attResult = attData;
        }
      }

      // 4. Update conversation's updated_at
      void supabase
        .from("conversations")
        .update({ updated_at: now })
        .eq("id", activeConvoId);

      // Optimistic addition
      const sentMessage: MessageItem = {
        id: msgData?.id || tempId,
        conversationId: activeConvoId,
        senderId: user.id,
        body: trimmedBody || (selectedFile ? `Shared file: ${selectedFile.name}` : ""),
        isRead: false,
        readAt: null,
        createdAt: msgData?.created_at || now,
        attachments: attResult ? [attResult] : undefined,
      };

      setMessages((prev) => [...prev, sentMessage]);
      setDraft("");
      setSelectedFile(null);
      setUploadProgress(null);

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvoId
            ? {
                ...c,
                lastMessage: {
                  body: sentMessage.body,
                  createdAt: sentMessage.createdAt,
                  senderId: user.id,
                  isRead: false,
                },
              }
            : c
        )
      );
    } catch (err: any) {
      console.error("Failed to send message:", err);
      alert(err?.message ?? "Message could not be sent. Please retry.");
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  }

  // Start new direct conversation with a connection
  async function handleStartConvoWithPeer(peer: ConnectedPeer) {
    if (!user) return;
    setShowNewConvoModal(false);

    try {
      // 1. Try idempotent RPC
      const { data: convoId, error: rpcErr } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { target_user_id: peer.id }
      );

      if (!rpcErr && convoId) {
        setActiveConvoId(convoId);
        await loadConversations();
        return;
      }

      // 2. Direct tables fallback
      const u1 = user.id < peer.id ? user.id : peer.id;
      const u2 = user.id < peer.id ? peer.id : user.id;

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user1_id", u1)
        .eq("user2_id", u2)
        .maybeSingle();

      if (existing) {
        setActiveConvoId(existing.id);
      } else {
        const { data: newConvo, error: insErr } = await supabase
          .from("conversations")
          .insert({ type: "direct", user1_id: u1, user2_id: u2 })
          .select("id")
          .single();

        if (!insErr && newConvo) {
          await supabase.from("conversation_participants").insert([
            { conversation_id: newConvo.id, user_id: u1 },
            { conversation_id: newConvo.id, user_id: u2 },
          ]);
          setActiveConvoId(newConvo.id);
        }
      }

      await loadConversations();
    } catch (err) {
      console.warn("Peer convo error:", err);
    }
  }

  // Active conversation record
  const currentConvo = conversations.find((c) => c.id === activeConvoId);

  // Filtered inbox list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (inboxFilter === "Unread" && c.unreadCount === 0) return false;
      if (inboxSearch.trim()) {
        const q = inboxSearch.toLowerCase();
        const matchesName = c.otherUser.fullName.toLowerCase().includes(q);
        const matchesUsername = c.otherUser.username.toLowerCase().includes(q);
        const matchesLast = c.lastMessage?.body.toLowerCase().includes(q) ?? false;
        return matchesName || matchesUsername || matchesLast;
      }
      return true;
    });
  }, [conversations, inboxFilter, inboxSearch]);

  // Filtered connections in New Message dialog
  const filteredPeers = useMemo(() => {
    const q = peerSearchQuery.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.headline && p.headline.toLowerCase().includes(q))
    );
  }, [connections, peerSearchQuery]);

  return (
    <AppShell>
      <PageHeader title="Messages" subtitle="Connect. Communicate. Create community impact." />

      {/* Privacy banner */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-3">
        <Shield className="h-5 w-5 text-brand-teal shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-foreground">Your conversations are private and secure.</span>{" "}
          <span className="text-muted-foreground">
            Strict row-level security ensures only verified conversation participants have access to messages and attachments.
          </span>
        </div>
      </div>

      {/* Schema pending notice if migration hasn't been executed yet */}
      {schemaPending && (
        <div className="mb-6 rounded-2xl border border-brand-purple/40 bg-brand-purple/10 p-4 text-xs text-foreground/90 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Messaging Schema Prepared</p>
            <p className="mt-0.5 text-muted-foreground">
              The migration <code className="font-mono text-brand-teal">20261026200000_real_messaging_system.sql</code> is created and ready to be run in your Supabase SQL Editor to enable full multi-user storage and real-time syncing.
            </p>
          </div>
        </div>
      )}

      {/* Messaging Layout */}
      <div className="grid h-[720px] max-h-[82vh] gap-5 rounded-3xl lg:grid-cols-[360px_1fr] overflow-hidden">
        {/* Left: Inbox List (hidden on mobile if active conversation selected) */}
        <aside
          className={`flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface ${
            activeConvoId ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Inbox Search & Start Convo Button */}
          <div className="border-b border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-base text-foreground">Inbox</h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewConvoModal(true);
                  void loadUserConnections();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition active:scale-95"
                title="Start conversation with a connection"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>New Message</span>
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Search messages or connections…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {inboxSearch && (
                <button type="button" onClick={() => setInboxSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
              {(["All", "Unread"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setInboxFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    inboxFilter === filter
                      ? "bg-gradient-brand text-white shadow-glow-purple"
                      : "bg-surface-2 text-muted-foreground hover:bg-surface-2/80 ring-1 ring-border/60"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                <span className="text-xs">Loading conversations…</span>
              </div>
            ) : convosError ? (
              <div className="p-4 text-center text-xs text-red-300">
                <p>{convosError}</p>
                <button
                  type="button"
                  onClick={() => void loadConversations()}
                  className="mt-2 font-semibold text-brand-teal hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-3">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No conversations yet</p>
                <p className="text-xs leading-relaxed">
                  Start a conversation with any member in your accepted connections.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewConvoModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2"
                >
                  <UserPlus className="h-3.5 w-3.5 text-brand-teal" />
                  <span>Find Connection</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = activeConvoId === convo.id;
                const initial = convo.otherUser.fullName.charAt(0).toUpperCase();

                return (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => setActiveConvoId(convo.id)}
                    className={`flex w-full items-start gap-3 border-b border-border/40 px-4 py-3.5 text-left transition ${
                      isSelected ? "bg-surface-2" : "hover:bg-surface-2/60"
                    }`}
                  >
                    {convo.otherUser.avatarUrl ? (
                      <img
                        src={convo.otherUser.avatarUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-brand-purple/30 shrink-0"
                      />
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-white shadow-glow-purple">
                        {initial}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {convo.otherUser.fullName}
                        </p>
                        {convo.lastMessage && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(convo.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      {convo.otherUser.headline ? (
                        <p className="text-[10px] uppercase tracking-wider text-brand-teal truncate font-medium">
                          {convo.otherUser.headline}
                        </p>
                      ) : (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                          @{convo.otherUser.username}
                        </p>
                      )}

                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {convo.lastMessage ? convo.lastMessage.body : "Conversation started"}
                      </p>
                    </div>

                    {convo.unreadCount > 0 && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center self-center rounded-full bg-brand-purple text-[10px] font-semibold text-white">
                        {convo.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Selected Conversation Thread */}
        <section
          className={`flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface ${
            !activeConvoId ? "hidden lg:flex items-center justify-center text-center p-8 text-muted-foreground" : "flex"
          }`}
        >
          {!activeConvoId || !currentConvo ? (
            <div className="space-y-3 max-w-sm">
              <Users className="mx-auto h-12 w-12 text-brand-teal/60" />
              <h3 className="font-display font-semibold text-lg text-foreground">Select a Conversation</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Choose a conversation from your inbox on the left, or click "New Message" to start a chat with someone in your network.
              </p>
              <button
                type="button"
                onClick={() => setShowNewConvoModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95"
              >
                <UserPlus className="h-3.5 w-3.5" /> Start New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <header className="flex items-center gap-3 border-b border-border/60 p-4 bg-surface">
                <button
                  type="button"
                  onClick={() => setActiveConvoId(null)}
                  className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
                  title="Back to inbox"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {currentConvo.otherUser.avatarUrl ? (
                  <img
                    src={currentConvo.otherUser.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-purple/30 shrink-0"
                  />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-white shadow-glow-purple">
                    {currentConvo.otherUser.fullName.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {currentConvo.otherUser.fullName}
                    </p>
                    <Link
                      to="/share/$username"
                      params={{ username: currentConvo.otherUser.username }}
                      className="text-muted-foreground hover:text-brand-teal transition-colors"
                      title="View public profile"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentConvo.otherUser.headline || `@${currentConvo.otherUser.username}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    to="/share/$username"
                    params={{ username: currentConvo.otherUser.username }}
                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition"
                  >
                    View Profile
                  </Link>
                </div>
              </header>

              {/* Messages History List */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                    <span className="text-xs">Loading message thread…</span>
                  </div>
                ) : threadError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 text-center">
                    <p>{threadError}</p>
                    <button
                      type="button"
                      onClick={() => void loadMessages(activeConvoId)}
                      className="mt-2 font-semibold text-brand-teal hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground space-y-2">
                    <Sparkles className="mx-auto h-8 w-8 text-brand-teal/60" />
                    <p className="text-sm font-semibold text-foreground">Start the Conversation</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Send a message or share an attachment to collaborate with {currentConvo.otherUser.fullName}.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id;

                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "bg-gradient-brand text-white shadow-glow-purple"
                              : "bg-surface-2 text-foreground border border-border/40"
                          }`}
                        >
                          {/* Attachments preview */}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {m.attachments.map((att) => {
                                const isImage = att.fileType.startsWith("image/");

                                if (isImage && att.signedUrl) {
                                  return (
                                    <a
                                      key={att.id}
                                      href={att.signedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block overflow-hidden rounded-xl border border-white/20 hover:opacity-95"
                                    >
                                      <img
                                        src={att.signedUrl}
                                        alt={att.fileName}
                                        className="max-h-60 w-full object-cover"
                                      />
                                    </a>
                                  );
                                }

                                return (
                                  <div
                                    key={att.id}
                                    className={`flex items-center justify-between gap-3 rounded-xl p-2.5 text-xs ${
                                      isMe ? "bg-white/10 border border-white/20" : "bg-surface border border-border"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="h-4 w-4 shrink-0" />
                                      <span className="truncate font-medium">{att.fileName}</span>
                                    </div>
                                    {att.signedUrl && (
                                      <a
                                        href={att.signedUrl}
                                        download={att.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 p-1 hover:opacity-80"
                                        title="Download attachment"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {m.body && <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}

                          {/* Timestamp & Read Receipt */}
                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                              isMe ? "text-white/75" : "text-muted-foreground"
                            }`}
                          >
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {isMe && (
                              <span title={m.isRead ? `Read ${m.readAt ? new Date(m.readAt).toLocaleTimeString() : ""}` : "Sent"}>
                                {m.isRead ? (
                                  <span className="inline-flex items-center text-brand-teal font-semibold">
                                    <CheckCheck className="h-3 w-3 inline mr-0.5" /> Read
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center opacity-80">
                                    <Check className="h-3 w-3 inline mr-0.5" /> Sent
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Realtime Typing Indicator */}
                {isOtherTyping && (
                  <div className="flex items-center gap-2 text-xs text-brand-teal animate-pulse py-1">
                    <span className="h-2 w-2 rounded-full bg-brand-teal" />
                    <span>{isOtherTyping} is typing…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <footer className="border-t border-border/60 p-3 sm:p-4 bg-surface">
                {selectedFile && (
                  <div className="mb-2 flex items-center justify-between rounded-xl bg-surface-2 p-2 text-xs text-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                      <span className="truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-muted-foreground hover:bg-surface-2/80 hover:text-foreground transition disabled:opacity-50"
                    title="Attach image or file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        handleTyping();
                      }}
                      placeholder={`Write a message to ${currentConvo.otherUser.fullName}…`}
                      disabled={sending}
                      className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-foreground outline-none focus:border-brand-teal transition placeholder:text-muted-foreground"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending || (!draft.trim() && !selectedFile)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow-purple hover:opacity-95 transition disabled:opacity-40 active:scale-95"
                    title="Send message"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </footer>
            </>
          )}
        </section>
      </div>

      {/* New Message / Connection Search Modal */}
      {showNewConvoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex flex-col w-full max-w-md max-h-[85vh] rounded-3xl border border-border/80 bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-brand-teal" />
                <h3 className="font-display font-semibold text-base">New Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewConvoModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-border/60 bg-surface">
              <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={peerSearchQuery}
                  onChange={(e) => setPeerSearchQuery(e.target.value)}
                  placeholder="Search your accepted connections…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>

            {/* Connections List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loadingConnections ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
                  <span className="text-xs">Loading connections…</span>
                </div>
              ) : filteredPeers.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground space-y-2">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs">
                    {connections.length === 0
                      ? "You haven't accepted any connections yet."
                      : `No connection matches "${peerSearchQuery}".`}
                  </p>
                  <Link
                    to="/profile"
                    onClick={() => setShowNewConvoModal(false)}
                    className="inline-block mt-2 text-xs font-semibold text-brand-teal hover:underline"
                  >
                    Share Community Pass to Connect →
                  </Link>
                </div>
              ) : (
                filteredPeers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => void handleStartConvoWithPeer(peer)}
                    className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-surface-2 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {peer.avatarUrl ? (
                        <img
                          src={peer.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-brand-purple/30 shrink-0"
                        />
                      ) : (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-white shadow-glow-purple">
                          {peer.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{peer.fullName}</p>
                        <p className="text-xs text-brand-teal truncate font-medium">
                          {peer.headline || `@${peer.username}`}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-semibold text-brand-purple">
                      Message →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
