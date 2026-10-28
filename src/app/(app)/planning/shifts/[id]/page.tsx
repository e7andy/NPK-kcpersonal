import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { ShiftTags } from "@/components/shift-tags";
import { db } from "@/db";
import { auditLog, shifts as shiftsTable, user } from "@/db/schema";
import { dayMonth, startOfWeek, weekdayLong } from "@/lib/dates";
import {
  getActiveTemplates,
  getReplacementCandidates,
  getShift,
  getWorkers,
  isDateLocked,
} from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { formatDuration, paidMinutes, shortTime } from "@/lib/time";
import { assignReplacement, deleteShift, setSick } from "../../actions";
import { ShiftForm } from "../shift-form";

const ACTION_LABELS: Record<string, string> = {
  create: "Skapat",
  update: "Ändrat",
  sick: "Markerat som sjuk",
  unsick: "Sjukmarkering borttagen",
  replace: "Skapat som ersättare",
};

export default async function EditShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole("planner");
  const { id } = await params;
  const sp = await searchParams;
  const shift = await getShift(id);
  if (!shift) notFound();

  const [workers, templates, locked, replacements, original, history] = await Promise.all([
    getWorkers(),
    getActiveTemplates(),
    isDateLocked(shift.date),
    db
      .select({ id: shiftsTable.id, name: user.name, startTime: shiftsTable.startTime, endTime: shiftsTable.endTime })
      .from(shiftsTable)
      .innerJoin(user, eq(user.id, shiftsTable.userId))
      .where(eq(shiftsTable.replacesShiftId, id)),
    shift.replacesShiftId ? getShift(shift.replacesShiftId) : null,
    db
      .select({ action: auditLog.action, createdAt: auditLog.createdAt, by: user.name, after: auditLog.after })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.userId))
      .where(and(eq(auditLog.entity, "shift"), eq(auditLog.entityId, id)))
      .orderBy(desc(auditLog.createdAt)),
  ]);
  const candidates = shift.status === "sick" && !locked ? await getReplacementCandidates(shift) : [];

  // Workers list must include the shift's person even if no longer a worker.
  const workerList = workers.some((w) => w.id === shift.userId)
    ? workers
    : [{ id: shift.userId, name: shift.userName }, ...workers];

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href={`/planning?week=${startOfWeek(shift.date)}`} className="text-sm">
        Tillbaka till schemat
      </Link>
      <div>
        <h1>
          {shift.userName}, <span className="capitalize">{weekdayLong(shift.date)}</span> {dayMonth(shift.date)}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
          <span className="time text-ink">
            {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
          </span>
          <span>arbetstid {formatDuration(paidMinutes(shift))}</span>
          <ShiftTags shift={shift} />
        </p>
      </div>

      <Flash error={sp.error} ok={sp.ok} />
      {locked && <p className="notice-error">Månaden är godkänd och låst. Löneköraren kan låsa upp den.</p>}
      {original && (
        <p className="notice-ok">
          Ersätter {original.userName} som är sjuk.{" "}
          <Link href={`/planning/shifts/${original.id}`}>Visa ursprungligt pass</Link>
        </p>
      )}

      <section className="panel p-5">
        <ShiftForm shift={shift} workers={workerList} templates={templates} disabled={locked} />
      </section>

      {!locked && (
        <section className="panel grid gap-3 p-5">
          <h2>Sjukdom</h2>
          {shift.status === "planned" ? (
            <form action={setSick} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={shift.id} />
              <input type="hidden" name="sick" value="true" />
              <button type="submit" className="btn btn-danger">
                Markera som sjuk
              </button>
              <span className="text-sm text-ink-soft">Tiden räknas då som sjuktid. Du kan sedan välja ersättare.</span>
            </form>
          ) : (
            <>
              {replacements.length > 0 && (
                <ul className="grid gap-1">
                  {replacements.map((r) => (
                    <li key={r.id}>
                      Ersättare:{" "}
                      <Link href={`/planning/shifts/${r.id}`}>
                        {r.name} {shortTime(r.startTime)}–{shortTime(r.endTime)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <form action={assignReplacement} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={shift.id} />
                <label className="field">
                  {replacements.length ? "Lägg till ytterligare ersättare" : "Välj ersättare"}
                  <select name="replacementUserId" className="input" required defaultValue="">
                    <option value="" disabled>
                      {candidates.length ? "Lediga under passet" : "Ingen är ledig under passet"}
                    </option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn" disabled={!candidates.length}>
                  Sätt in ersättare
                </button>
              </form>
              <form action={setSick}>
                <input type="hidden" name="id" value={shift.id} />
                <input type="hidden" name="sick" value="false" />
                <button type="submit" className="text-sm font-bold text-lake">
                  Ta bort sjukmarkering
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {!locked && (
        <form action={deleteShift}>
          <input type="hidden" name="id" value={shift.id} />
          <button type="submit" className="btn btn-quiet text-lingon">
            Ta bort passet
          </button>
        </form>
      )}

      <section className="grid gap-2">
        <h2>Historik</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-soft">Ingen historik.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {history.map((h, i) => {
              const after = h.after as { startTime?: string; endTime?: string; lunchMinutes?: number } | null;
              return (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-ink-soft">
                    {h.createdAt.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-bold">{ACTION_LABELS[h.action] ?? h.action}</span>
                  {after?.startTime && after.endTime && (
                    <span>
                      {shortTime(after.startTime)}–{shortTime(after.endTime)}, lunch {after.lunchMinutes ?? 0} min
                    </span>
                  )}
                  {h.by && <span className="text-ink-soft">av {h.by}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
