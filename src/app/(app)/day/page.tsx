import { redirect } from "next/navigation";
import { today } from "@/lib/dates";

export default function DayIndex() {
  redirect(`/day/${today()}`);
}
