import Link from "next/link";
import { addMonths, monthLabel, upperFirst } from "@/lib/dates";

export function MonthPicker({ basePath, month }: { basePath: string; month: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link className="btn btn-quiet px-3" href={`${basePath}?month=${addMonths(month, -1)}`} aria-label="Föregående månad">
        ‹
      </Link>
      <span className="min-w-36 text-center font-bold">{upperFirst(monthLabel(month))}</span>
      <Link className="btn btn-quiet px-3" href={`${basePath}?month=${addMonths(month, 1)}`} aria-label="Nästa månad">
        ›
      </Link>
    </div>
  );
}
