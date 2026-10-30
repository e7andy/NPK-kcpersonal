import Link from "next/link";
import { CopyField } from "@/components/copy-field";
import { ShiftTags } from "@/components/shift-tags";
import { calendarUrl, getCalendarToken, googleCalendarUrl, webcalUrl } from "@/lib/calendar";
import {
  addDays,
  addMonths,
  dayMonth,
  dayMonthShort,
  firstDayOfMonth,
  isoWeek,
  lastDayOfMonth,
  monthLabel,
  monthOf,
  today,
  weekdayLong,
  weekdayShort,
  upperFirst,
} from "@/lib/dates";
import { getHolidays, getShifts, isWeekendDay, type ShiftRow } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { addSummaries, EMPTY_SUMMARY, formatDuration, paidMinutes, shortTime, summarizeDay } from "@/lib/time";
import { createCalendarLink, removeCalendarLink } from "./actions";

export default async function MyShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; calendar?: string }>;
}) {
  const user = await requireRole("worker");
  const { view, calendar } = await searchParams;
  const showPast = view === "past";
  const now = today();
  const thisMonth = monthOf(now);
  const prevMonth = addMonths(thisMonth, -1);

  const [upcoming, past, monthShifts, holidayMap, calendarToken] = await Promise.all([
    getShifts({ userId: user.id, from: now, to: addDays(now, 90) }),
    showPast ? getShifts({ userId: user.id, from: addDays(now, -120), to: addDays(now, -1) }) : [],
    getShifts({ userId: user.id, from: firstDayOfMonth(prevMonth), to: lastDayOfMonth(thisMonth) }),
    getHolidays(firstDayOfMonth(prevMonth), lastDayOfMonth(thisMonth)),
    getCalendarToken(user.id),
  ]);

  const nextShift = upcoming.find((s) => s.status === "planned");
  const list = showPast ? [...past].reverse() : upcoming.filter((s) => s.id !== nextShift?.id);

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <section aria-labelledby="next-shift">
        <h1 id="next-shift" className="sr-only">
          Mina pass
        </h1>
        {nextShift ? (
          <NextShiftCard shift={nextShift} isToday={nextShift.date === now} />
        ) : (
          <div className="panel p-5">
            <h2>Inga pass inplanerade</h2>
            <p className="text-ink-soft">När planeraren lägger in pass åt dig syns de här.</p>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex gap-2" role="tablist">
          <TabLink href="/shifts" active={!showPast}>Kommande</TabLink>
          <TabLink href="/shifts?view=past" active={showPast}>Tidigare</TabLink>
        </div>
        {list.length === 0 ? (
          <p className="text-ink-soft">{showPast ? "Inga tidigare pass." : "Inga fler pass inplanerade."}</p>
        ) : (
          <ShiftList shifts={list} />
        )}
      </section>

      <section className="grid gap-3">
        <h2>Min tid</h2>
        <div className="grid grid-cols-2 gap-3">
          {[thisMonth, prevMonth].map((month) => {
            const total = monthShifts
              .filter((s) => monthOf(s.date) === month && s.date <= now)
              .reduce(
                (acc, s) => addSummaries(acc, summarizeDay([s], isWeekendDay(s.date, holidayMap))),
                EMPTY_SUMMARY,
              );
            return (
              <div key={month} className="panel p-4">
                <p className="text-sm text-ink-soft">{upperFirst(monthLabel(month))}</p>
                <p className="time text-2xl">{formatDuration(total.normalMinutes)}</p>
                {total.weekendMinutes > 0 && (
                  <p className="text-sm text-ink-soft">varav helg {formatDuration(total.weekendMinutes)}</p>
                )}
                {total.trustMinutes > 0 && (
                  <p className="text-sm text-ink-soft">förtroendetid {formatDuration(total.trustMinutes)}</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-ink-soft">Arbetad tid hittills, med lunch avdragen.</p>
      </section>

      <CalendarSection token={calendarToken} justCreated={calendar === "1"} />
    </div>
  );
}

function CalendarSection({ token, justCreated }: { token: string | null; justCreated: boolean }) {
  return (
    <section id="calendar" className="panel grid gap-3 p-5" aria-labelledby="calendar-heading">
      <h2 id="calendar-heading">Passen i din kalender</h2>
      {!token ? (
        <>
          <p className="text-ink-soft">
            Lägg till dina pass i kalendern i telefonen. Kalendern uppdateras av sig själv när schemat ändras.
          </p>
          <form action={createCalendarLink}>
            <button type="submit" className="btn">Skapa kalenderlänk</button>
          </form>
        </>
      ) : (
        <>
          {justCreated && (
            <p className="notice-ok" role="status">
              Kalenderlänken är klar. Lägg till den i kalendern nedan.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={webcalUrl(token)} className="btn">Lägg till i kalendern</a>
            <a href={googleCalendarUrl(token)} className="btn btn-quiet" target="_blank" rel="noreferrer">
              Google Kalender
            </a>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-bold">Så gör du</summary>
            <ul className="mt-2 grid list-disc gap-1 pl-5 text-ink-soft">
              <li>
                <b className="text-ink">iPhone:</b> tryck på <i>Lägg till i kalendern</i> och sedan <i>Prenumerera</i>.
              </li>
              <li>
                <b className="text-ink">Android med Google Kalender:</b> tryck på <i>Google Kalender</i> och lägg till
                kalendern. Det går inte i appen, så öppna länken i webbläsaren. Passen syns sedan i appen.
              </li>
              <li>
                <b className="text-ink">Annan kalender:</b> kopiera adressen nedan och lägg till den som
                prenumeration eller kalender från webbadress.
              </li>
            </ul>
            <p className="mt-2 text-ink-soft">
              Sjukmarkerade pass försvinner ur kalendern. Det kan ta upp till några timmar innan ändringar syns,
              beroende på kalendern.
            </p>
          </details>
          <CopyField value={calendarUrl(token)} label="Kalenderns adress" />
          <p className="text-sm text-ink-soft">
            Adressen är personlig och fungerar utan inloggning. Dela den inte. Har den spridits, byt adress så
            slutar den gamla att fungera.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={createCalendarLink}>
              <button type="submit" className="btn btn-quiet">Byt adress</button>
            </form>
            <form action={removeCalendarLink}>
              <button type="submit" className="btn btn-quiet text-lingon">Ta bort kalenderlänken</button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}

function NextShiftCard({ shift, isToday }: { shift: ShiftRow; isToday: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-white">
      <div className="p-5 pb-4">
        <p className="font-bold text-sun">{isToday ? "Idag" : "Nästa pass"}</p>
        <p className="mt-1 text-lg">
          <span className="capitalize">{weekdayLong(shift.date)}</span> {dayMonth(shift.date)}
        </p>
        <p className="time mt-2 text-5xl leading-none tracking-tight sm:text-6xl">
          {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-lake-deep px-5 py-3 text-sm">
        <span>{shift.lunchMinutes > 0 ? `Lunch ${shift.lunchMinutes} min` : "Ingen lunch"}</span>
        <span>Arbetstid {formatDuration(paidMinutes(shift))}</span>
        {shift.type === "trust" && <span className="font-bold">Förtroendetid</span>}
        <Link href={`/day/${shift.date}`} className="ml-auto font-bold text-white">
          Vem jobbar?
        </Link>
      </div>
    </div>
  );
}

function ShiftList({ shifts }: { shifts: ShiftRow[] }) {
  const byWeek = new Map<number, ShiftRow[]>();
  for (const s of shifts) byWeek.set(isoWeek(s.date), [...(byWeek.get(isoWeek(s.date)) ?? []), s]);
  return (
    <div className="grid gap-4">
      {[...byWeek].map(([week, items]) => (
        <div key={week}>
          <h3 className="mb-1 text-sm font-bold text-ink-soft">Vecka {week}</h3>
          <ul className="panel divide-y divide-line">
            {items.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/day/${s.date}`}
                  className={`flex items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-lake-wash ${
                    s.status === "sick" ? "opacity-70" : ""
                  }`}
                >
                  <span className="w-16 shrink-0 leading-tight">
                    <span className="block text-xs capitalize text-ink-soft">{weekdayShort(s.date)}</span>
                    <span className="whitespace-nowrap font-bold">{dayMonthShort(s.date)}</span>
                  </span>
                  <span className={`time text-lg ${s.status === "sick" ? "line-through" : ""}`}>
                    {shortTime(s.startTime)}–{shortTime(s.endTime)}
                  </span>
                  <span className="ml-auto flex flex-wrap justify-end gap-1">
                    <ShiftTags shift={s} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`rounded-full px-4 py-1.5 text-sm font-bold no-underline ${
        active ? "bg-ink text-white" : "border border-line text-ink hover:bg-lake-wash"
      }`}
    >
      {children}
    </Link>
  );
}
