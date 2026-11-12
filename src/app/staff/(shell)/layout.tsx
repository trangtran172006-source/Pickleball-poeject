"use client";

import type { ReactNode } from "react";
import { BackofficeLayout } from "@/layouts/BackofficeLayout";
import { staffMenu } from "@/layouts/staffMenu";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <BackofficeLayout role="staff" base="/staff" menu={staffMenu}>
      {children}
    </BackofficeLayout>
  );
}
