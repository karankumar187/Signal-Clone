"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import styles from "./modals.module.css";

export const NewGroupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  const toggleUser = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    try {
      const group = await fetchApi("/groups", {
        method: "POST",
        body: JSON.stringify({ group_name: groupName, participant_ids: selectedIds }),
      });
      onClose();
      router.push(`/chats/${group.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to create group");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>New Group</h3>

        <input
          type="text"
          placeholder="Group name..."
          className={styles.input}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          autoFocus
        />

        <input
          type="text"
          placeholder="Search members..."
          className={styles.input}
          value={query}
          onChange={handleSearch}
        />

        {selectedIds.length > 0 && (
          <div style={{ fontSize: "12px", color: "#3a76f0", fontWeight: 600 }}>
            {selectedIds.length} member{selectedIds.length > 1 ? "s" : ""} selected
          </div>
        )}

        <div className={styles.userList}>
          {results.length === 0 ? (
            <div className={styles.emptyState}>No contacts found</div>
          ) : (
            results.map((u) => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={`${styles.userItem} ${isSelected ? styles.selected : ""}`}
                  onClick={() => toggleUser(u.id)}
                >
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
                  <div className={`${styles.checkboxWrapper} ${isSelected ? styles.checked : ""}`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.confirmBtn}
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedIds.length === 0}
            style={{ opacity: (!groupName.trim() || selectedIds.length === 0) ? 0.5 : 1 }}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};
