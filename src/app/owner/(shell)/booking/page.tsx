import { Suspense } from "react";
import { BookingWizard } from "@/components/features/booking/BookingWizard";

export default function Page() {
  return (
    <Suspense>
      <BookingWizard mode="staff" paths={{ home: "/owner", bookings: "/owner/bookings", pricing: "/owner/pricing" }} />
    </Suspense>
  );
}
