import React, { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChatMessage from "./ChatMessage";

export default function ChatPanel({ messages, busy, applying, onSend, onConfirm, onDiscard, suggestions }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    onSend(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <p className="text-sm font-medium">Plan with me</p>
        <span className="ml-auto text-xs text-muted-foreground">nothing is applied without your yes</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onConfirm={onConfirm}
            onDiscard={onDiscard}
            applying={applying}
          />
        ))}

        {busy ? (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            </span>
            Thinking through your plan…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/60 px-4 pb-4 pt-3">
        {!busy && suggestions?.length > 0 ? (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSend(suggestion)}
                className="rounded-full border border-border/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            rows={2}
            placeholder="Ask for anything — “cut décor by 20% and add live music”"
            className="min-h-[52px] resize-none rounded-2xl"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={submit} disabled={busy || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}