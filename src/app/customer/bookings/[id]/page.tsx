import { BookingDetailView } from "@/components/features/history/BookingDetailView";

export default async function Page({ params }: PageProps<"/customer/bookings/[id]">) {
  const { id } = await params;
  return <BookingDetailView id={id} />;
}
