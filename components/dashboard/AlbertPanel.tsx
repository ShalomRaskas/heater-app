"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { vizRegistry } from "./viz/registry";

/* ─── Block types ─────────────────────────────────────────── */
type TextBlock = { type: "text"; content: string };
export type VizBlock = { type: "viz"; vizType: string; playerId: number; data: unknown; caption: string };
type Block = TextBlock | VizBlock;

interface Message {
  role: "user" | "assistant";
  blocks: Block[];
  isGreeting?: boolean;
}

/* ─── Styles ──────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "820px",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 22px",
    borderBottom: "0.5px solid rgba(255,255,255,.08)",
    background: "linear-gradient(180deg, rgba(212,175,55,.03), transparent)",
    flexShrink: 0,
  },
  albertAv: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 30% 25%, #f5d874 0%, #d4af37 45%, #8a6f1c 100%)",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.15), 0 0 18px rgba(212,175,55,.28), inset 0 0 8px rgba(255,255,255,.15)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: "22px",
    color: "#1a1608",
    flexShrink: 0,
  },
  chatDropdown: {
    marginLeft: "auto",
    fontFamily: "var(--font-mono)",
    fontSize: "10.5px",
    color: "rgba(255,255,255,.6)",
    letterSpacing: ".08em",
    padding: "6px 10px",
    background: "rgba(255,255,255,.03)",
    border: "0.5px solid rgba(255,255,255,.08)",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    flexShrink: 0,
  },
  convo: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "22px 22px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    position: "relative",
  },
  albertMsgAv: {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    background:
      "radial-gradient(circle at 30% 25%, #f5d874 0%, #d4af37 50%, #8a6f1c 100%)",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.12), 0 0 10px rgba(212,175,55,.28)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: "15px",
    color: "#1a1608",
  },
  albertBubble: {
    padding: "13px 15px",
    borderRadius: "12px",
    background:
      "linear-gradient(180deg, rgba(212,175,55,.06), rgba(212,175,55,.02))",
    border: "0.5px solid rgba(212,175,55,.22)",
    boxShadow: "0 0 30px rgba(212,175,55,.05)",
    fontFamily: "var(--font-inter)",
    fontStyle: "normal",
    fontSize: "14px",
    lineHeight: 1.6,
    letterSpacing: ".01em",
    flex: 1,
    minWidth: 0,
  },
  lbl: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontStyle: "normal",
    fontSize: "9.5px",
    color: "#d4af37",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    marginBottom: "7px",
    fontWeight: 500,
  },
  suggest: {
    padding: "12px 22px",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    borderTop: "0.5px solid rgba(255,255,255,.08)",
    flexShrink: 0,
  },
  suggestLbl: {
    width: "100%",
    fontFamily: "var(--font-mono)",
    fontSize: "9.5px",
    color: "rgba(255,255,255,.4)",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    marginBottom: "4px",
  },
  pill: {
    fontSize: "12px",
    padding: "6px 11px",
    borderRadius: "999px",
    color: "rgba(255,255,255,.6)",
    background: "rgba(255,255,255,.03)",
    border: "0.5px solid rgba(255,255,255,.08)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  composer: {
    padding: "12px 22px 18px",
    borderTop: "0.5px solid rgba(255,255,255,.08)",
    flexShrink: 0,
  },
  composerBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "12px 14px",
    background: "rgba(255,255,255,.06)",
    border: "0.5px solid rgba(255,255,255,.12)",
    borderRadius: "12px",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.02) inset, 0 12px 24px rgba(0,0,0,.3)",
  },
  composerIcon: {
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.06)",
    border: "0.5px solid rgba(255,255,255,.08)",
    color: "rgba(255,255,255,.6)",
    fontSize: "12px",
    cursor: "pointer",
    flexShrink: 0,
  },
  sendBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "7px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #e84545, #b22020)",
    border: "0.5px solid rgba(255,255,255,.2)",
    boxShadow:
      "0 0 18px rgba(211,47,47,.35), inset 0 1px 0 rgba(255,255,255,.25)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity .15s",
  },
};

/* ─── Suggestions ─────────────────────────────────────────── */
const SUGGESTIONS = [
  "Tell me about Skubal's arsenal",
  "Compare Judge and Ohtani at the plate",
  "Is Miller's start sustainable?",
];

/* ─── Typing indicator ────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "10px", maxWidth: "92%" }}>
      <div style={S.albertMsgAv}>A</div>
      <div
        style={{
          ...S.albertBubble,
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ display: "inline-flex", gap: "4px", padding: "4px 0" }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <span
              key={i}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "999px",
                background: "#d4af37",
                opacity: 0.4,
                animation: `dot 1.2s ${delay}s infinite ease-in-out`,
                display: "inline-block",
              }}
            />
          ))}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontStyle: "normal",
            fontSize: "11px",
            color: "rgba(255,255,255,.4)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          reasoning through the data
        </span>
      </div>
    </div>
  );
}

/* ─── Markdown components for Albert's prose bubbles ─────── */
const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 0.85em", lineHeight: "inherit" }}>{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong
      style={{
        fontStyle: "normal",
        fontWeight: 600,
        color: "rgba(255,255,255,.92)",
      }}
    >
      {children}
    </strong>
  ),
};

/* ─── Greeting ────────────────────────────────────────────── */
const GREETING: Message = {
  role: "assistant",
  blocks: [
    {
      type: "text",
      content:
        "What do you want to know about baseball today? I have full Statcast data on Judge, Ohtani, Skubal, and Miller — ask me anything.",
    },
  ],
  isGreeting: true,
};

/* ─── Main component ──────────────────────────────────────── */
export default function AlbertPanel({
  onVizRendered,
  onResponseStart,
}: {
  onVizRendered?: (viz: VizBlock) => void;
  onResponseStart?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convoRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = convoRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setInputValue("");
      onResponseStart?.();

      const userMsg: Message = {
        role: "user",
        blocks: [{ type: "text", content: trimmed }],
      };
      const assistantMsg: Message = { role: "assistant", blocks: [] };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Extract text-only content for the Anthropic API (viz blocks are display-only)
      const apiMessages = [...messages, userMsg]
        .filter((m) => !m.isGreeting)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.blocks
            .filter((b): b is TextBlock => b.type === "text")
            .map((b) => b.content)
            .join(""),
        }))
        .filter((m) => m.content !== "");

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/albert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              "Albert is unavailable right now.",
          );
        }

        if (!res.body) throw new Error("No response stream.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on newlines — each complete line is one NDJSON object.
          // The last element may be an incomplete line; keep it in the buffer.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line) as {
                type: string;
                delta?: string;
                payload?: { vizType: string; data: unknown; caption: string };
              };

              if (event.type === "text" && event.delta) {
                // Append text delta to the last text block, or start a new one
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role !== "assistant") return prev;
                  const blocks = [...last.blocks];
                  const lastBlock = blocks[blocks.length - 1];
                  if (lastBlock?.type === "text") {
                    blocks[blocks.length - 1] = {
                      type: "text",
                      content: lastBlock.content + event.delta!,
                    };
                  } else {
                    blocks.push({ type: "text", content: event.delta! });
                  }
                  return [
                    ...next.slice(0, -1),
                    { ...last, blocks },
                  ];
                });
              } else if (event.type === "viz" && event.payload) {
                // Push a viz block — chart renders immediately
                const vizBlock: VizBlock = {
                  type: "viz",
                  vizType: event.payload!.vizType,
                  playerId: (event.payload as { playerId?: number }).playerId ?? 0,
                  data: event.payload!.data,
                  caption: event.payload!.caption,
                };
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role !== "assistant") return prev;
                  const blocks: Block[] = [...last.blocks, vizBlock];
                  return [...next.slice(0, -1), { ...last, blocks }];
                });
                onVizRendered?.(vizBlock);
              }
            } catch {
              // Malformed JSON line — ignore
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) =>
          prev[prev.length - 1]?.blocks.length === 0
            ? prev.slice(0, -1)
            : prev,
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(inputValue);
    }
  };

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([GREETING]);
    setInputValue("");
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Listen for queries dispatched by ResearchSection cards
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ query: string }>).detail?.query;
      if (query) submit(query);
    };
    window.addEventListener("albert-query", handler);
    return () => window.removeEventListener("albert-query", handler);
  }, [submit]);

  const lastMsg = messages[messages.length - 1];
  const showTyping =
    isStreaming && lastMsg?.role === "assistant" && lastMsg.blocks.length === 0;

  return (
    <div style={S.root}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.albertAv}>A</div>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "15px",
              letterSpacing: "-.01em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Albert
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                background: isStreaming ? "#ff6b35" : "#d4af37",
                boxShadow: isStreaming
                  ? "0 0 8px rgba(255,107,53,.6)"
                  : "0 0 8px rgba(212,175,55,.5)",
                animation: isStreaming
                  ? "redPulse 1s ease-in-out infinite"
                  : "amberPulse 2s ease-in-out infinite",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.4)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              marginTop: "3px",
            }}
          >
            {isStreaming ? "thinking…" : "AI scout · ready"}
          </div>
        </div>
        <button
          onClick={newConversation}
          title="New conversation"
          style={{ ...S.chatDropdown, background: "none", outline: "none" }}
        >
          New chat ＋
        </button>
      </div>

      {/* ── Conversation ── */}
      <div ref={convoRef} style={S.convo}>
        {messages.map((msg, i) => {
          /* User message */
          if (msg.role === "user") {
            const textContent = msg.blocks
              .filter((b): b is TextBlock => b.type === "text")
              .map((b) => b.content)
              .join("");
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  maxWidth: "92%",
                  marginLeft: "auto",
                  flexDirection: "row-reverse",
                }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "999px",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))",
                    border: "0.5px solid rgba(255,255,255,.12)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "rgba(255,255,255,.6)",
                    fontWeight: 500,
                  }}
                >
                  SR
                </div>
                <div
                  style={{
                    padding: "13px 15px",
                    borderRadius: "12px",
                    fontSize: "13.5px",
                    lineHeight: 1.58,
                    background: "rgba(255,255,255,.06)",
                    border: "0.5px solid rgba(255,255,255,.08)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  {textContent}
                </div>
              </div>
            );
          }

          /* Assistant message — skip empty placeholder while typing indicator is shown */
          if (msg.blocks.length === 0 && isStreaming && i === messages.length - 1) {
            return null;
          }

          /* Determine streaming cursor position */
          const lastBlock = msg.blocks[msg.blocks.length - 1];
          const showCursor =
            isStreaming &&
            i === messages.length - 1 &&
            lastBlock?.type === "text" &&
            lastBlock.content !== "";

          return (
            <div
              key={i}
              style={{ display: "flex", gap: "10px", maxWidth: "92%" }}
            >
              <div style={S.albertMsgAv}>A</div>
              <div style={S.albertBubble} className="albert-bubble">
                {!msg.isGreeting && <span style={S.lbl}>Albert</span>}

                {/* Render blocks */}
                {msg.blocks.map((block, bi) => {
                  if (block.type === "text") {
                    return (
                      <ReactMarkdown key={bi} components={mdComponents}>
                        {block.content}
                      </ReactMarkdown>
                    );
                  }
                  if (block.type === "viz") {
                    const Component = vizRegistry[block.vizType];
                    if (!Component) return null;
                    return (
                      <Component
                        key={bi}
                        data={block.data}
                        caption={block.caption}
                      />
                    );
                  }
                  return null;
                })}

                {/* Streaming cursor — appears after the last text block */}
                {showCursor && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "2px",
                      height: "14px",
                      background: "#d4af37",
                      marginLeft: "2px",
                      verticalAlign: "middle",
                      animation: "redPulse .8s ease-in-out infinite",
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {showTyping && <TypingIndicator />}

        {/* Error state */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(211,47,47,.08)",
              border: "0.5px solid rgba(211,47,47,.25)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "rgba(255,100,100,.8)",
              letterSpacing: ".06em",
            }}
          >
            {error}
          </div>
        )}

      </div>

      {/* ── Suggestions ── */}
      <div style={S.suggest}>
        <span style={S.suggestLbl}>Try asking</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            style={{
              ...S.pill,
              opacity: isStreaming ? 0.4 : 1,
              pointerEvents: isStreaming ? "none" : "auto",
            }}
            onClick={() => submit(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Composer ── */}
      <div style={S.composer}>
        <div style={S.composerBox}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Albert anything about baseball…"
            rows={1}
            disabled={isStreaming}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "var(--font-inter)",
              fontSize: "13.5px",
              color: "rgba(255,255,255,.85)",
              lineHeight: 1.5,
              width: "100%",
              minHeight: "40px",
              paddingTop: "3px",
              cursor: isStreaming ? "not-allowed" : "text",
              opacity: isStreaming ? 0.5 : 1,
            }}
          />
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={() => submit(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              aria-label="Send"
              style={{
                ...S.sendBtn,
                opacity: isStreaming || !inputValue.trim() ? 0.4 : 1,
                cursor: isStreaming || !inputValue.trim() ? "not-allowed" : "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 2l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div
          style={{
            marginTop: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "9.5px",
            color: "rgba(255,255,255,.4)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "999px",
              background: "#d4af37",
              display: "inline-block",
              flexShrink: 0,
              animation: isStreaming ? "amberPulse .8s ease-in-out infinite" : "none",
              opacity: isStreaming ? 1 : 0.4,
            }}
          />
          {isStreaming
            ? "Querying Statcast · Synthesizing…"
            : "Statcast · MLB Stats API · 2026 season data"}
        </div>
      </div>
    </div>
  );
}
