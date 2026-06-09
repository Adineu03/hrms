import { create } from 'zustand';
import type { ChatMessage, ChatAction, PageContext, ScreenAction } from '@hrms/shared';
import { api } from './api';
import { useTabNavigationStore } from './tab-navigation-store';
// Dynamic imports — these modules access DOM APIs and must not be loaded during SSR
const getPageScanner = () => import('./page-scanner');
const getScreenActionExecutor = () => import('./screen-action-executor');
const getScreenshotCapture = () => import('./screenshot-capture');

interface FilledField {
  selector: string;
  prevValue: string;
  newValue: string;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  conversationId: string | null;
  unreadCount: number;
  pendingAction: ChatAction | null;
  formFillActive: boolean;
  formFillCount: number;
  formFillUndoData: FilledField[];
  handleNavigation: ((url: string) => void) | null;

  toggleChat: () => void;
  sendMessage: (content: string, pageContext: PageContext) => void;
  clearChat: () => void;
  executeAction: () => void;
  cancelAction: () => void;
  undoFormFill: () => void;
  dismissFormFill: () => void;
  clearFormFill: () => void;
  setNavigationHandler: (handler: (url: string) => void) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  conversationId: null,
  unreadCount: 0,
  pendingAction: null,
  formFillActive: false,
  formFillCount: 0,
  formFillUndoData: [],
  handleNavigation: null,

  setNavigationHandler: (handler) => set({ handleNavigation: handler }),

  toggleChat: () => {
    const { isOpen } = get();
    set({ isOpen: !isOpen, unreadCount: isOpen ? get().unreadCount : 0 });
  },

  sendMessage: async (content: string, pageContext: PageContext) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      pageContext,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const { conversationId } = get();

      // Capture screenshot + DOM scan in parallel
      let pageSnapshotText: string | undefined;
      let screenshot: string | undefined;

      try {
        const [scannerModule, screenshotModule] = await Promise.all([
          getPageScanner(),
          getScreenshotCapture(),
        ]);

        const [snapshotResult, screenshotResult] = await Promise.all([
          (async () => {
            const snapshot = scannerModule.scanPage();
            return scannerModule.snapshotToPromptText(snapshot);
          })(),
          screenshotModule.captureScreenshot(),
        ]);

        if (snapshotResult.length > 20) pageSnapshotText = snapshotResult;
        if (screenshotResult) screenshot = screenshotResult;

        console.log('[AI Chat] Snapshot:', pageSnapshotText ? `${pageSnapshotText.length} chars` : 'none', '| Screenshot:', screenshot ? `${Math.round(screenshot.length / 1024)}KB` : 'none');
      } catch (e) {
        console.warn('[AI Chat] Page capture failed:', e);
      }

      const res = await api.post('/ai-assistant/chat', {
        message: content,
        conversationId,
        pageContext,
        pageSnapshotText,
        screenshot,
      });

      const { message: assistantMessage, conversationId: newConvId } = res.data;

      // Handle navigation action
      if (assistantMessage.action?.type === 'navigate' && assistantMessage.action.result?.data?.url) {
        const { handleNavigation } = get();
        const navParams = assistantMessage.action.parameters;
        if (navParams?.tab) {
          useTabNavigationStore.getState().setRequestedTab(navParams.tab);
        }
        if (handleNavigation) {
          handleNavigation(assistantMessage.action.result.data.url);
        }
      }

      // Handle screen actions — execute client-side
      if (assistantMessage.screenActions && assistantMessage.screenActions.length > 0) {
        const actions: ScreenAction[] = assistantMessage.screenActions;
        const hasConfirmation = actions.some((a: ScreenAction) => a.requiresConfirmation);

        if (!hasConfirmation) {
          // Execute immediately
          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isLoading: false,
            conversationId: newConvId,
          }));

          const { executeScreenActions } = await getScreenActionExecutor();
          const { results, filledFields } = await executeScreenActions(actions);
          const allSuccess = results.every((r) => r.success);

          if (filledFields.length > 0) {
            set({
              formFillActive: true,
              formFillCount: filledFields.length,
              formFillUndoData: filledFields,
            });
          }

          // Add result summary
          const summaryMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: allSuccess
              ? `Done — ${results.map((r) => r.message).join(', ')}.`
              : `Some actions failed: ${results.map((r) => `${r.success ? 'OK' : 'FAIL'}: ${r.message}`).join('; ')}`,
            timestamp: new Date().toISOString(),
          };

          set((state) => ({
            messages: [...state.messages, summaryMessage],
            unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1,
          }));
          return;
        }

        // Has confirmation-required actions — set as pending
        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isLoading: false,
          conversationId: newConvId,
          pendingAction: assistantMessage.action || null,
          unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1,
        }));
        return;
      }

      // Handle mutate action — set as pending for confirmation
      const pendingAction =
        assistantMessage.action?.requiresConfirmation
          ? assistantMessage.action
          : null;

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
        conversationId: newConvId,
        pendingAction,
        unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1,
      }));
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  executeAction: async () => {
    const { pendingAction, conversationId } = get();
    if (!pendingAction) return;

    set({ isLoading: true, pendingAction: null });

    // If it's a screen action, execute client-side
    if (pendingAction.type === 'screen_action' && pendingAction.parameters?.actions) {
      const { executeScreenActions } = await getScreenActionExecutor();
      const { results, filledFields } = await executeScreenActions(pendingAction.parameters.actions);
      const allSuccess = results.every((r) => r.success);

      if (filledFields.length > 0) {
        set({
          formFillActive: true,
          formFillCount: filledFields.length,
          formFillUndoData: filledFields,
        });
      }

      const resultMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: allSuccess
          ? `Done — ${results.map((r) => r.message).join(', ')}.`
          : `Some actions failed: ${results.map((r) => r.message).join('; ')}`,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, resultMessage],
        isLoading: false,
      }));
      return;
    }

    // Server-side action (Phase 3 flow)
    try {
      const res = await api.post('/ai-assistant/execute-action', {
        actionName: pendingAction.name,
        parameters: pendingAction.parameters,
        conversationId,
      });

      const { result } = res.data;
      const resultMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.success
          ? `Done — ${result.message}`
          : `Failed — ${result.message}`,
        timestamp: new Date().toISOString(),
        action: { ...pendingAction, result },
      };

      set((state) => ({
        messages: [...state.messages, resultMessage],
        isLoading: false,
      }));
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Failed to execute the action. Please try again.',
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  cancelAction: () => {
    const cancelMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Action cancelled.',
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, cancelMessage],
      pendingAction: null,
    }));
  },

  undoFormFill: async () => {
    const { formFillUndoData } = get();
    const { undoFills } = await getScreenActionExecutor();
    undoFills(formFillUndoData);
    set({ formFillActive: false, formFillCount: 0, formFillUndoData: [] });
  },

  dismissFormFill: async () => {
    const { clearAiFilledHighlights } = await getScreenActionExecutor();
    clearAiFilledHighlights();
    set({ formFillActive: false, formFillCount: 0, formFillUndoData: [] });
  },

  // Reset the form-fill banner state on route change. The filled elements belong
  // to the page we are leaving, so we just drop the state (no undo, no DOM work).
  clearFormFill: () => {
    if (!get().formFillActive) return;
    set({ formFillActive: false, formFillCount: 0, formFillUndoData: [] });
  },

  clearChat: async () => {
    const { conversationId } = get();
    if (conversationId) {
      api.post('/ai-assistant/clear', { conversationId }).catch(() => {});
    }
    try {
      const { clearAiFilledHighlights } = await getScreenActionExecutor();
      clearAiFilledHighlights();
    } catch { /* ignore during SSR */ }
    set({ messages: [], conversationId: null, pendingAction: null, formFillActive: false, formFillCount: 0, formFillUndoData: [] });
  },
}));
