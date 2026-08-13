"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import styles from "./modals.module.css";

export const NewChatModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    fetchApi('/users/search?q=').then(setResults).catch(console.error);
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    try {
      const users = await fetchApi(`/users/search?q=${q}`);
      setResults(users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectUser = async (userId: number) => {
    try {
      const conv = await fetchApi("/conversations/dm", {
        method: "POST",
        body: JSON.stringify({ contact_id: userId }),
      });
      onClose();
      router.push(`/chats/${conv.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to start chat");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>New Direct Message</h3>
        <input
          type="text"
          placeholder="Search by name or phone..."
          className={styles.input}
          value={query}
          onChange={handleSearch}
          autoFocus
        />
        <div className={styles.userList}>
          {results.length === 0 ? (
            <div className={styles.emptyState}>No contacts found</div>
          ) : (
            results.map((u) => (
              <div key={u.id} className={styles.userItem} onClick={() => handleSelectUser(u.id)}>
                <img
                  src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.display_name}`}
                  alt=""
                  className={styles.avatar}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.display_name || "Signal User"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6e6e6e", marginTop: "1px" }}>{u.phone}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
