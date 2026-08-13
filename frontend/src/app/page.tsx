"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/chats");
    } else {
      router.push("/phone");
    }
  }, [router]);

  return (
    <div className="auth-container">
      <div style={{color: 'var(--signal-text-primary)'}}>Loading Signal...</div>
    </div>
  );
}
