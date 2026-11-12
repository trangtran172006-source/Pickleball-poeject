import { CustomerLayout } from "@/layouts/CustomerLayout";

export default function Layout({ children }: LayoutProps<"/customer">) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
