import Link from "next/link";
import { Flash } from "@/components/flash";
import { MonthPicker } from "@/components/month-picker";
import { ShiftTags } from "@/components/shift-tags";
import { dayMonthShort, firstDayOfMonth, isMonthString, lastDayOfMonth, monthLabel, monthOf, today, weekdayShort, upperFirst } from "@/lib/dates";
import { buildPayroll, getMonthStatus, getShifts } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { formatHours, shortTime } from "@/lib/time";
import { approveMonth } from "./actions";

export default async function ReconcilePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string; ok?: string }>;
}) {
  await requireRole("planner");
  const sp = await searchParams;
  const month = sp.month && isMonthString(sp.month) ? sp.month : monthOf(today());

  const [status, people, shifts] = await Promise.all([
    getMonthStatus(month),
    buildPayroll(month),
    getShifts({ from: firstDayOfMonth(month), to: lastDayOfMonth(month) }),
  ]);
  const isFuture = month > monthOf(today());

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">Månadsavstämning</h1>
        <MonthPicker basePath="/reconcile" month={month} />
      </div>
      <Flash error={sp.error} ok={sp.ok} />

      <section className="panel flex flex-wrap items-center gap-4 p-4">
        {status.locked ? (
          <p>
            <strong>Godkänd</strong>
            {status.approvedByName && ` av ${status.approvedByName}`}
            {status.approvedAt &&
              ` ${status.approvedAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })}`}
            . Månaden är låst. Löneköraren kan låsa upp den om något behöver rättas.
          </p>
        ) : (
          <>
            <div className="mr-auto">
              <p className="font-bold">
                {status.status === "unlocked" ? "Upplåst av löneköraren" : "Ej godkänd"}
              </p>
              {status.unlockComment && <p className="text-sm">Kommentar: {status.unlockComment}</p>}
              <p className="text-sm text-ink-soft">
                Rätta avvikelser genom att klicka på passen nedan. Godkänn sedan månaden så att löneköraren kan ta
                fram underlaget.
              </p>
            </div>
            <form action={approveMonth}>
              <input type="hidden" name="month" value={month} />
              <button type="submit" className="btn" disabled={isFuture}>
                Godkänn {monthLabel(month)}
              </button>
            </form>
          </>
        )}
      </section>

      {people.length === 0 ? (
        <p className="text-ink-soft">Inga pass den här månaden.</p>
      ) : (
        <div className="grid gap-3">
          {people.map((p) => {
            const own = shifts.filter((s) => s.userId === p.userId);
            return (
              <details key={p.userId} className="panel">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                  <span className="mr-auto font-bold">{p.name}</span>
                  <Stat label="Normaltid" minutes={p.total.normalMinutes} />
                  <Stat label="Helg" minutes={p.total.weekendMinutes} />
                  <Stat label="Sjuk" minutes={p.total.sickMinutes} />
                  <Stat label="Förtroendetid" minutes={p.total.trustMinutes} />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {own.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-20 whitespace-nowrap">
                        {upperFirst(weekdayShort(s.date))} {dayMonthShort(s.date)}
                      </span>
                      <Link
                        href={`/planning/shifts/${s.id}`}
                        className={`time ${s.status === "sick" ? "line-through" : ""}`}
                      >
                        {shortTime(s.startTime)}–{shortTime(s.endTime)}
                      </Link>
                      <span className="text-ink-soft">lunch {s.lunchMinutes} min</span>
                      <ShiftTags shift={s} />
                      {s.note && <span className="text-ink-soft">{s.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, minutes }: { label: string; minutes: number }) {
  return (
    <span className="text-sm">
      <span className="text-ink-soft">{label} </span>
      <span className="time">{formatHours(minutes)} h</span>
    </span>
  );
}
