import Link from "next/link";
import { and, asc, gte, lte } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { dayMonth, today, weekdayShort, upperFirst } from "@/lib/dates";
import { requireRole } from "@/lib/session";
import { addHoliday, addPublicHolidays, deleteHoliday } from "../actions";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; error?: string; ok?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const year = Number(sp.year) || Number(today().slice(0, 4));
  const rows = await db
    .select()
    .from(holidays)
    .where(and(gte(holidays.date, `${year}-01-01`), lte(holidays.date, `${year}-12-31`)))
    .orderBy(asc(holidays.date));

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">Helgdagar {year}</h1>
        <Link className="btn btn-quiet px-3" href={`/admin/holidays?year=${year - 1}`} aria-label="Föregående år">‹</Link>
        <Link className="btn btn-quiet px-3" href={`/admin/holidays?year=${year + 1}`} aria-label="Nästa år">›</Link>
      </div>
      <p className="text-ink-soft">
        Lördagar och söndagar räknas alltid som helg. Här läggs röda dagar och andra dagar som ska ge helgtimmar.
      </p>
      <Flash error={sp.error} ok={sp.ok} />

      {rows.length === 0 ? (
        <form action={addPublicHolidays} className="panel flex flex-wrap items-center gap-3 p-4">
          <input type="hidden" name="year" value={year} />
          <span className="mr-auto">Inga helgdagar inlagda för {year}.</span>
          <button className="btn" type="submit">Lägg till röda dagar för {year}</button>
        </form>
      ) : (
        <ul className="panel divide-y divide-line">
          {rows.map((h) => (
            <li key={h.date} className="flex items-center gap-3 px-4 py-2">
              <span className="w-28 text-ink-soft">
                {upperFirst(weekdayShort(h.date))} {dayMonth(h.date)}
              </span>
              <span className="mr-auto font-bold">{h.name}</span>
              <form action={deleteHoliday}>
                <input type="hidden" name="date" value={h.date} />
                <button type="submit" className="text-sm font-bold text-lingon">Ta bort</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addHoliday} className="panel grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <label className="field">
          Datum
          <input type="date" name="date" className="input" defaultValue={`${year}-06-19`} required />
        </label>
        <label className="field">
          Namn
          <input name="name" className="input" placeholder="t.ex. Midsommarafton" required />
        </label>
        <button type="submit" className="btn btn-quiet">Lägg till dag</button>
      </form>
    </div>
  );
}
