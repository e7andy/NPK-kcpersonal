import { Nav, type NavItem } from "@/components/nav";
import { hasRole, requireUser } from "@/lib/session";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NavItem[] = [];
  if (hasRole(user, "worker")) items.push({ href: "/shifts", label: "Mina pass" });
  items.push({ href: "/day", label: "Vem jobbar" });
  if (hasRole(user, "planner")) {
    items.push({ href: "/planning", label: "Schema" });
    items.push({ href: "/reconcile", label: "Månadsavstämning" });
  }
  if (hasRole(user, "payroll")) items.push({ href: "/payroll", label: "Lön" });
  if (hasRole(user, "admin")) {
    items.push({ href: "/admin/users", label: "Personal" });
    items.push({ href: "/admin/templates", label: "Standardpass" });
    items.push({ href: "/admin/holidays", label: "Helgdagar" });
  }

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <a href="/" className="flex items-center gap-2 text-white no-underline">
            <img src="/icon.svg" alt="" width={28} height={28} />
            <span className="font-display text-lg font-bold">kcpersonal</span>
          </a>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <Nav items={items} />
          </div>
          <form action={signOut} className="order-2 ml-auto flex items-center gap-3 sm:order-3">
            <span className="hidden text-sm text-white/75 md:inline">{user.name}</span>
            <button type="submit" className="text-sm font-bold text-white/75 hover:text-white">
              Logga ut
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
