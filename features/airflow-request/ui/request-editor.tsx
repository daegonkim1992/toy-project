"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { AirflowRequest, HistoryEvent, StepKey, SubmissionIssue } from "../model";
import type { RequestPatch } from "../request";
import { REVIEW_REASONS } from "../review";
import { CasesStep } from "./cases-step";
import { ConditionsStep } from "./conditions-step";
import { stepStatuses } from "./form-layout";
import { InfoStep } from "./info-step";
import { ProductsStep } from "./products-step";
import { ReviewStep } from "./review-step";
import { CancelAction } from "./review-actions";
import { TargetStep } from "./target-step";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "target", label: "의뢰 대상" },
  { key: "info", label: "의뢰 내용" },
  { key: "products", label: "해석 제품" },
  { key: "operating", label: "해석조건" },
  { key: "cases", label: "Case" },
  { key: "review", label: "최종 검토" },
];

export function RequestEditor({
  request,
  revisionNote,
  onCancel,
  onEdit,
  onLock,
  onConfirmCases,
  onSubmit,
}: {
  request: AirflowRequest;
  revisionNote?: HistoryEvent;
  onCancel: () => string;
  onEdit: (patch: RequestPatch) => void;
  onLock: () => string;
  onConfirmCases: () => SubmissionIssue[];
  onSubmit: () => SubmissionIssue[];
}) {
  const [step, setStep] = useState<StepKey>(request.target.locked ? "info" : "target");
  const [lockMessage, setLockMessage] = useState("");
  const [caseIssues, setCaseIssues] = useState<SubmissionIssue[]>([]);
  const [submitIssues, setSubmitIssues] = useState<SubmissionIssue[]>([]);
  const locked = request.target.locked;
  const statuses = stepStatuses(request);
  const index = STEPS.findIndex((s) => s.key === step);
  const previous = STEPS[index - 1];
  const next = STEPS[index + 1];
  const blocking = Object.values(statuses).some((s) => s.kind === "todo");
  const go = (key: StepKey) => {
    setStep(key);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          풍량 해석 의뢰서 {request.requestNo ? `· ${request.requestNo}` : ""}
        </h1>
        <span className="text-sm text-muted-foreground">입력한 내용은 자동으로 저장됩니다.</span>
      </div>

      {revisionNote ? (
        <Alert>
          <AlertDescription>
            <p className="font-medium">
              보완 요청: {REVIEW_REASONS.find((r) => r.code === revisionNote.reasonCode)?.label ?? "기타"}
            </p>
            <p className="whitespace-pre-wrap">{revisionNote.note}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <nav aria-label="작성 단계" className="flex flex-wrap gap-2">
        {STEPS.map(({ key, label }, i) => {
          const status = key === "review" ? undefined : statuses[key];
          return (
            <Button
              key={key}
              variant={step === key ? "default" : "outline"}
              size="sm"
              disabled={!locked && key !== "target"}
              aria-current={step === key ? "step" : undefined}
              onClick={() => go(key)}
            >
              {i + 1}. {label}
              {status ? (
                status.kind === "done" ? (
                  <span aria-label="완료">✓</span>
                ) : (
                  <Badge variant="destructive" className={step === key ? "bg-background text-destructive" : undefined}>
                    {status.label}
                  </Badge>
                )
              ) : null}
            </Button>
          );
        })}
      </nav>

      <section aria-label={STEPS[index].label} className="flex flex-col gap-6">
        {step === "target" ? (
          <TargetStep
            request={request}
            lockMessage={lockMessage}
            onChangeTarget={(target) => onEdit({ target })}
            onLock={() => {
              const message = onLock();
              setLockMessage(message);
              if (message === "") go("info");
            }}
          />
        ) : null}
        {step === "info" ? <InfoStep request={request} onChange={(info) => onEdit({ info })} /> : null}
        {step === "products" ? (
          <ProductsStep request={request} onChange={(base, comparisons) => onEdit({ base, comparisons })} />
        ) : null}
        {step === "operating" ? (
          <ConditionsStep
            request={request}
            onOperatingChange={(operating) => onEdit({ operating })}
            onConditionsChange={(conditions) => onEdit({ conditions })}
          />
        ) : null}
        {step === "cases" ? (
          <CasesStep
            request={request}
            issues={caseIssues}
            onChange={(cases) => {
              setCaseIssues([]);
              onEdit({ cases });
            }}
            onConfirm={() => setCaseIssues(onConfirmCases())}
          />
        ) : null}
        {step === "review" ? <ReviewStep request={request} statuses={statuses} onEditStep={go} /> : null}
      </section>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t bg-background py-3">
        {submitIssues.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>제출하지 못했습니다: {submitIssues[0].message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CancelAction onCancel={onCancel} compact />
          <div className="flex gap-2">
            {previous ? (
              <Button variant="outline" onClick={() => go(previous.key)}>
                이전
              </Button>
            ) : null}
            {next ? (
              <Button disabled={!locked} onClick={() => go(next.key)}>
                다음: {next.label}
              </Button>
            ) : (
              <Button disabled={blocking} onClick={() => setSubmitIssues(onSubmit())}>
                {request.status === "revision_needed" ? "재제출" : "제출"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
