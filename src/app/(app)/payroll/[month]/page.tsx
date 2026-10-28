import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { dayMonth, isMonthString, monthLabel, weekdayShort, upperFirst } from "@/lib/dates";
import { buildPayroll, getMonthStatus } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { formatHours } from "@/lib/time";
import { unlockMonth } from "../actions";

export default async function PayrollMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("payroll");
  const { month } = await params;
  const sp = await searchParams;
  if (!isMonthString(month)) notFound();

  const status = await getMonthStatus(month);
  if (!status.locked) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4">
        <Link href="/payroll" className="text-sm">Alla månader</Link>
        <h1>{upperFirst(monthLabel(month))}</h1>
        <p className="panel p-5">Månaden är inte godkänd av planeraren än.</p>
      </div>
    );
  }

  const people = await buildPayroll(month);

  return (
    <div className="grid gap-5">
      <Link href="/payroll" className="text-sm">Alla månader</Link>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1>Löneunderlag {monthLabel(month)}</h1>
          <p className="text-ink-soft">
            Godkänd{status.approvedByName && ` av ${status.approvedByName}`}. Timmar med lunch avdragen.
          </p>
        </div>
        <a className="btn" href={`/payroll/${month}/export?format=xlsx`}>Ladda ner Excel</a>
        <a className="btn btn-quiet" href={`/payroll/${month}/export?format=csv`}>Ladda ner CSV</a>
      </div>
      <Flash error={sp.error} />

      <p className="text-sm text-ink-soft">
        Helgtimmar är samma timmar som normaltiden på lördagar, söndagar och röda dagar, och läggs till en gång till i
        Fortnox. Arbetsledning ingår i normaltiden.
      </p>

      {people.map((p) => (
        <section key={p.userId} className="panel overflow-x-auto">
          <h2 className="flex flex-wrap items-baseline gap-x-3 px-4 pt-4">
            {p.name}
            <span className="font-sans text-sm font-normal text-ink-soft">
              {p.fortnoxEmployeeId ? `Anst.nr ${p.fortnoxEmployeeId}` : "Anställningsnummer saknas"}
            </span>
          </h2>
          <table className="mt-2 w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-4 py-2">Datum</th>
                <th scope="col" className="px-4 py-2 text-right">Normaltid</th>
                <th scope="col" className="px-4 py-2 text-right">Helg</th>
                <th scope="col" className="px-4 py-2 text-right">Sjuk</th>
                <th scope="col" className="px-4 py-2 text-right">varav arbetsledning</th>
              </tr>
            </thead>
            <tbody>
              {p.days.map((d) => (
                <tr key={d.date} className={`border-b border-line/60 ${d.isWeekend ? "bg-sun-wash/60" : ""}`}>
                  <td className="px-4 py-1.5">
                    {upperFirst(weekdayShort(d.date))} {dayMonth(d.date)}
                  </td>
                  <Num minutes={d.normalMinutes} />
                  <Num minutes={d.weekendMinutes} />
                  <Num minutes={d.sickMinutes} />
                  <Num minutes={d.supervisionMinutes} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="px-4 py-2">Summa</td>
                <Num minutes={p.total.normalMinutes} always />
                <Num minutes={p.total.weekendMinutes} always />
                <Num minutes={p.total.sickMinutes} always />
                <Num minutes={p.total.supervisionMinutes} always />
              </tr>
            </tfoot>
          </table>
        </section>
      ))}

      <form action={unlockMonth} className="panel grid gap-3 p-4">
        <h2>Något stämmer inte?</h2>
        <input type="hidden" name="month" value={month} />
        <label className="field">
          Vad behöver rättas
          <textarea name="comment" className="input min-h-20" required maxLength={500} />
        </label>
        <div>
          <button type="submit" className="btn btn-quiet">Lås upp och skicka tillbaka till planeraren</button>
        </div>
      </form>
    </div>
  );
}

function Num({ minutes, always }: { minutes: number; always?: boolean }) {
  return (
    <td className="time px-4 py-1.5 text-right">
      {minutes || always ? formatHours(minutes) : <span className="text-ink-soft">–</span>}
    </td>
  );
}
