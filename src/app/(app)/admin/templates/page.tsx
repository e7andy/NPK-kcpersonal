import { asc } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { shiftTemplates, type ShiftTemplate } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { formatDuration, paidMinutes } from "@/lib/time";
import { saveTemplate } from "../actions";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const templates = await db
    .select()
    .from(shiftTemplates)
    .orderBy(asc(shiftTemplates.sortOrder), asc(shiftTemplates.startTime));

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <div>
        <h1>Standardpass</h1>
        <p className="text-ink-soft">
          Planeraren väljer bland aktiva standardpass i schemat. Tider och lunch kan sedan justeras per pass.
        </p>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="grid gap-3">
        {templates.map((t) => (
          <TemplateForm key={t.id} template={t} />
        ))}
      </div>
      <div className="grid gap-2">
        <h2>Nytt standardpass</h2>
        <TemplateForm />
      </div>
    </div>
  );
}

function TemplateForm({ template }: { template?: ShiftTemplate }) {
  return (
    <form
      action={saveTemplate}
      className={`panel grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_0.7fr_auto_auto] ${
        template && !template.active ? "opacity-60" : ""
      }`}
    >
      {template && <input type="hidden" name="id" value={template.id} />}
      <label className="field col-span-2 sm:col-span-1">
        Namn
        <input name="name" className="input" defaultValue={template?.name} required />
      </label>
      <label className="field">
        Start
        <input name="startTime" type="time" className="input" defaultValue={template?.startTime.slice(0, 5) ?? "09:00"} required />
      </label>
      <label className="field">
        Slut
        <input name="endTime" type="time" className="input" defaultValue={template?.endTime.slice(0, 5) ?? "17:00"} required />
      </label>
      <label className="field">
        Lunch (min)
        <input name="lunchMinutes" type="number" min={0} step={5} className="input" defaultValue={template?.lunchMinutes ?? 30} required />
      </label>
      <label className="field">
        Ordning
        <input name="sortOrder" type="number" className="input" defaultValue={template?.sortOrder ?? 0} />
      </label>
      {template ? (
        <label className="flex min-h-10 items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="active" defaultChecked={template.active} /> Aktiv
        </label>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-quiet">{template ? "Spara" : "Lägg till"}</button>
      </div>
      {template && (
        <p className="col-span-full text-sm text-ink-soft">Arbetstid {formatDuration(paidMinutes(template))}</p>
      )}
    </form>
  );
}
