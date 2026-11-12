import { BookingHistory } from "@/components/features/history/BookingHistory";

export default function Page() {
  return <BookingHistory variant="staff" detailBase="/staff/bookings" backHref="/staff/booking" />;
}
