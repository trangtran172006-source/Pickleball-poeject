import type { BookingDetail, Hold } from "@/shared/types";
import type { Range } from "./CourtGrid";
import type { Selection } from "./BookingSummaryCard";

export type BookerForm = { fullName: string; phone: string; email: string; note: string; agreed: boolean };

export type WizardState = {
  step: 0 | 1 | 2 | 3;
  date: string | null;
  bandId: string | null;
  range: Range;
  selection: Selection;
  form: BookerForm | null;
  hold: Hold | null;
  done: BookingDetail | null;
};

export const initialWizard: WizardState = { step: 0, date: null, bandId: null, range: null, selection: null, form: null, hold: null, done: null };

export type WizardMode = "customer" | "staff";
export type WizardPaths = { home: string; bookings: string; pricing: string };
export type StepProps = {
  mode: WizardMode;
  paths: WizardPaths;
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
};
