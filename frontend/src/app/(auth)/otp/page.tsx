"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import styles from "../phone/phone.module.css";

export default function OTPAuthPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const p = localStorage.getItem("auth_phone");
    if (!p) {
      router.push("/phone");
    } else {
      setPhone(p);
    }
  }, [router]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const data = await fetchApi("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      localStorage.setItem("token", data.access_token);
      router.push("/profile");
    } catch (err: any) {
      alert(err.message || "Invalid OTP");
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
        <h1 className={styles.title}>Verify your number</h1>
        <p className={styles.subtitle}>Enter the 6-digit code sent to {phone}</p>
        <p className={styles.subtitle} style={{color: 'var(--signal-green)', marginTop: '-20px'}}>Use mock OTP: 123456</p>

        <div className={styles.inputGroup}>
          <input
            type="text"
            maxLength={6}
            placeholder="123456"
            className={styles.input}
            style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '24px' }}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>

        <button 
          className={styles.primaryButton}
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
}
