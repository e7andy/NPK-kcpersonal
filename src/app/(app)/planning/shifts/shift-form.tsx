"use client";

import { useRef } from "react";
import { saveShift } from "../actions";

export interface TemplateOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lunchMinutes: number;
}

export function ShiftForm({
  shift,
  workers,
  templates,
  disabled,
}: {
  shift: {
    id?: string;
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    lunchMinutes: number;
    type: "regular" | "supervision";
    note: string | null;
  };
  workers: { id: string; name: string }[];
  templates: TemplateOption[];
  disabled: boolean;
}) {
  const start = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLInputElement>(null);
  const lunch = useRef<HTMLInputElement>(null);

  return (
    <form action={saveShift} className="grid gap-4">
      {shift.id && <input type="hidden" name="id" value={shift.id} />}
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Person
          <select name="userId" defaultValue={shift.userId} className="input" required>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Datum
          <input type="date" name="date" defaultValue={shift.date} className="input" required />
        </label>

        {templates.length > 0 && (
          <label className="field sm:col-span-2">
            Utgå från standardpass
            <select
              name="templateId"
              className="input"
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.currentTarget.value);
                if (!t) return;
                if (start.current) start.current.value = t.startTime.slice(0, 5);
                if (end.current) end.current.value = t.endTime.slice(0, 5);
                if (lunch.current) lunch.current.value = String(t.lunchMinutes);
              }}
            >
              <option value="">Välj för att fylla i tiderna</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)}, lunch {t.lunchMinutes} min
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          Start
          <input ref={start} type="time" name="startTime" defaultValue={shift.startTime.slice(0, 5)} className="input" step={300} required />
        </label>
        <label className="field">
          Slut
          <input ref={end} type="time" name="endTime" defaultValue={shift.endTime.slice(0, 5)} className="input" step={300} required />
        </label>
        <label className="field">
          Lunch (minuter)
          <input
            ref={lunch}
            type="number"
            name="lunchMinutes"
            defaultValue={shift.lunchMinutes}
            min={0}
            step={5}
            className="input"
            required
          />
        </label>
        <label className="field">
          Typ
          <select name="type" defaultValue={shift.type} className="input">
            <option value="regular">Ordinarie</option>
            <option value="supervision">Arbetsledning</option>
          </select>
        </label>
        <label className="field sm:col-span-2">
          Anteckning
          <input type="text" name="note" defaultValue={shift.note ?? ""} className="input" maxLength={200} />
        </label>
      </fieldset>
      {!disabled && (
        <div>
          <button type="submit" className="btn">
            {shift.id ? "Spara ändringar" : "Lägg till pass"}
          </button>
        </div>
      )}
    </form>
  );
}
