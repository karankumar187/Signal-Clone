"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { CameraIcon } from "@/components/icons/Icons";
import styles from "../phone/phone.module.css";

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      alert(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName) return;
    setLoading(true);
    try {
      await fetchApi("/auth/setup-profile", {
        method: "POST",
        body: JSON.stringify({ 
          display_name: displayName,
          about: "Hey there! I am using Signal.",
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`
        }),
      });
      router.push("/chats");
    } catch (err: any) {
      alert(err.message || "Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className={styles.card}>
        <h1 className={styles.title}>Set up your profile</h1>
        <p className={styles.subtitle}>Profiles are visible to your contacts in Signal.</p>

        {/* Photo Upload Avatar Picker */}
        <div 
          style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--signal-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '20px',
            overflow: 'hidden',
            border: '2px solid var(--signal-accent)'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <CameraIcon size={28} color="var(--signal-icon)" />
          )}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--signal-accent)', marginBottom: '20px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {uploading ? "Uploading photo..." : "Upload Profile Photo"}
        </p>

        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="First name (required)"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <button 
          className={styles.primaryButton}
          onClick={handleSave}
          disabled={loading || !displayName}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
