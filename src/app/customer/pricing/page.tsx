import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui/Card";
import { PricingTable } from "@/components/features/booking/PricingTable";

export default async function Page() {
  const t = await getTranslations("courts");
  return (
    <>
      <PageTitle title={t("pricingTitle")} />
      <PricingTable />
    </>
  );
}
