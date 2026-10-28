import Link from "next/link";
import { Flash } from "@/components/flash";
import {
  addDays,
  dateRange,
  dayMonth,
  dayMonthShort,
  isDateString,
  isoWeek,
  monthOf,
  startOfWeek,
  today,
  weekdayShort,
} from "@/lib/dates";
import {
  getActiveTemplates,
  getHolidays,
  getLockedMonths,
  getShifts,
  getWorkers,
  isWeekendDay,
  type ShiftRow,
} from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { formatDuration, paidMinutes, shortTime } from "@/lib/time";
import { copyWeek } from "./actions";
import { QuickAdd } from "./quick-add";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; error?: string; ok?: string }>;
}) {
  await requireRole("planner");
  const sp = await searchParams;
  const monday = startOfWeek(sp.week && isDateString(sp.week) ? sp.week : today());
  const sunday = addDays(monday, 6);
  const days = dateRange(monday, sunday);
  const returnTo = `/planning?week=${monday}`;

  const [workers, shifts, templates, holidayMap, locked] = await Promise.all([
    getWorkers(),
    getShifts({ from: monday, to: sunday }),
    getActiveTemplates(),
    getHolidays(monday, sunday),
    getLockedMonths(),
  ]);

  const cell = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    const key = `${s.userId}|${s.date}`;
    cell.set(key, [...(cell.get(key) ?? []), s]);
  }
  const templateOptions = templates.map((t) => ({
    id: t.id,
    label: `${t.name} ${shortTime(t.startTime)}–${shortTime(t.endTime)}`,
  }));
  const nowDate = today();
  const weekLocked = days.some((d) => locked.has(monthOf(d)));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1>Schema vecka {isoWeek(monday)}</h1>
          <p className="text-ink-soft">
            {dayMonth(monday)} – {dayMonth(sunday)} {sunday.slice(0, 4)}
          </p>
        </div>
        <Link className="btn btn-quiet" href={`/planning?week=${addDays(monday, -7)}`}>
          Föregående vecka
        </Link>
        <Link className="btn btn-quiet" href="/planning">
          Denna vecka
        </Link>
        <Link className="btn btn-quiet" href={`/planning?week=${addDays(monday, 7)}`}>
          Nästa vecka
        </Link>
      </div>

      <Flash error={sp.error} ok={sp.ok} />
      {weekLocked && (
        <p className="notice-error">Veckan ligger delvis i en godkänd månad. De dagarna är låsta.</p>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-40 bg-card px-3 py-2 text-left">
                Person
              </th>
              {days.map((d) => {
                const weekend = isWeekendDay(d, holidayMap);
                return (
                  <th
                    key={d}
                    scope="col"
                    className={`border-l border-line px-2 py-2 text-left font-bold ${weekend ? "bg-sun-wash" : ""}`}
                  >
                    <Link href={`/day/${d}`} className={`no-underline ${d === nowDate ? "text-lake" : "text-ink"}`}>
                      <span className="capitalize">{weekdayShort(d)}</span> {dayMonthShort(d)}
                    </Link>
                    {holidayMap.get(d) && (
                      <span className="block text-xs font-normal text-ink-soft">{holidayMap.get(d)}</span>
                    )}
                  </th>
                );
              })}
              <th scope="col" className="border-l border-line px-3 py-2 text-right">
                Vecka
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => {
              const planned = shifts.filter((s) => s.userId === w.id && s.status === "planned");
              const weekMinutes = planned
                .filter((s) => s.type === "regular")
                .reduce((sum, s) => sum + paidMinutes(s), 0);
              const weekTrustMinutes = planned
                .filter((s) => s.type === "trust")
                .reduce((sum, s) => sum + paidMinutes(s), 0);
              return (
                <tr key={w.id} className="border-t border-line align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-bold">
                    {w.name}
                  </th>
                  {days.map((d) => {
                    const items = cell.get(`${w.id}|${d}`) ?? [];
                    const isLocked = locked.has(monthOf(d));
                    return (
                      <td
                        key={d}
                        className={`border-l border-line p-1.5 ${isWeekendDay(d, holidayMap) ? "bg-sun-wash/50" : ""}`}
                      >
                        <div className="grid gap-1">
                          {items.map((s) => (
                            <ShiftChip key={s.id} shift={s} />
                          ))}
                          {!isLocked && items.length === 0 && (
                            <QuickAdd
                              userId={w.id}
                              userName={w.name}
                              date={d}
                              dateLabel={`${weekdayShort(d)} ${dayMonth(d)}`}
                              returnTo={returnTo}
                              templates={templateOptions}
                            />
                          )}
                          {!isLocked && (
                            <Link
                              href={`/planning/shifts/new?userId=${w.id}&date=${d}`}
                              className="text-xs text-ink-soft"
                              aria-label={`Lägg till pass med egna tider för ${w.name} ${dayMonth(d)}`}
                            >
                              {items.length === 0 ? "egen tid" : "+ pass"}
                            </Link>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="time border-l border-line px-3 py-2 text-right whitespace-nowrap">
                    {weekMinutes ? formatDuration(weekMinutes) : "–"}
                    {weekTrustMinutes > 0 && (
                      <span className="block text-xs font-normal text-reed">
                        + {formatDuration(weekTrustMinutes)} förtroendetid
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-lake-wash ring-1 ring-lake/30" /> Ordinarie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-reed-wash ring-1 ring-reed/40" /> Förtroendetid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-lingon-wash ring-1 ring-lingon/40" /> Sjuk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-sun-wash ring-1 ring-sun" /> Helg eller röd dag
        </span>
      </div>

      <form action={copyWeek} className="panel flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="fromWeek" value={monday} />
        <label className="field">
          Kopiera vecka {isoWeek(monday)} till
          <select name="toWeek" className="input" defaultValue={addDays(monday, 7)}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const target = addDays(monday, 7 * n);
              return (
                <option key={target} value={target}>
                  Vecka {isoWeek(target)} ({dayMonth(target)})
                </option>
              );
            })}
          </select>
        </label>
        <button className="btn btn-quiet" type="submit">
          Kopiera pass
        </button>
        <p className="basis-full text-sm text-ink-soft">
          Sjukmarkerade pass och ersättarpass kopieras inte. Pass som skulle överlappa hoppas över.
        </p>
      </form>
    </div>
  );
}

function ShiftChip({ shift }: { shift: ShiftRow }) {
  const tone =
    shift.status === "sick"
      ? "bg-lingon-wash text-lingon line-through decoration-1"
      : shift.type === "trust"
        ? "bg-reed-wash text-reed"
        : "bg-lake-wash text-lake-deep";
  return (
    <Link
      href={`/planning/shifts/${shift.id}`}
      className={`block rounded px-1.5 py-1 no-underline hover:ring-2 hover:ring-lake/40 ${tone}`}
      title={shift.note ?? undefined}
    >
      <span className="time">
        {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
      </span>
      {shift.lunchMinutes > 0 && <span className="block text-xs opacity-80">lunch {shift.lunchMinutes}</span>}
      {shift.replacesShiftId && <span className="block text-xs font-bold">ersättare</span>}
    </Link>
  );
}
