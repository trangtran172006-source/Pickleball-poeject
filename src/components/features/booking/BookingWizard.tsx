"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/ui/Card";
import { SkeletonRows } from "@/components/ui/States";
import { Stepper } from "@/components/ui/Stepper";
import { useSessionState } from "@/lib/sessionStore";
import { StepDone } from "./StepDone";
import { StepInfo } from "./StepInfo";
import { StepPayment } from "./StepPayment";
import { StepSchedule } from "./StepSchedule";
import { initialWizard, type WizardMode, type WizardPaths, type WizardState } from "./types";

type Props = { mode: WizardMode; paths: WizardPaths };

/**
 * The 4-step booking flow (UC_2.1) shared by customers, staff and the owner.
 * Progress is kept in sessionStorage, so a reload or a language switch does
 * not lose the selected slots or the running payment hold.
 */
export function BookingWizard({ mode, paths }: Props) {
  const t = useTranslations("booking");
  const tp = useTranslations("payment");
  const params = useSearchParams();
  const [stored, setState, clear] = useSessionState<WizardState>(`ph.booking.${mode}`, initialWizard);
  const update = useCallback((patch: Partial<WizardState>) => setState((current) => ({ ...current, ...patch })), [setState]);
  const applied = useRef(false);

  // A suggested time on the home page deep-links to that day.
  useEffect(() => {
    const date = params.get("date");
    if (applied.current || !stored || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    applied.current = true;
    if (stored.step === 0 && stored.date !== date) update({ date, range: null, selection: null, bandId: null });
  }, [params, stored, update]);

  // Leaving the finished screen starts a fresh flow next time.
  const finished = stored?.step === 3;
  useEffect(() => () => void (finished && clear()), [finished, clear]);

  if (!stored) return <SkeletonRows rows={5} />;
  // Guard against inconsistent restored state.
  const state: WizardState =
    (stored.step === 1 && !stored.selection) || (stored.step === 2 && !stored.hold) || (stored.step === 3 && !stored.done) ? { ...stored, step: 0 } : stored;
  const titles = [t("stepDate"), t("stepInfo"), tp("title"), t("doneTitle")];
  const props = { mode, paths, state, update };

  return (
    <div>
      <PageTitle title={titles[state.step]} />
      <div className="mb-5">
        <Stepper steps={[t("stepDate"), t("stepInfo"), t("stepPay"), t("stepDone")]} current={state.step === 3 ? 4 : state.step} />
      </div>
      {state.step === 0 && <StepSchedule {...props} />}
      {state.step === 1 && <StepInfo {...props} />}
      {state.step === 2 && <StepPayment {...props} />}
      {state.step === 3 && <StepDone {...props} />}
    </div>
  );
}
