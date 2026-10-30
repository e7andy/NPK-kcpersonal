"use client";

import { useState } from "react";

/** Read-only text field with a copy button. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        className="input font-mono text-sm"
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        className="btn btn-quiet shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard not available (e.g. plain http); the field can still be selected.
          }
        }}
      >
        {copied ? "Kopierad" : "Kopiera"}
      </button>
    </div>
  );
}
