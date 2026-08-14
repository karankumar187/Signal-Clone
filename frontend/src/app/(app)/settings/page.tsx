"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { LockIcon, BellIcon, DevicesIcon, PhoneIcon, CameraIcon } from "@/components/icons/Icons";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentTheme = (localStorage.getItem("signal_theme") as "dark" | "light") || "dark";
    setTheme(currentTheme);

    fetchApi("/auth/me").then((u) => {
      setUser(u);
      setDisplayName(u.display_name || "");
      setAbout(u.about || "");
      setAvatarUrl(u.avatar_url || "");
    });
  }, []);

  const toggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    localStorage.setItem("signal_theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
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

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      alert(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await fetchApi("/auth/setup-profile", {
        method: "POST",
        body: JSON.stringify({
          display_name: displayName,
          about: about,
          avatar_url: avatarUrl,
        }),
      });
      setUser(updated);
      alert("Settings saved!");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className={styles.container}>Loading settings...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Settings</h2>

        {/* Profile Section */}
        <div className={styles.section}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.display_name}`}
                alt="Avatar"
                className={styles.avatar}
              />
              <div className={styles.cameraOverlay}>
                <CameraIcon size={18} color="#ffffff" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div>
              <h3>{user.display_name}</h3>
              <p style={{ color: "var(--signal-text-secondary)", fontSize: "14px" }}>{user.phone}</p>
              <button
                type="button"
                className={styles.uploadBtnText}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Uploading..." : "Change profile photo"}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Display Name</label>
            <input
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>About</label>
            <input
              type="text"
              className={styles.input}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Appearance / Theme Section */}
        <div className={styles.section}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <DevicesIcon size={18} color="var(--signal-icon)" />
              <span>Theme / Mode</span>
            </div>
            <div style={{ display: "flex", gap: "6px", backgroundColor: "var(--signal-input-bg)", padding: "4px", borderRadius: "10px" }}>
              <button
                type="button"
                onClick={() => toggleTheme("dark")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: theme === "dark" ? "var(--signal-accent)" : "transparent",
                  color: theme === "dark" ? "#ffffff" : "var(--signal-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => toggleTheme("light")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: theme === "light" ? "var(--signal-accent)" : "transparent",
                  color: theme === "light" ? "#ffffff" : "var(--signal-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                Light
              </button>
            </div>
          </div>
        </div>

        {/* Placeholders / Coming Soon */}
        <div className={styles.section}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <LockIcon size={18} color="var(--signal-icon)" />
              <span>Privacy</span>
            </div>
            <span className={styles.badge}>Coming Soon</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <BellIcon size={18} color="var(--signal-icon)" />
              <span>Notifications</span>
            </div>
            <span className={styles.badge}>Coming Soon</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <DevicesIcon size={18} color="var(--signal-icon)" />
              <span>Linked Devices</span>
            </div>
            <span className={styles.badge}>Coming Soon</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <PhoneIcon size={18} color="var(--signal-icon)" />
              <span>Voice & Video Calls</span>
            </div>
            <span className={styles.badge}>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
