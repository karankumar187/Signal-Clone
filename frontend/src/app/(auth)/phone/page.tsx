"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import styles from "./phone.module.css";

export default function PhoneAuthPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNext = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await fetchApi("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      // Store phone for OTP page
      localStorage.setItem("auth_phone", phone);
      router.push("/otp");
    } catch (err: any) {
      alert(err.message || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Signal" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "20%" }} />
        </div>
        <h1 className={styles.title}>Enter your phone number</h1>
        <p className={styles.subtitle}>Signal needs to verify your account.</p>

        <div className={styles.inputGroup}>
          <input
            type="tel"
            placeholder="+1 234 567 8900"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button 
          className={styles.primaryButton}
          onClick={handleNext}
          disabled={loading || !phone}
        >
          {loading ? "Sending..." : "Next"}
        </button>
      </div>
    </div>
  );
}
