import type { BookingDetail, Hold } from "@/shared/types";
import type { SlotRange } from "./CourtGrid";
import type { SelectionItem } from "./BookingSummaryCard";

export type BookerForm = { fullName: string; phone: string; email: string; note: string; agreed: boolean };

export type WizardState = {
  step: 0 | 1 | 2 | 3;
  date: string | null;
  bandId: string | null;
  ranges: SlotRange[];
  selections: SelectionItem[];
  form: BookerForm | null;
  hold: Hold | null;
  done: BookingDetail | null;
};

export const initialWizard: WizardState = { step: 0, date: null, bandId: null, ranges: [], selections: [], form: null, hold: null, done: null };

export type WizardMode = "customer" | "staff";
export type WizardPaths = { home: string; bookings: string; pricing: string };
export type StepProps = {
  mode: WizardMode;
  paths: WizardPaths;
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
};
