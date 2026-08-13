"use client";

import { useParams } from "next/navigation";
import { ChatPane } from "@/components/chat/ChatPane";

export default function SingleChatPage() {
  const params = useParams();
  const id = params?.id as string;

  return <ChatPane conversationId={id} />;
}
