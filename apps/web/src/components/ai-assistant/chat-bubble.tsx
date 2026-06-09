'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';

const STORAGE_KEY = 'chat-bubble-pos';
const DEFAULT_POS = { bottom: 24, right: 24 };

export default function ChatBubble() {
  const { toggleChat, unreadCount } = useChatStore();
  const [pos, setPos] = useState(DEFAULT_POS);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLButtonElement>(null);

  // Restore position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPos(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
      }
      setPos((prev) => {
        const newRight = Math.max(0, prev.right - dx);
        const newBottom = Math.max(0, prev.bottom - dy);
        dragStart.current = { x: e.clientX, y: e.clientY };
        return { bottom: newBottom, right: newRight };
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Save position
      setPos((prev) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleClick = useCallback(() => {
    if (!hasDragged.current) {
      toggleChat();
    }
  }, [toggleChat]);

  return (
    <button
      ref={bubbleRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="fixed z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing"
      style={{ bottom: pos.bottom, right: pos.right }}
      aria-label="Open AI Assistant"
    >
      <MessageCircle className="h-6 w-6" />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
