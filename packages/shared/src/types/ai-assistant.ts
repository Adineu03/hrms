export interface PageContext {
  moduleId: string | null;
  moduleName: string | null;
  activeTab: string | null;
  userRole: string;
  pathname: string;
}

export type ActionType = 'navigate' | 'query_data' | 'approve' | 'create' | 'update' | 'reject' | 'screen_action';

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

export interface ChatAction {
  type: ActionType;
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  result?: ActionResult;
}

export interface ScreenAction {
  type: 'fill' | 'click' | 'select_tab' | 'select_option' | 'scroll_to' | 'read';
  selector: string;
  value?: string;
  requiresConfirmation?: boolean;
  description: string;
}

export interface PageSnapshotField {
  label: string;
  type: string;
  selector: string;
  value: string;
  options?: string[];
  placeholder?: string;
}

export interface PageSnapshotButton {
  text: string;
  selector: string;
  type: string;
  destructive: boolean;
}

export interface PageSnapshotTable {
  selector: string;
  columns: string[];
  rowCount: number;
}

export interface PageSnapshot {
  fields: PageSnapshotField[];
  buttons: PageSnapshotButton[];
  tabs: { label: string; selector: string; active: boolean }[];
  tables: PageSnapshotTable[];
  stats: { label: string; value: string }[];
  modal: { title: string; open: boolean } | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  pageContext?: PageContext;
  action?: ChatAction;
  screenActions?: ScreenAction[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  pageContext: PageContext;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
}

export interface ExecuteActionRequest {
  actionName: string;
  parameters: Record<string, any>;
  conversationId: string;
}
