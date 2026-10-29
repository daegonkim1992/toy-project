"use client";

import { CircleHelpIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { AirflowRequest, StepKey, SubmissionIssue } from "../model";
import { validateSubmission } from "../request";

/** 제목 줄. 긴 안내는 도움말 아이콘을 눌러야 펼쳐진다. */
export function SectionHeading({
  title,
  help,
  aside,
  level = 2,
}: {
  title: string;
  help?: ReactNode;
  aside?: ReactNode;
  level?: 2 | 3;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Heading className={level === 2 ? "font-heading text-lg font-medium" : "font-heading text-base font-semibold"}>{title}</Heading>
          {help ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${title} 도움말`}
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen(!open)}
            >
              <CircleHelpIcon />
            </Button>
          ) : null}
        </div>
        {aside ? <div className="text-sm text-muted-foreground">{aside}</div> : null}
      </div>
      {help && open ? (
        <p id={id} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** 선택 조건의 제목 줄. 있음·없음을 고르고, 고르지 않았으면 "선택 필요"를 보인다. */
export function ConditionHeading({
  title,
  value,
  noneNote,
  onChange,
}: {
  title: string;
  value: "" | "use" | "none";
  noneNote: string;
  onChange: (value: "use" | "none") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="min-w-24 font-heading text-lg font-medium">{title}</h2>
      <div
        role="group"
        aria-label={`${title} 사용 여부`}
        className={`inline-flex overflow-hidden rounded-md border ${value === "" ? "ring-2 ring-destructive/40" : ""}`}
      >
        {(["use", "none"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`px-3.5 py-1.5 text-sm transition-colors first:border-r ${value === option ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          >
            {option === "use" ? "있음" : "없음"}
          </button>
        ))}
      </div>
      {value === "" ? <span className="text-sm font-medium text-destructive">선택 필요</span> : null}
      {value === "none" ? <span className="text-sm text-muted-foreground">{noneNote}</span> : null}
    </div>
  );
}

/** 표 칸 안의 입력. 표 머리글이 라벨을 대신하므로 aria-label을 꼭 받는다. */
export function CellInput({
  label,
  value,
  onChange,
  type = "text",
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  className?: string;
  placeholder?: string;
}) {
  return (
    <Input
      aria-label={label}
      type={type}
      value={value}
      placeholder={placeholder}
      className={`h-8 ${className ?? ""}`}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export type StepStatus = { kind: "done" | "todo"; label: string; issues: SubmissionIssue[] };

/** 단계 버튼과 최종 검토가 같은 목록을 쓰도록 제출 조건을 단계별로 나눈다. */
export function stepStatuses(request: AirflowRequest): Record<Exclude<StepKey, "review">, StepStatus> {
  const issues = validateSubmission(request);
  const of = (step: StepKey) => issues.filter((issue) => issue.step === step);
  const status = (step: StepKey): StepStatus => {
    const list = of(step);
    if (list.length === 0) return { kind: "done", label: "✓", issues: list };
    if (step === "target") return { kind: "todo", label: "확정 필요", issues: list };
    if (step === "cases" && list.length === 1 && list[0].message === "Case 구성을 확인해야 합니다.") {
      return { kind: "todo", label: "확인 필요", issues: list };
    }
    return { kind: "todo", label: `${list.length}개 남음`, issues: list };
  };
  return {
    target: status("target"),
    info: status("info"),
    products: status("products"),
    operating: status("operating"),
    cases: status("cases"),
  };
}
