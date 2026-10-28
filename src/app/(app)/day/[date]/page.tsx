import Link from "next/link";
import { notFound } from "next/navigation";
import { ShiftTags } from "@/components/shift-tags";
import { addDays, dayMonth, isDateString, today, weekdayLong } from "@/lib/dates";
import { getHolidays, getShifts } from "@/lib/schedule";
import { hasRole, requireUser } from "@/lib/session";
import { shortTime } from "@/lib/time";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const user = await requireUser();
  const { date } = await params;
  if (!isDateString(date)) notFound();

  const [shifts, holidayMap] = await Promise.all([getShifts({ from: date, to: date }), getHolidays(date, date)]);
  const holiday = holidayMap.get(date);
  const isPlanner = hasRole(user, "planner");

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <div className="flex items-center gap-2">
        <Link href={`/day/${addDays(date, -1)}`} className="btn btn-quiet px-3" aria-label="Föregående dag">
          ‹
        </Link>
        <div className="flex-1 text-center">
          <h1>
            <span className="capitalize">{weekdayLong(date)}</span> {dayMonth(date)}
          </h1>
          <p className="text-sm text-ink-soft">
            {date === today() ? "Idag" : date}
            {holiday && <span className="ml-2 rounded bg-sun-wash px-1.5 py-0.5 font-bold text-ink">{holiday}</span>}
          </p>
        </div>
        <Link href={`/day/${addDays(date, 1)}`} className="btn btn-quiet px-3" aria-label="Nästa dag">
          ›
        </Link>
      </div>

      {shifts.length === 0 ? (
        <p className="panel p-5 text-ink-soft">Ingen är inplanerad den här dagen.</p>
      ) : (
        <ul className="panel divide-y divide-line">
          {shifts.map((s) => (
            <li key={s.id} className={`flex items-center gap-3 px-4 py-3 ${s.userId === user.id ? "bg-sun-wash" : ""}`}>
              <span className={`time w-28 shrink-0 text-lg ${s.status === "sick" ? "line-through opacity-60" : ""}`}>
                {shortTime(s.startTime)}–{shortTime(s.endTime)}
              </span>
              <span className="font-bold">
                {isPlanner ? <Link href={`/planning/shifts/${s.id}`}>{s.userName}</Link> : s.userName}
                {s.userId === user.id && <span className="ml-1 font-normal text-ink-soft">(du)</span>}
              </span>
              <span className="ml-auto flex flex-wrap justify-end gap-1">
                <ShiftTags shift={s} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
