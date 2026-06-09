'use client';

import { Sparkles } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@hrms/shared';
import ActionResultCard from './action-result-card';

interface ChatMessageProps {
  message: ChatMessageType;
  userInitials: string;
}

export default function ChatMessage({ message, userInitials }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasActionResult = message.action?.result && !message.action.result.data?.url;

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
          isUser ? 'bg-primary text-white' : 'bg-border text-text'
        }`}
      >
        {isUser ? userInitials : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-white rounded-2xl rounded-br-md'
              : 'bg-background text-text rounded-2xl rounded-bl-md'
          }`}
        >
          {message.content}
          {hasActionResult && <ActionResultCard result={message.action!.result!} />}
        </div>
        <p
          className={`text-xs text-text-muted mt-1 ${isUser ? 'text-right' : 'text-left'}`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
