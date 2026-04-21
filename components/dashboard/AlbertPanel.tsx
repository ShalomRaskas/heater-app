"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

/* ─── Types ──────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant";
  content: string;
  isGreeting?: boolean; // display-only; excluded from API calls
}

/* ─── Styles (same tokens as before) ─────────────────────── */
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
  statusDot: {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    background: "#d4af37",
    boxShadow: "0 0 8px rgba(212,175,55,.5)",
    animation: "amberPulse 2s ease-in-out infinite",
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
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: "16px",
    lineHeight: 1.55,
    letterSpacing: ".002em",
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
    gridTemplateColumns: "28px 1fr auto",
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
  sources: {
    marginTop: "10px",
    fontFamily: "var(--font-mono)",
    fontSize: "9.5px",
    color: "rgba(255,255,255,.4)",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
};

/* ─── Starter suggestions (V1 hardcoded) ─────────────────── */
const SUGGESTIONS = [
  "Tell me about Skubal's splitter",
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

/* ─── Main component ──────────────────────────────────────── */
const GREETING: Message = {
  role: "assistant",
  content:
    "What do you want to know about baseball today? I have full Statcast data on Judge, Ohtani, Skubal, and Miller — ask me anything.",
  isGreeting: true,
};

export default function AlbertPanel() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convoRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setInputValue("");

      // Build the new message list (excluding greeting from API payload)
      const userMsg: Message = { role: "user", content: trimmed };
      const assistantMsg: Message = { role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Build API messages: real conversation history (no greeting)
      const apiMessages = [...messages, userMsg]
        .filter((m) => !m.isGreeting && m.content !== "")
        .map(({ role, content }) => ({ role, content }));

      // Abort any prior in-flight request
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

        const text = await res.text();
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: text };
          }
          return next;
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        // Remove the empty assistant placeholder
        setMessages((prev) =>
          prev[prev.length - 1]?.content === ""
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

  // Show typing indicator when streaming and the last message is still empty
  const lastMsg = messages[messages.length - 1];
  const showTyping =
    isStreaming && lastMsg?.role === "assistant" && lastMsg.content === "";

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
                ...S.statusDot,
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
        <div style={S.chatDropdown}>
          Chat ▾
        </div>
      </div>

      {/* ── Conversation ── */}
      <div ref={convoRef} style={S.convo}>
        {messages.map((msg, i) => {
          if (msg.role === "user") {
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
                  {msg.content}
                </div>
              </div>
            );
          }

          // Assistant message — skip empty ones (will be shown as typing indicator)
          if (msg.content === "" && isStreaming && i === messages.length - 1) {
            return null;
          }

          return (
            <div key={i} style={{ display: "flex", gap: "10px", maxWidth: "92%" }}>
              <div style={S.albertMsgAv}>A</div>
              <div style={S.albertBubble} className="albert-bubble">
                {!msg.isGreeting && (
                  <span style={S.lbl}>Albert</span>
                )}
                <ReactMarkdown
                  components={{
                    // Paragraphs: spacing between them, none after last
                    p: ({ children }) => (
                      <p style={{ margin: "0 0 0.85em", lineHeight: "inherit" }}>
                        {children}
                      </p>
                    ),
                    // Bold inside serif-italic: switch to upright so it reads cleanly
                    strong: ({ children }) => (
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
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                {/* Streaming cursor */}
                {isStreaming && i === messages.length - 1 && msg.content !== "" && (
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

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 1 }} />
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
          <div style={S.composerIcon}>＋</div>
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
            <div style={S.composerIcon}>🎙</div>
            <button
              onClick={() => submit(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              style={{
                ...S.sendBtn,
                opacity: isStreaming || !inputValue.trim() ? 0.4 : 1,
                cursor:
                  isStreaming || !inputValue.trim() ? "not-allowed" : "pointer",
              }}
            >
              ↵
            </button>
          </div>
        </div>
        <div style={S.sources}>
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "999px",
              background: "#d4af37",
              display: "inline-block",
              flexShrink: 0,
              animation: isStreaming
                ? "amberPulse .8s ease-in-out infinite"
                : "none",
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
