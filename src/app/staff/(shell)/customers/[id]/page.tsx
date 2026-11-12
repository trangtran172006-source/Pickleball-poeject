import { CustomerDetail } from "@/components/features/customers/CustomerDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail base="/staff" id={id} />;
}
