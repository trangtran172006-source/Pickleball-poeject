import { ReschedulePick } from "@/components/features/reschedule/ReschedulePick";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReschedulePick base="/staff" id={id} />;
}
