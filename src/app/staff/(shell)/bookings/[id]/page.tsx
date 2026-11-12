import { StaffBookingDetail } from "@/components/features/history/StaffBookingDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffBookingDetail base="/staff" id={id} />;
}
