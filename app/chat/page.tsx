"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("companion_history");
      return cached ? (JSON.parse(cached) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [personaName, setPersonaName] = useState(() => {
    if (typeof window === "undefined") return "Luna";
    return localStorage.getItem("companion_name") || "Luna";
  });
  const [userName, setUserName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user_name") || "";
  });
  const [tone, setTone] = useState(() => {
    if (typeof window === "undefined") return "gentle";
    return localStorage.getItem("companion_tone") || "gentle";
  });
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("companion_history", JSON.stringify(messages));
  }, [messages]);
  useEffect(() => {
    localStorage.setItem("companion_name", personaName);
  }, [personaName]);
  useEffect(() => {
    localStorage.setItem("user_name", userName);
  }, [userName]);
  useEffect(() => {
    localStorage.setItem("companion_tone", tone);
  }, [tone]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const systemPreview = useMemo(() => {
    return `${personaName} ? ${tone} ? supportive`;
  }, [personaName, tone]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setIsLoading(true);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, personaName, userName, tone }),
      signal: abortController.signal
    });

    if (!res.ok || !res.body) {
      setIsLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I ran into an issue. Could we try again?" }]);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let assistant: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistant]);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistant.content += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...assistant };
          return copy;
        });
      }
    } catch (e) {
      // ignore aborts
    } finally {
      setIsLoading(false);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
  }

  return (
    <main className="container chat">
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="small">Companion</div>
            <div style={{ fontWeight: 700 }}>{systemPreview}</div>
          </div>
          <div className="row">
            <button className="button" onClick={clearChat} disabled={isLoading}>Clear</button>
            <a className="button" href="/" style={{ background: "#374151" }}>Home</a>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div ref={listRef} className="messages">
            {messages.length === 0 && (
              <div className="small" style={{ opacity: 0.7 }}>
                Say hi and I will listen. Share how your day is going.
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble ${m.role}`}>{m.content}</div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="row">
              <input
                className="input"
                placeholder="Write a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={isLoading}
              />
              <button className="button" onClick={send} disabled={isLoading}>Send</button>
            </div>
          </div>
        </div>

        <aside className="card">
          <fieldset>
            <legend>Companion</legend>
            <div className="grid">
              <label className="small">Name</label>
              <input className="input" value={personaName} onChange={(e) => setPersonaName(e.target.value)} />
              <label className="small">Tone</label>
              <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="gentle">gentle</option>
                <option value="playful">playful</option>
                <option value="cheerful">cheerful</option>
                <option value="calm">calm</option>
              </select>
            </div>
          </fieldset>
          <fieldset style={{ marginTop: 12 }}>
            <legend>You</legend>
            <div className="grid">
              <label className="small">Your name</label>
              <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} />
              <p className="small">Used so your companion can address you warmly.</p>
            </div>
          </fieldset>
          <p className="small" style={{ marginTop: 12 }}>
            If the AI key isn't configured, messages use a local fallback.
          </p>
        </aside>
      </section>
    </main>
  );
}
