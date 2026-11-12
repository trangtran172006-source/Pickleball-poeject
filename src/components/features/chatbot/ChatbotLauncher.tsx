"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useApiErrorMessage } from "@/lib/apiErrors";
import { useFormat } from "@/i18n/useFormat";
import { dayGroupKey } from "@/i18n/status";
import { chatbotApi, type ChatAnswer, type ChatTopic } from "@/services/api/chatbot";

type Entry = { id: number; from: "user"; topic?: ChatTopic; text?: string } | { id: number; from: "bot"; answer?: ChatAnswer; error?: unknown };

const topics: Array<{ topic: ChatTopic; key: "qPrice" | "qHours" | "qAvailability" | "qCancel" | "qAddress" | "qPayment" }> = [
  { topic: "price", key: "qPrice" },
  { topic: "hours", key: "qHours" },
  { topic: "availability", key: "qAvailability" },
  { topic: "cancel", key: "qCancel" },
  { topic: "address", key: "qAddress" },
  { topic: "payment", key: "qPayment" },
];

/**
 * Scripted assistant (SRS scope: court info, prices, hours, policies).
 * Answers are message keys + live data from the server, so the whole
 * conversation follows the selected language.
 */
export function ChatbotLauncher() {
  const t = useTranslations("chatbot");
  const tc = useTranslations("common");
  const f = useFormat();
  const errorText = useApiErrorMessage();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [entries, open]);

  const ask = async (input: { topic?: ChatTopic; text?: string }) => {
    if (busy) return;
    setBusy(true);
    setEntries((list) => [...list, { id: nextId.current++, from: "user", ...input }]);
    try {
      const answer = await chatbotApi.ask(input);
      setEntries((list) => [...list, { id: nextId.current++, from: "bot", answer }]);
    } catch (error) {
      setEntries((list) => [...list, { id: nextId.current++, from: "bot", error }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    void ask({ text: value });
  };

  const line = (item: ChatAnswer["lines"][number]) => {
    const params = { ...(item.params ?? {}) } as Record<string, string | number>;
    if (typeof params.price === "number") params.price = f.currency(params.price);
    if (typeof params.date === "string") params.date = f.date(params.date);
    if (typeof params.group === "string" && params.group in dayGroupKey) params.group = tc(dayGroupKey[params.group as keyof typeof dayGroupKey]);
    if (params.address === "") params.address = tc("address");
    return (t as unknown as (key: string, values: Record<string, string | number>) => string)(item.key, params);
  };

  return (
    <>
      {open && (
        <section role="dialog" aria-label={t("title")} className="fixed bottom-20 right-4 z-40 flex h-[min(70dvh,480px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={tc("close")} className="flex size-7 items-center justify-center rounded-md hover:bg-white/15">
              <X aria-hidden className="size-4" />
            </button>
          </header>
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3 text-[13px]">
            <p className="max-w-[85%] rounded-xl rounded-tl-sm bg-page px-3 py-2 text-ink">{t("welcome")}</p>
            {entries.map((entry) =>
              entry.from === "user" ? (
                <p key={entry.id} className="ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-sm bg-brand px-3 py-2 text-white">
                  {entry.topic ? t(topics.find((item) => item.topic === entry.topic)!.key) : entry.text}
                </p>
              ) : (
                <div key={entry.id} data-bot className="max-w-[85%] rounded-xl rounded-tl-sm bg-page px-3 py-2 text-ink">
                  {entry.answer ? entry.answer.lines.map((item, index) => <p key={index}>{line(item)}</p>) : <p className="text-danger">{errorText(entry.error)}</p>}
                </div>
              ),
            )}
            <div ref={end} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-2.5">
            {topics.map((item) => (
              <button key={item.topic} type="button" disabled={busy} onClick={() => ask({ topic: item.topic })} className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-brand hover:bg-brand-soft disabled:opacity-50">
                {t(item.key)}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 p-3">
            <input value={text} onChange={(event) => setText(event.target.value)} maxLength={300} placeholder={t("placeholder")} aria-label={t("placeholder")} className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-[13px] outline-none focus:border-brand" />
            <button type="submit" disabled={busy || !text.trim()} aria-label={t("send")} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-50">
              <Send aria-hidden className="size-4" />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("open")}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark"
      >
        {open ? <X aria-hidden className="size-5" /> : <MessageCircle aria-hidden className="size-5" />}
      </button>
    </>
  );
}
