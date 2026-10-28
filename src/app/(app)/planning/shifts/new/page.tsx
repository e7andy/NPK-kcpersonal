import Link from "next/link";
import { Flash } from "@/components/flash";
import { isDateString, startOfWeek, today } from "@/lib/dates";
import { getActiveTemplates, getWorkers, isDateLocked } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { ShiftForm } from "../shift-form";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; date?: string; error?: string }>;
}) {
  await requireRole("planner");
  const sp = await searchParams;
  const date = sp.date && isDateString(sp.date) ? sp.date : today();
  const [workers, templates, locked] = await Promise.all([getWorkers(), getActiveTemplates(), isDateLocked(date)]);
  const first = templates[0];

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Link href={`/planning?week=${startOfWeek(date)}`} className="text-sm">
        Tillbaka till schemat
      </Link>
      <h1>Nytt pass</h1>
      <Flash error={sp.error} />
      {locked && <p className="notice-error">Månaden är godkänd och låst.</p>}
      <div className="panel p-5">
        <ShiftForm
          shift={{
            userId: sp.userId ?? workers[0]?.id ?? "",
            date,
            startTime: first?.startTime ?? "09:00",
            endTime: first?.endTime ?? "17:00",
            lunchMinutes: first?.lunchMinutes ?? 30,
            type: "regular",
            note: null,
          }}
          workers={workers}
          templates={templates}
          disabled={locked}
        />
      </div>
    </div>
  );
}
