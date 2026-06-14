import { redirect } from "next/navigation";

export default function BookingsIndexPage() {
  redirect("/bookings/calendar");
}
