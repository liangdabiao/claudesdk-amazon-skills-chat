export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  files?: { name: string; path: string }[];
  toolCall?: { name: string; input?: unknown; status: "running" | "done" };
}

export interface ReportFile {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: ReportFile[];
}
