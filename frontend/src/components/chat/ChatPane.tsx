"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useSocket } from "../WebSocketProvider";
import {
  NoteToSelfIcon,
  VerifiedCheckIcon,
  SearchIcon,
  MoreDotsIcon,
  SmileIcon,
  MicIcon,
  PlusIcon,
  ChevronUpIcon,
  DoubleCheckIcon,
  ImageIcon,
  FileIcon,
  PollIcon,
  BlockIcon,
  TrashIcon,
  ArrowLeftIcon,
  GroupPeopleIcon,
  MessageStatusIcon,
} from "@/components/icons/Icons";
import styles from "./chat.module.css";

// Cache-busts locally-served avatar URLs so updated profile pics show without hard-refresh
const cacheBustAvatar = (url?: string | null, fallback = "") => {
  if (!url) return fallback;
  if (url.startsWith("http://localhost")) return `${url}?t=${Math.floor(Date.now() / 30000)}`;
  return url;
};

const POPULAR_EMOJIS = [
  "😀", "😂", "❤️", "👍", "🔥", "🎉", 
  "🙏", "✨", "😊", "😎", "🚀", "💬", 
  "💯", "👋", "🥳", "👏", "🌟", "😍",
  "🙌", "😁", "😍", "🥳", "🥺", "😴"
];

interface ChatPaneProps {
  conversationId: string;
}

export const ChatPane: React.FC<ChatPaneProps> = ({ conversationId }) => {
  const isNoteToSelf = conversationId === "note-to-self";

  const [messages, setMessages] = useState<any[]>(
    // Default only shown for Note to Self before real data loads
    isNoteToSelf
      ? [{ id: "init-1", content: "hii", msg_type: "text", created_at: new Date().toISOString(), isSent: true, status: "read" }]
      : []
  );
  const [user, setUser] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultIdx, setSearchResultIdx] = useState(0);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [allConversations, setAllConversations] = useState<any[]>([]);

  const [isTypingRemote, setIsTypingRemote] = useState(false);
  const [typingName, setTypingName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sendMessage, sendTypingStart, sendTypingStop, markRead, lastEvent } = useSocket();
  const router = useRouter();

  const loadData = async () => {
    try {
      const u = await fetchApi("/auth/me");
      setUser(u);

      if (!isNoteToSelf) {
        const msgs = await fetchApi(`/conversations/${conversationId}/messages`);
        setMessages(msgs);

        const convs = await fetchApi("/conversations/");
        const currentConv = convs.find((c: any) => String(c.id) === conversationId);
        setConversation(currentConv);
        setAllConversations(convs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    setShowDetails(false);
  }, [conversationId]);

  useEffect(() => {
    if (lastEvent && !isNoteToSelf) {
      if (lastEvent.type === "message_new" && String(lastEvent.payload.conversation_id) === conversationId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === lastEvent.payload.id)) return prev;
          return [...prev, lastEvent.payload];
        });
        // Mark as read if we're the recipient
        if (lastEvent.payload.sender_id !== undefined && lastEvent.payload.sender_id !== user?.id) {
          markRead(lastEvent.payload.id);
        }
      } else if (lastEvent.type === "typing_start" && String(lastEvent.payload.conversation_id) === conversationId) {
        setIsTypingRemote(true);
        setTypingName(lastEvent.payload.user_name || "Contact");
        // Auto-clear after 3 s in case typing_stop is missed
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTypingRemote(false), 3000);
      } else if (lastEvent.type === "typing_stop" && String(lastEvent.payload.conversation_id) === conversationId) {
        setIsTypingRemote(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      } else if (lastEvent.type === "message_status_update" && String(lastEvent.payload.conversation_id) === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === lastEvent.payload.message_id ? { ...m, status: lastEvent.payload.status } : m
          )
        );
      }
    }
  }, [lastEvent, conversationId, isNoteToSelf]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Stop typing indicator
    if (!isNoteToSelf) {
      sendTypingStop(Number(conversationId));
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
    
    if (isNoteToSelf) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: inputText,
          msg_type: "text",
          created_at: new Date().toISOString(),
          isSent: true,
          status: "read",
        },
      ]);
    } else {
      sendMessage(Number(conversationId), inputText, "text");
    }

    setInputText("");
    setShowEmojiPicker(false);
  };

  // Debounce typing events: emit typing.start on first keypress, stop after 1.5 s idle
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);

      if (!isNoteToSelf && val.trim().length > 0) {
        sendTypingStart(Number(conversationId));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          sendTypingStop(Number(conversationId));
        }, 1500);
      } else if (!isNoteToSelf && val.trim().length === 0) {
        sendTypingStop(Number(conversationId));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }
    },
    [isNoteToSelf, conversationId, sendTypingStart, sendTypingStop]
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setShowAttachmentMenu(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      const imageUrl = data.url;

      if (isNoteToSelf) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content: imageUrl,
            msg_type: "image",
            created_at: new Date().toISOString(),
            isSent: true,
            status: "read",
          },
        ]);
      } else {
        sendMessage(Number(conversationId), imageUrl, "image");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send image");
    } finally {
      setUploadingImage(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleDelete = async () => {
    const confirmMsg = isGroup
      ? "Leave this group? You will no longer be able to send or receive messages in it."
      : "Delete this conversation? This cannot be undone.";
    if (!window.confirm(confirmMsg)) return;
    setShowChatMenu(false);
    try {
      await fetchApi(`/conversations/${conversationId}/delete`, { method: "POST" });
      router.push("/chats");
    } catch (err: any) {
      alert(err.message || (isGroup ? "Failed to leave group" : "Failed to delete conversation"));
    }
  };

  const handleBlock = async () => {
    if (!window.confirm("Block this contact? You will leave this conversation.")) return;
    setShowChatMenu(false);
    try {
      await fetchApi(`/conversations/${conversationId}/block`, { method: "POST" });
      router.push("/chats");
    } catch (err: any) {
      alert(err.message || "Failed to block contact");
    }
  };

  const isGroup = conversation?.is_group;
  const otherParticipant = conversation?.participants?.find((p: any) => p.user_id !== user?.id)?.user;
  
  const name = isNoteToSelf
    ? "Note to Self"
    : isGroup
    ? conversation?.group_name
    : otherParticipant?.display_name || "Contact";

  const subtitle = isNoteToSelf
    ? "Official chat"
    : isGroup
    ? `${conversation?.participants?.length || 0} members`
    : otherParticipant?.phone || "";

  const isTypingText = inputText.trim().length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        backgroundColor: "#181818",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowChatMenu(false); }}
    >
      {/* Top Header */}
      <div
        style={{
          height: "60px",
          padding: "0 20px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #2c2c2c",
          backgroundColor: "#181818",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/chats")}
            title="Back to chats"
          >
            <ArrowLeftIcon size={20} color="#ffffff" />
          </button>
          <div
            onClick={() => !isNoteToSelf && setShowDetails(true)}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isNoteToSelf ? "default" : "pointer" }}
          >
            {isNoteToSelf ? (
              <NoteToSelfIcon size={36} />
            ) : (
              <img
                src={
                  isGroup
                    ? conversation?.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
                    : cacheBustAvatar(otherParticipant?.avatar_url, `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`)
                }
                alt={name}
                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>{name}</span>
                {isNoteToSelf && <VerifiedCheckIcon size={14} color="#3a76f0" />}
              </div>
              <span style={{ fontSize: "12px", color: "#9e9e9e" }}>{subtitle}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", position: "relative" }}>
          <button
            style={{ color: showSearch ? "#3a76f0" : "#a0a0a0", cursor: "pointer", padding: "8px", borderRadius: "50%", border: "none", background: showSearch ? "rgba(58,118,240,0.12)" : "transparent", display: "flex", alignItems: "center" }}
            title="Search chat"
            onClick={(e) => { e.stopPropagation(); setShowSearch((v) => !v); setSearchQuery(""); setSearchResultIdx(0); }}
          >
            <SearchIcon size={18} />
          </button>
          <div style={{ position: "relative" }}>
            <button
              style={{ color: "#a0a0a0", cursor: "pointer", padding: "8px", borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center" }}
              title="More options"
              onClick={(e) => { e.stopPropagation(); setShowChatMenu(!showChatMenu); }}
            >
              <MoreDotsIcon size={18} />
            </button>

            {/* Chat Context Menu - only Block + Delete */}
            {showChatMenu && !isNoteToSelf && (
              <div
                style={{
                  position: "absolute",
                  top: "44px",
                  right: "0",
                  backgroundColor: "#242424",
                  border: "1px solid #383838",
                  borderRadius: "12px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  zIndex: 200,
                  minWidth: "160px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!isGroup && (
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#ff6b6b",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2e1a1a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={handleBlock}
                  >
                    <BlockIcon size={16} color="#ff6b6b" />
                    Block
                  </button>
                )}
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    color: "#ff6b6b",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    width: "100%",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2e1a1a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  onClick={handleDelete}
                >
                  <TrashIcon size={16} color="#ff6b6b" />
                  {isGroup ? "Leave Group" : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar (shown when search toggled) */}
      {showSearch && (
        <div
          style={{
            padding: "8px 20px",
            borderBottom: "1px solid #2c2c2c",
            backgroundColor: "#1e1e1e",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <SearchIcon size={16} color="#9e9e9e" />
          <input
            autoFocus
            type="text"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchResultIdx(0); }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: "14px",
            }}
          />
          {searchQuery.trim() && (() => {
            const hits = messages.filter((m: any) =>
              m.msg_type === "text" && m.content?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const navigateTo = (dir: number) => {
              if (hits.length === 0) return;
              const next = (searchResultIdx + dir + hits.length) % hits.length;
              setSearchResultIdx(next);
              const ref = messageRefs.current[String(hits[next]?.id)];
              ref?.scrollIntoView({ behavior: "smooth", block: "center" });
            };
            return (
              <>
                <span style={{ fontSize: "12px", color: "#9e9e9e", whiteSpace: "nowrap" }}>
                  {hits.length > 0 ? `${searchResultIdx + 1} / ${hits.length}` : "No results"}
                </span>
                <button onClick={() => navigateTo(-1)} style={{ background: "transparent", border: "none", color: "#9e9e9e", cursor: "pointer", padding: "4px 6px", fontSize: "13px" }}>▲</button>
                <button onClick={() => navigateTo(1)} style={{ background: "transparent", border: "none", color: "#9e9e9e", cursor: "pointer", padding: "4px 6px", fontSize: "13px" }}>▼</button>
              </>
            );
          })()}
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            style={{ background: "transparent", border: "none", color: "#9e9e9e", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Main Messages & Center Info Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {isNoteToSelf ? (
          <div
            style={{
              backgroundColor: "#222222",
              border: "1px solid #2f2f2f",
              borderRadius: "20px",
              padding: "28px 24px",
              maxWidth: "380px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              margin: "20px auto 16px auto",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ marginBottom: "2px", display: "flex", justifyContent: "center" }}>
              <NoteToSelfIcon size={64} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#ffffff", margin: 0 }}>
              Note to Self
              <VerifiedCheckIcon size={16} color="#3a76f0" />
            </h3>
            <div style={{ backgroundColor: "rgba(58, 118, 240, 0.2)", color: "#538bf3", fontSize: "12px", fontWeight: 500, padding: "4px 12px", borderRadius: "16px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <VerifiedCheckIcon size={12} color="#538bf3" />
              Official chat
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.5, color: "#9e9e9e", textAlign: "center", margin: "2px 0 0 0" }}>
              You can add notes for yourself in this chat. If your account has any linked devices, new notes will be synced.
            </p>
          </div>
        ) : isGroup ? (
          <div
            style={{
              position: "relative",
              maxWidth: "380px",
              width: "100%",
              margin: "48px auto 16px auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Floating group icon that overflows the top of the card */}
            <div
              style={{
                position: "absolute",
                top: "-44px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#ede9f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                border: "3px solid #181818",
              }}
            >
              <GroupPeopleIcon size={44} color="#7c5cbf" />
            </div>
            {/* Card body */}
            <div
              style={{
                backgroundColor: "#222222",
                border: "1px solid #2f2f2f",
                borderRadius: "20px",
                padding: "52px 28px 24px 28px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "6px",
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9e9e9e", fontSize: "13px" }}>
                <GroupPeopleIcon size={16} color="#9e9e9e" />
                <span>
                  {(() => {
                    const others = (conversation?.participants || [])
                      .filter((p: any) => p.user_id !== user?.id)
                      .map((p: any) => p.user?.display_name || "Unknown");
                    if (others.length === 0) return "Just you";
                    if (others.length === 1) return `${others[0]} and you`;
                    return `${others.slice(0, -1).join(", ")}, ${others[others.length - 1]} and you`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              maxWidth: "380px",
              width: "100%",
              margin: "48px auto 16px auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Floating avatar that overflows the top of the card */}
            <div
              style={{
                position: "absolute",
                top: "-44px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                border: "3px solid #181818",
                backgroundColor: "#181818",
              }}
            >
              <img
                src={cacheBustAvatar(otherParticipant?.avatar_url, `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`)}
                alt={name}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            </div>
            {/* Card body */}
            <div
              style={{
                backgroundColor: "#222222",
                border: "1px solid #2f2f2f",
                borderRadius: "20px",
                padding: "52px 28px 24px 28px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "8px",
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{name}</h3>
              {otherParticipant?.phone && (
                <p style={{ fontSize: "14px", color: "#9e9e9e", margin: 0 }}>{otherParticipant.phone}</p>
              )}
              {otherParticipant?.about && (
                <p style={{ fontSize: "13px", color: "#6e6e6e", margin: "4px 0 0 0", fontStyle: "italic" }}>"{otherParticipant.about}"</p>
              )}
            </div>
          </div>
        )}

        <div style={{ fontSize: "12px", color: "#808080", margin: "16px 0", textAlign: "center", width: "100%", fontWeight: 500 }}>
          Today
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.map((m, idx) => {
            const isSent = m.isSent || m.sender_id === user?.id;
            const isImage = m.msg_type === "image";
            const searchHits = searchQuery.trim()
              ? messages.filter((msg: any) => msg.msg_type === "text" && msg.content?.toLowerCase().includes(searchQuery.toLowerCase()))
              : [];
            const isSearchMatch = !!searchQuery.trim() && m.msg_type === "text" && m.content?.toLowerCase().includes(searchQuery.toLowerCase());
            const isCurrentHit = isSearchMatch && searchHits[searchResultIdx]?.id === m.id;

            return (
              <div
                key={`${m.id}-${idx}`}
                ref={(el) => { messageRefs.current[String(m.id)] = el; }}
                style={{
                  alignSelf: isSent ? "flex-end" : "flex-start",
                  backgroundColor: isCurrentHit ? "#7c4f00" : isSearchMatch ? "#3d3000" : isSent ? "#2563eb" : "#2c2c2c",
                  color: "#ffffff",
                  padding: "10px 16px",
                  borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  maxWidth: "65%",
                  display: "inline-flex",
                  alignItems: "flex-end",
                  gap: "10px",
                  wordBreak: "break-word",
                  boxShadow: isCurrentHit ? "0 0 0 2px #f59e0b" : "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {isImage ? (
                  <img
                    src={m.content}
                    alt="Attachment"
                    style={{ maxWidth: "260px", maxHeight: "260px", borderRadius: "12px", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ flex: 1 }}>{m.content}</span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", opacity: 0.85, flexShrink: 0, marginBottom: "-2px" }}>
                  <span suppressHydrationWarning>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {isSent && <MessageStatusIcon status={m.status || "sent"} size={13} color="#ffffff" />}
                </div>
              </div>
            );
          })}
          {/* Typing animation indicator */}
          {isTypingRemote && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#2c2c2c",
                  borderRadius: "18px 18px 18px 4px",
                  padding: "0 14px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "#9e9e9e",
                      display: "inline-block",
                      animation: `typingBounce 1.4s infinite ease-in-out both`,
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: "11px", color: "#666" }}>{typingName} is typing…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Message Input Bar Wrapper */}
      <div
        style={{
          padding: "8px 24px 16px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Attachment Menu Popup */}
        {showAttachmentMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "64px",
              right: "24px",
              backgroundColor: "#282828",
              border: "1px solid #383838",
              borderRadius: "16px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
              zIndex: 100,
              width: "180px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={18} color="#3a76f0" />
              <span>Photos & videos</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
              onClick={() => alert("File upload coming soon!")}
            >
              <FileIcon size={18} color="#a0a0a0" />
              <span>File</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
              onClick={() => alert("Poll creation coming soon!")}
            >
              <PollIcon size={18} color="#a0a0a0" />
              <span>Poll</span>
            </div>
          </div>
        )}

        {/* Emoji Picker Popup Grid */}
        {showEmojiPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "64px",
              left: "24px",
              backgroundColor: "#282828",
              border: "1px solid #383838",
              borderRadius: "16px",
              padding: "14px",
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "10px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
              zIndex: 100,
              fontSize: "22px",
              width: "280px",
            }}
          >
            {POPULAR_EMOJIS.map((emoji, idx) => (
              <div
                key={idx}
                style={{ cursor: "pointer", textAlign: "center", borderRadius: "8px", padding: "4px", userSelect: "none" }}
                onClick={() => addEmoji(emoji)}
              >
                {emoji}
              </div>
            ))}
          </div>
        )}

        <div style={{ color: "#808080", marginBottom: "6px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
          <ChevronUpIcon size={16} />
        </div>

        {/* Horizontal Input Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: "10px",
            boxSizing: "border-box",
          }}
        >
          {/* Main Input Pill Bar in Center */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#282828",
              borderRadius: "24px",
              padding: "4px 12px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            {/* Smile Emoji Button inside Input Bar on Left */}
            <button
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "#a0a0a0",
                cursor: "pointer",
                border: "none",
                background: "transparent",
              }}
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachmentMenu(false);
              }}
              title="Emoji Picker"
            >
              <SmileIcon size={20} />
            </button>

            <input
              type="text"
              placeholder={uploadingImage ? "Uploading image..." : "Message"}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                color: "#ffffff",
                fontSize: "14px",
                padding: "8px 0",
                border: "none",
                outline: "none",
              }}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={uploadingImage}
            />

            {/* Mic Icon — AUTO-HIDES WHEN TYPING! */}
            {!isTypingText && (
              <button
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#a0a0a0",
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                }}
                title="Voice Note"
              >
                <MicIcon size={20} />
              </button>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*,video/*"
            onChange={handleImageUpload}
          />

          {/* Plus / Attachment Button on Far Right */}
          <button
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#282828",
              color: "#a0a0a0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              border: "none",
              transform: showAttachmentMenu ? "rotate(45deg)" : "none",
              transition: "transform 0.15s",
            }}
            onClick={() => {
              if (isTypingText) {
                handleSend();
              } else {
                setShowAttachmentMenu(!showAttachmentMenu);
                setShowEmojiPicker(false);
              }
            }}
            title={isTypingText ? "Send message" : "Add Attachment"}
          >
            <PlusIcon size={20} />
          </button>
        </div>
      </div>

      {/* Sliding Details Panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          backgroundColor: "#181818",
          zIndex: 300,
          transform: showDetails ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            height: "60px",
            padding: "0 20px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            borderBottom: "1px solid #2c2c2c",
            backgroundColor: "#181818",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowDetails(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#282828")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ArrowLeftIcon size={20} color="#ffffff" />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>Contact info</span>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "52px 24px 40px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Avatar (Large, overflowing design matching main page) */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "380px",
              margin: "24px auto 16px auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-44px",
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                backgroundColor: isGroup ? "#ede9f7" : "#181818",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                border: "3px solid #181818",
              }}
            >
              {isGroup ? (
                <GroupPeopleIcon size={48} color="#7c5cbf" />
              ) : (
                <img
                    src={cacheBustAvatar(otherParticipant?.avatar_url, `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`)}
                  alt={name}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              )}
            </div>

            {/* Main Details Card */}
            <div
              style={{
                backgroundColor: "#222222",
                border: "1px solid #2f2f2f",
                borderRadius: "20px",
                padding: "60px 28px 24px 28px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "12px",
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                {name}
              </h3>
              
              {!isGroup && otherParticipant?.phone && (
                <p style={{ fontSize: "14px", color: "#9e9e9e", margin: 0 }}>{otherParticipant.phone}</p>
              )}

              {!isGroup && otherParticipant?.about && (
                <p style={{ fontSize: "13px", color: "#6e6e6e", margin: 0, fontStyle: "italic" }}>"{otherParticipant.about}"</p>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setShowSearch(true);
                  }}
                  style={{
                    backgroundColor: "#2c2c2c",
                    border: "none",
                    borderRadius: "12px",
                    color: "#ffffff",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#383838")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2c2c2c")}
                >
                  <SearchIcon size={16} />
                  Search Messages
                </button>
              </div>

              {/* Group members list if Group */}
              {isGroup && (
                <div style={{ width: "100%", borderTop: "1px solid #2f2f2f", paddingTop: "16px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "13px", color: "#9e9e9e", fontWeight: 600, textAlign: "left", marginBottom: "4px" }}>
                    Members ({conversation?.participants?.length || 0})
                  </div>
                  {(conversation?.participants || []).map((p: any) => (
                    <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
                      <img
                        src={cacheBustAvatar(p.user?.avatar_url, `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user?.display_name}`)}
                        alt={p.user?.display_name}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                          {p.user?.display_name || "Unknown"}{p.user_id === user?.id ? " (You)" : ""}
                        </span>
                        {p.user?.phone && (
                          <span style={{ fontSize: "12px", color: "#6e6e6e" }}>{p.user.phone}</span>
                        )}
                      </div>
                      {p.is_admin && (
                        <span style={{ fontSize: "11px", color: "#3a76f0", fontWeight: 600, backgroundColor: "rgba(58,118,240,0.12)", padding: "2px 8px", borderRadius: "10px" }}>Admin</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Groups in Common if DM */}
              {!isGroup && (
                <div style={{ width: "100%", borderTop: "1px solid #2f2f2f", paddingTop: "16px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "13px", color: "#9e9e9e", fontWeight: 600, textAlign: "left", marginBottom: "4px" }}>
                    Groups in common
                  </div>
                  {(() => {
                    const groupsInCommon = allConversations.filter((c: any) =>
                      c.is_group && c.participants?.some((p: any) => p.user_id === otherParticipant?.id)
                    );
                    if (groupsInCommon.length === 0) {
                      return <span style={{ fontSize: "13px", color: "#6e6e6e", textAlign: "left" }}>No groups in common</span>;
                    }
                    return groupsInCommon.map((g: any) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setShowDetails(false);
                          router.push(`/chats/${g.id}`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          backgroundColor: "#2c2c2c",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#383838")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2c2c2c")}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#ede9f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <GroupPeopleIcon size={18} color="#7c5cbf" />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{g.group_name}</span>
                          <span style={{ fontSize: "12px", color: "#9e9e9e" }}>{g.participants?.length || 0} members</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Destructive Options (Block / Delete) */}
              <div style={{ width: "100%", borderTop: "1px solid #2f2f2f", paddingTop: "16px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {!isGroup && (
                  <button
                    onClick={handleBlock}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      color: "#ff6b6b",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      width: "100%",
                      textAlign: "left",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2e1a1a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <BlockIcon size={16} color="#ff6b6b" />
                    Block Contact
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    color: "#ff6b6b",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    width: "100%",
                    textAlign: "left",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2e1a1a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <TrashIcon size={16} color="#ff6b6b" />
                  {isGroup ? "Delete & Leave Group" : "Delete Chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
