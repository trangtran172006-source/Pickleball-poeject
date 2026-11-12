import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui/Card";
import { PricingTable } from "@/components/features/booking/PricingTable";

export default async function Page() {
  const t = await getTranslations("courts");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageTitle
        title={t("pricingTitle")}
        action={
          <Link href="/staff/booking" className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-xs font-semibold text-brand hover:bg-page">
            ← {tn("booking")}
          </Link>
        }
      />
      <PricingTable />
    </>
  );
}
