"use client";

import styles from "@/components/chat/chat.module.css";

export default function ChatsDefaultPage() {
  return (
    <div className={styles.chatPane}>
      <div className={styles.emptyState}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
        <h2>Select a conversation to start messaging</h2>
        <p style={{ fontSize: "14px", color: "var(--signal-text-secondary)" }}>
          Send and receive end-to-end encrypted messages with Signal Desktop.
        </p>
      </div>
    </div>
  );
}
