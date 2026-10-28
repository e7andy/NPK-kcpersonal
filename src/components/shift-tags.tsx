import type { ShiftRow } from "@/lib/schedule";

/** Small text tags for trust-time, sick and replacement shifts. */
export function ShiftTags({ shift }: { shift: Pick<ShiftRow, "type" | "status" | "replacesShiftId"> }) {
  return (
    <>
      {shift.status === "sick" && (
        <span className="rounded bg-lingon-wash px-1.5 py-0.5 text-xs font-bold text-lingon">Sjuk</span>
      )}
      {shift.type === "trust" && (
        <span className="rounded bg-reed-wash px-1.5 py-0.5 text-xs font-bold text-reed">Förtroendetid</span>
      )}
      {shift.replacesShiftId && (
        <span className="rounded bg-lake-wash px-1.5 py-0.5 text-xs font-bold text-lake-deep">Ersättare</span>
      )}
    </>
  );
}
