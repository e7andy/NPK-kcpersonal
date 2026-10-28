import { NextResponse } from "next/server";
import { isMonthString } from "@/lib/dates";
import { toCsv, toXlsx } from "@/lib/payroll-export";
import { buildPayroll, getMonthStatus } from "@/lib/schedule";
import { getCurrentUser, hasRole } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ month: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "payroll")) return new NextResponse("Forbidden", { status: 403 });

  const { month } = await params;
  if (!isMonthString(month)) return new NextResponse("Not found", { status: 404 });
  if (!(await getMonthStatus(month)).locked) {
    return new NextResponse("Month is not approved", { status: 409 });
  }

  const people = await buildPayroll(month);
  const format = new URL(request.url).searchParams.get("format");
  const filename = `kcpersonal-lon-${month}`;

  if (format === "csv") {
    return new NextResponse(toCsv(people), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const body = await toXlsx(people, month);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
