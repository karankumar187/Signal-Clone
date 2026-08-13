"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useWebSocket } from "../WebSocketProvider";
import {
  HamburgerIcon,
  ChatIcon,
  ChatIconFilled,
  PhoneIcon,
  PhoneIconFilled,
  DevicesIcon,
  DevicesIconFilled,
  SettingsIcon,
  EditIcon,
  MoreDotsIcon,
  SearchIcon,
  FilterIcon,
  NoteToSelfIcon,
  VerifiedCheckIcon,
  MessageStatusIcon,
} from "@/components/icons/Icons";
import styles from "./sidebar.module.css";

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewChat, onOpenNewGroup }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [noteToSelfId, setNoteToSelfId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [comingSoonTab, setComingSoonTab] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id;
  const { lastMessage } = useWebSocket();

  const loadData = async () => {
    try {
      const u = await fetchApi("/auth/me");
      setUser(u);
      
      // Fetch or create note-to-self conversation for this user
      const nts = await fetchApi("/conversations/note-to-self", { method: "POST" });
      setNoteToSelfId(String(nts.id));

      const convs = await fetchApi("/conversations/");
      setConversations(convs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    // Re-fetch when user returns to tab (e.g. after updating profile in settings)
    const handleVisibility = () => { if (document.visibilityState === "visible") loadData(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "message_new") loadData();
  }, [lastMessage]);

  useEffect(() => {
    if (activeId) {
      setConversations((prev) =>
        prev.map((c) => String(c.id) === activeId ? { ...c, unread_count: 0 } : c)
      );
    }
  }, [activeId]);

  const filteredConversations = conversations.filter((c) => {
    const name = c.is_group
      ? c.group_name
      : c.participants.find((p: any) => p.user_id !== user?.id)?.user?.display_name || "Chat";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isChatActive = !!params?.id;

  const handleComingSoon = (tab: string) => {
    setComingSoonTab(tab);
    setActiveTab(tab);
    setTimeout(() => setComingSoonTab(null), 2000);
  };

  return (
    <aside className={`${styles.sidebar} ${isChatActive ? styles.hiddenOnMobile : ""}`}>

      {/* Icon Navigation Rail — hidden when collapsed */}
      {!navCollapsed && (
        <div className={styles.iconNav}>
          <div className={styles.navSection}>

            {/* Hamburger — collapses rail */}
            <div
              className={styles.navIcon}
              title="Collapse menu"
              onClick={() => setNavCollapsed(true)}
            >
              <HamburgerIcon size={20} />
            </div>

            {/* Chats */}
            <div
              className={`${styles.navIcon} ${activeTab === "chats" ? styles.active : ""}`}
              onClick={() => { setActiveTab("chats"); router.push("/chats"); }}
              title="Chats"
            >
              {activeTab === "chats" ? <ChatIconFilled size={20} /> : <ChatIcon size={20} />}
            </div>

            {/* Calls — coming soon */}
            <div
              className={`${styles.navIcon} ${activeTab === "calls" ? styles.active : ""}`}
              onClick={() => handleComingSoon("calls")}
              title="Calls"
              style={{ position: "relative" }}
            >
              {activeTab === "calls" ? <PhoneIconFilled size={20} /> : <PhoneIcon size={20} />}
              {comingSoonTab === "calls" && (
                <div style={{
                  position: "absolute", left: "54px", top: "50%", transform: "translateY(-50%)",
                  backgroundColor: "#333", color: "#fff", fontSize: "11px", fontWeight: 600,
                  padding: "4px 8px", borderRadius: "6px", whiteSpace: "nowrap",
                  zIndex: 999, boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}>Coming Soon</div>
              )}
            </div>

            {/* Stories — coming soon */}
            <div
              className={`${styles.navIcon} ${activeTab === "stories" ? styles.active : ""}`}
              onClick={() => handleComingSoon("stories")}
              title="Stories"
              style={{ position: "relative" }}
            >
              {activeTab === "stories" ? <DevicesIconFilled size={20} /> : <DevicesIcon size={20} />}
              {comingSoonTab === "stories" && (
                <div style={{
                  position: "absolute", left: "54px", top: "50%", transform: "translateY(-50%)",
                  backgroundColor: "#333", color: "#fff", fontSize: "11px", fontWeight: 600,
                  padding: "4px 8px", borderRadius: "6px", whiteSpace: "nowrap",
                  zIndex: 999, boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}>Coming Soon</div>
              )}
            </div>
          </div>

          <div className={styles.navSection}>
            <div
              className={`${styles.navIcon} ${activeTab === "settings" ? styles.active : ""}`}
              onClick={() => { setActiveTab("settings"); router.push("/settings"); }}
              title="Settings"
            >
              <SettingsIcon size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Conversations List Section */}
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Hamburger and Settings in header — only shown when rail is collapsed */}
              {navCollapsed && (
                <>
                  <button
                    className={styles.actionBtn}
                    title="Expand menu"
                    onClick={() => setNavCollapsed(false)}
                  >
                    <HamburgerIcon size={20} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.mobileSettingsBtn}`}
                    title="Settings"
                    onClick={() => { setActiveTab("settings"); router.push("/settings"); }}
                  >
                    <SettingsIcon size={20} />
                  </button>
                </>
              )}
              <h2 className={styles.title}>Chats</h2>
            </div>
            <div className={styles.actions}>
              <button className={styles.actionBtn} onClick={onOpenNewChat} title="New Chat">
                <EditIcon size={18} />
              </button>
              <button className={styles.actionBtn} onClick={onOpenNewGroup} title="More Options">
                <MoreDotsIcon size={18} />
              </button>
            </div>
          </div>
          <div className={styles.searchBox}>
            <SearchIcon size={16} color="var(--signal-text-secondary)" />
            <input
              type="text"
              placeholder="Search"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FilterIcon size={16} color="var(--signal-text-secondary)" />
          </div>
        </div>

        <div className={styles.list}>
          {/* Note to Self Pinned */}
          <div
            className={`${styles.item} ${activeId === noteToSelfId ? styles.selected : ""}`}
            onClick={() => noteToSelfId && router.push(`/chats/${noteToSelfId}`)}
          >
            <div className={styles.itemAvatarContainer}>
              <NoteToSelfIcon size={42} />
            </div>
            <div className={styles.itemDetails}>
              <div className={styles.itemTop}>
                <div className={styles.nameRow}>
                  <span className={styles.itemName}>Note to Self</span>
                  <VerifiedCheckIcon size={14} color="#3a76f0" />
                </div>
                <span className={styles.itemTime}>16:30</span>
              </div>
              <div className={styles.itemBottom}>
                <span className={styles.itemMessage}>hii</span>
                <MessageStatusIcon status="read" size={13} color="var(--signal-text-secondary)" />
              </div>
            </div>
          </div>

          {filteredConversations
            .filter((c) => String(c.id) !== noteToSelfId)
            .map((c) => {
            const isGroup = c.is_group;
            const otherParticipant = c.participants.find((p: any) => p.user_id !== user?.id)?.user;
            const name = isGroup ? c.group_name : otherParticipant?.display_name || "Contact";
            const rawAvatar = isGroup
              ? c.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
              : otherParticipant?.avatar_url;
            // Add cache-buster so updated profile pics show immediately
            const avatar = rawAvatar && rawAvatar.startsWith("http://localhost")
              ? `${rawAvatar}?t=${Math.floor(Date.now() / 30000)}`
              : rawAvatar;
            const isSelected = activeId === String(c.id);
            const initial = name.charAt(0).toUpperCase();

            return (
              <div
                key={c.id}
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                onClick={() => router.push(`/chats/${c.id}`)}
              >
                <div className={styles.itemAvatarContainer}>
                  {avatar ? (
                    <img src={avatar} alt={name} className={styles.itemAvatar} />
                  ) : (
                    <div className={styles.avatarFallback}>{initial}</div>
                  )}
                </div>
                <div className={styles.itemDetails}>
                  <div className={styles.itemTop}>
                    <div className={styles.nameRow}>
                      <span className={styles.itemName}>{name}</span>
                    </div>
                    <span className={styles.itemTime} suppressHydrationWarning>
                      {c.last_message
                        ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "15m"}
                    </span>
                  </div>
                  <div className={styles.itemBottom}>
                    <span className={styles.itemMessage}>
                      {c.last_message ? c.last_message.content : ""}
                    </span>
                    {c.unread_count > 0 ? (
                      <span className={styles.badge}>{c.unread_count}</span>
                    ) : c.last_message && c.last_message.sender_id === user?.id ? (
                      <MessageStatusIcon status={c.last_message.status || "sent"} size={13} color="var(--signal-text-secondary)" />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
