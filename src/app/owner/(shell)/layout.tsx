"use client";

import type { ReactNode } from "react";
import { BackofficeLayout } from "@/layouts/BackofficeLayout";
import { ownerMenu } from "@/layouts/ownerMenu";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <BackofficeLayout role="owner" base="/owner" menu={ownerMenu}>
      {children}
    </BackofficeLayout>
  );
}
