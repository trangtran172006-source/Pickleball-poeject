import { Suspense } from "react";
import { BookingWizard } from "@/components/features/booking/BookingWizard";

export default function Page() {
  return (
    <Suspense>
      <BookingWizard mode="staff" paths={{ home: "/staff", bookings: "/staff/bookings", pricing: "/staff/pricing" }} />
    </Suspense>
  );
}
