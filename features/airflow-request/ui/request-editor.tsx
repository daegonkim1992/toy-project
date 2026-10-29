"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { AirflowRequest, StepKey, SubmissionIssue } from "../model";
import { validateSubmission, type RequestPatch } from "../request";
import { CasesStep } from "./cases-step";
import { InfoStep } from "./info-step";
import { OperatingStep } from "./operating-step";
import { ProductsStep } from "./products-step";
import { RequestSummary } from "./request-summary";
import { TargetStep } from "./target-step";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "target", label: "의뢰 대상" },
  { key: "info", label: "의뢰 내용" },
  { key: "products", label: "해석 제품" },
  { key: "operating", label: "운전 조건" },
  { key: "cases", label: "Case" },
  { key: "review", label: "최종 검토" },
];

export function RequestEditor({
  request,
  onEdit,
  onLock,
  onConfirmCases,
  onSubmit,
}: {
  request: AirflowRequest;
  onEdit: (patch: RequestPatch) => void;
  onLock: () => string;
  onConfirmCases: () => SubmissionIssue[];
  onSubmit: () => SubmissionIssue[];
}) {
  const [step, setStep] = useState<StepKey>("target");
  const [lockMessage, setLockMessage] = useState("");
  const [caseIssues, setCaseIssues] = useState<SubmissionIssue[]>([]);
  const [submitIssues, setSubmitIssues] = useState<SubmissionIssue[]>([]);
  const locked = request.target.locked;
  const issues = validateSubmission(request);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          풍량 해석 의뢰서 {request.requestNo ? `· ${request.requestNo}` : ""}
        </h1>
        <span className="text-sm text-muted-foreground">입력한 내용은 자동으로 저장됩니다.</span>
      </div>

      <nav aria-label="작성 단계" className="flex flex-wrap gap-2">
        {STEPS.map(({ key, label }, index) => (
          <Button
            key={key}
            variant={step === key ? "default" : "outline"}
            size="sm"
            disabled={!locked && key !== "target"}
            aria-current={step === key ? "step" : undefined}
            onClick={() => setStep(key)}
          >
            {index + 1}. {label}
          </Button>
        ))}
      </nav>

      <section aria-label={STEPS.find((s) => s.key === step)?.label}>
        {step === "target" ? (
          <TargetStep
            request={request}
            lockMessage={lockMessage}
            onChangeTarget={(target) => onEdit({ target })}
            onLock={() => {
              const message = onLock();
              setLockMessage(message);
              if (message === "") setStep("info");
            }}
          />
        ) : null}
        {step === "info" ? <InfoStep request={request} onChange={(info) => onEdit({ info })} /> : null}
        {step === "products" ? (
          <ProductsStep request={request} onChange={(base, comparisons) => onEdit({ base, comparisons })} />
        ) : null}
        {step === "operating" ? <OperatingStep request={request} onChange={(operating) => onEdit({ operating })} /> : null}
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
        {step === "review" ? (
          <div className="flex flex-col gap-6">
            {issues.length > 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="mb-2 font-medium">제출하려면 아래 항목을 고쳐야 합니다.</p>
                  <ul className="flex flex-col gap-1">
                    {issues.map((issue) => (
                      <li key={`${issue.step}-${issue.message}`} className="flex flex-wrap items-center gap-2">
                        <span>{issue.message}</span>
                        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setStep(issue.step)}>
                          {STEPS.find((s) => s.key === issue.step)?.label} 단계로 이동
                        </Button>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription>모든 제출 조건을 충족했습니다.</AlertDescription>
              </Alert>
            )}
            {submitIssues.length > 0 ? (
              <Alert variant="destructive">
                <AlertDescription>제출하지 못했습니다: {submitIssues[0].message}</AlertDescription>
              </Alert>
            ) : null}
            <div>
              <Button disabled={issues.length > 0} onClick={() => setSubmitIssues(onSubmit())}>
                제출
              </Button>
            </div>
            <RequestSummary request={request} />
          </div>
        ) : null}
      </section>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={step === "target"}
          onClick={() => setStep(STEPS[Math.max(0, STEPS.findIndex((s) => s.key === step) - 1)].key)}
        >
          이전
        </Button>
        <Button
          variant="outline"
          disabled={step === "review" || !locked}
          onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((s) => s.key === step) + 1)].key)}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
