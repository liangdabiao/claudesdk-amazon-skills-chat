import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "../types";

let globalId = 0;
const uid = () => `msg_${++globalId}_${Date.now()}`;

export function useWebSocket() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  const connect = useCallback(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      retryRef.current = 0;
      ws.send(JSON.stringify({ type: "subscribe", chatId: "default" }));
    };
    ws.onclose = () => {
      setIsConnected(false);
      const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
      retryRef.current++;
      setTimeout(connect, delay);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "subscribed") return;

      if (msg.type === "user_message") {
        setMessages((p) => [...p, { id: uid(), role: "user", content: msg.content }]);
        setIsThinking(true);
        return;
      }
      if (msg.type === "assistant_message") {
        setMessages((p) => {
          const last = p[p.length - 1];
          if (last?.role === "assistant" && !last.toolCall) return [...p.slice(0, -1), { ...last, content: last.content + msg.content }];
          return [...p, { id: uid(), role: "assistant", content: msg.content }];
        });
        setIsThinking(false);
        return;
      }
      if (msg.type === "tool_use") {
        const tc = { name: msg.toolName, input: msg.toolInput, status: "running" as const };
        setMessages((p) => [...p, { id: uid(), role: "system", content: "", toolCall: tc }]);
        setIsThinking(true);
        return;
      }
      if (msg.type === "result") {
        setMessages((p) => {
          const idx = p.length - 1;
          const last = p[idx];
          if (last?.toolCall && last.toolCall.status === "running") {
            const updated = [...p];
            updated[idx] = { ...last, toolCall: { ...last.toolCall, status: "done" } };
            return updated;
          }
          return p;
        });
        setIsThinking(false);
        return;
      }
      if (msg.type === "error") {
        setMessages((p) => [...p, { id: uid(), role: "system", content: `Error: ${msg.error}` }]);
        setIsThinking(false);
      }
    };
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  const sendMessage = useCallback((content: string, files?: { name: string; path: string }[]) => {
    const payload = files?.length ? `${content}\n\n附件文件：${files.map((f) => `${f.name} (${f.path})`).join(", ")}` : content;
    wsRef.current?.send(JSON.stringify({ type: "chat", chatId: "default", content: payload }));
  }, []);

  return { messages, sendMessage, isConnected, isThinking };
}
