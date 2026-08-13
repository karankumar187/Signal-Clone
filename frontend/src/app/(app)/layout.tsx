"use client";

import React, { useState } from "react";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { NewChatModal } from "@/components/modals/NewChatModal";
import { NewGroupModal } from "@/components/modals/NewGroupModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);

  return (
    <WebSocketProvider>
      <div className="app-container">
        <Sidebar
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
        />
        {children}
      </div>

      {isNewChatOpen && <NewChatModal onClose={() => setIsNewChatOpen(false)} />}
      {isNewGroupOpen && <NewGroupModal onClose={() => setIsNewGroupOpen(false)} />}
    </WebSocketProvider>
  );
}
