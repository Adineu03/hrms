'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { useAuthStore } from '@/lib/auth-store';
import { usePageContext } from '@/hooks/use-page-context';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import ActionConfirmDialog from './action-confirm-dialog';

export default function ChatWindow() {
  const { isOpen, messages, isLoading, pendingAction, formFillActive, toggleChat, sendMessage, setNavigationHandler, dismissFormFill } = useChatStore();
  const { user } = useAuthStore();
  const getPageContext = usePageContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Register navigation handler
  useEffect(() => {
    setNavigationHandler((url: string) => router.push(url));
  }, [router, setNavigationHandler]);

  // Clear form fill banner on page navigation
  useEffect(() => {
    if (formFillActive) {
      dismissFormFill();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const userInitials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  const handleSend = (content: string) => {
    // Read fresh page context (including active tab from DOM) at send time
    const pageContext = getPageContext();
    sendMessage(content, pageContext);
  };

  return (
    <div
      className="fixed bottom-24 right-6 z-50 w-[400px] flex flex-col bg-card border border-border rounded-2xl shadow-xl"
      style={{ minHeight: 500, maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-text text-sm">AI Assistant</h3>
        </div>
        <button
          onClick={toggleChat}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors text-text-muted hover:text-text"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Sparkles className="h-10 w-10 text-primary/30 mb-3" />
            <p className="text-sm text-text-muted">
              Ask me anything about your HRMS
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} userInitials={userInitials} />
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-text" />
            </div>
            <div className="bg-background rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Action Confirmation */}
      {pendingAction && <ActionConfirmDialog />}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading || !!pendingAction} />
    </div>
  );
}
