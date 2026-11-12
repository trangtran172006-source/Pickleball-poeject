import { RefundDetail } from "@/components/features/owner/RefundDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RefundDetail id={id} />;
}
