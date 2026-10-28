import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function IntakeChat({ messages, thinking, onSend, pendingQuestions }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  const submit = () => {
    const value = text.trim();
    if (!value || thinking) return;
    setText("");
    onSend(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-2">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "flex justify-end" : "flex gap-2.5"}>
            {message.role === "assistant" ? (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <div className="min-w-0 max-w-[88%] space-y-2">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border/80 bg-card"
                }`}
              >
                {message.content}
              </div>
              {message.questions?.length ? (
                <ul className="space-y-1.5 rounded-2xl border border-accent/25 bg-accent/6 px-4 py-3 text-sm">
                  {message.questions.map((question) => (
                    <li key={question} className="flex gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {message.examples?.length ? (
                <div className="flex flex-wrap gap-2">
                  {message.examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => onSend(example)}
                      className="max-w-full truncate rounded-full border border-border/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            </span>
            Reading what you told me…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border/60 pt-3">
        <Textarea
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={pendingQuestions ? "Answer above, or add anything else…" : "Add anything else about the event…"}
          className="min-h-[52px] resize-none rounded-2xl"
        />
        <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={submit} disabled={thinking || !text.trim()}>
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}