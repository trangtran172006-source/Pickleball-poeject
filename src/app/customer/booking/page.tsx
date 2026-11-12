import { Suspense } from "react";
import { BookingWizard } from "@/components/features/booking/BookingWizard";

export default function Page() {
  return (
    <Suspense>
      <BookingWizard mode="customer" paths={{ home: "/customer", bookings: "/customer/bookings", pricing: "/customer/pricing" }} />
    </Suspense>
  );
}
