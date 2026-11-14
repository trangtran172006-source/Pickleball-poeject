import { CustomerBookingDetail } from "@/components/features/history/CustomerBookingDetail";

export default async function Page({ params }: PageProps<"/customer/bookings/[id]">) {
  const { id } = await params;
  return <CustomerBookingDetail id={id} />;
}
