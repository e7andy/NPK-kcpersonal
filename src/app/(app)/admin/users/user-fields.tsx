import type { Role, User } from "@/db/schema";

const ROLE_LABELS: { role: Role; label: string; help: string }[] = [
  { role: "worker", label: "Sommarjobbare", help: "Kan schemaläggas och ser sina pass" },
  { role: "planner", label: "Planerare", help: "Lägger schemat och godkänner månaden" },
  { role: "payroll", label: "Lön", help: "Ser godkända månader och exporterar" },
  { role: "admin", label: "Admin", help: "Personal, standardpass och helgdagar" },
];

export function roleLabel(role: Role): string {
  return ROLE_LABELS.find((r) => r.role === role)?.label ?? role;
}

export function UserFields({ user }: { user?: Partial<User> }) {
  return (
    <>
      <label className="field">
        Namn
        <input name="name" className="input" defaultValue={user?.name} required />
      </label>
      <label className="field">
        E-post
        <input name="email" type="email" className="input" defaultValue={user?.email} required />
      </label>
      <label className="field">
        Telefon
        <input name="phone" type="tel" className="input" defaultValue={user?.phone ?? ""} />
      </label>
      <label className="field">
        Anställningsnummer i Fortnox
        <input name="fortnoxEmployeeId" className="input" defaultValue={user?.fortnoxEmployeeId ?? ""} />
      </label>
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-bold">Roller</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_LABELS.map((r) => (
            <label key={r.role} className="flex items-start gap-2 rounded border border-line p-2">
              <input
                type="checkbox"
                name="roles"
                value={r.role}
                defaultChecked={user ? user.roles?.includes(r.role) : r.role === "worker"}
                className="mt-1"
              />
              <span>
                <span className="font-bold">{r.label}</span>
                <span className="block text-sm text-ink-soft">{r.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
