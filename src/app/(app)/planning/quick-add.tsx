"use client";

import { useRef } from "react";
import { quickAddShift } from "./actions";

/** Select a standard shift in an empty cell; it is saved immediately. */
export function QuickAdd({
  userId,
  userName,
  date,
  dateLabel,
  returnTo,
  templates,
}: {
  userId: string;
  userName: string;
  date: string;
  dateLabel: string;
  returnTo: string;
  templates: { id: string; label: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={quickAddShift}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="templateId"
        defaultValue=""
        aria-label={`Lägg till pass för ${userName} ${dateLabel}`}
        onChange={(e) => {
          if (e.currentTarget.value) formRef.current?.requestSubmit();
        }}
        className="w-full cursor-pointer rounded border border-dashed border-line bg-transparent px-1 py-1 text-xs text-ink-soft hover:border-lake hover:text-lake"
      >
        <option value="">+ pass</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs">Lägg till</button>
      </noscript>
    </form>
  );
}
