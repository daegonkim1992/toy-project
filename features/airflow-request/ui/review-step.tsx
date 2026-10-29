"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AirflowRequest, StepKey } from "../model";
import { findPmsProject } from "../reference-data";
import type { StepStatus } from "./form-layout";

type Statuses = Record<Exclude<StepKey, "review">, StepStatus>;

function StepCard({
  title,
  status,
  rows,
  onEdit,
}: {
  title: string;
  status: StepStatus;
  rows: [string, string][];
  onEdit: () => void;
}) {
  const todo = status.kind === "todo";
  return (
    <Card className={todo ? "ring-destructive/40" : undefined} size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="flex items-center gap-2">
          {todo ? <Badge variant="destructive">{status.label}</Badge> : <Badge variant="secondary">완료</Badge>}
          <Button variant="link" size="sm" onClick={onEdit} aria-label={`${title} 수정`}>
            수정
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {todo ? (
          <ul className="list-disc pl-4 text-sm text-destructive">
            {status.issues.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words">{value || "-"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function ReviewStep({
  request,
  statuses,
  onEditStep,
}: {
  request: AirflowRequest;
  statuses: Statuses;
  onEditStep: (step: StepKey) => void;
}) {
  const { target, info, conditions } = request;
  const remaining = Object.values(statuses).reduce((n, s) => n + s.issues.length, 0);
  const project = findPmsProject(info.pmsProjectId);
  const caseCount = request.cases.filter((row) => row.operatingId).length;
  const optionalText = (state: string, count: number) => (state === "use" ? `${count}개` : state === "none" ? "없음" : "선택 전");

  return (
    <section aria-label="제출 전 검토" className="flex flex-col gap-4">
      {remaining > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>제출하려면 {remaining}개 항목을 더 채워야 합니다. 각 카드의 수정을 눌러 해당 단계로 이동합니다.</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertDescription>모든 제출 조건을 충족했습니다.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <StepCard
          title="의뢰 대상"
          status={statuses.target}
          onEdit={() => onEditStep("target")}
          rows={[
            ["제품 분류", [target.division, target.lineup, target.platform, target.chassis].filter(Boolean).join(" › ")],
            ["해석유형", "풍량"],
          ]}
        />
        <StepCard
          title="의뢰 내용"
          status={statuses.info}
          onEdit={() => onEditStep("info")}
          rows={[
            ["의뢰자", `${info.requesterName} · ${info.rank}`],
            ["의뢰 유형", project ? `${info.requestType} · ${project.name}` : info.requestType],
            ["모델명", info.modelSuffix],
            ["희망 완료일", info.desiredDate],
          ]}
        />
        <StepCard
          title="해석 제품"
          status={statuses.products}
          onEdit={() => onEditStep("products")}
          rows={[
            ["형상", `${request.comparisons.length + 1}개 (Base 1, 비교 ${request.comparisons.length})`],
            ["Base", request.base.drawingNo],
            ...request.comparisons.slice(0, 3).map((c): [string, string] => [c.displayName, c.difference]),
          ]}
        />
        <StepCard
          title="해석조건"
          status={statuses.operating}
          onEdit={() => onEditStep("operating")}
          rows={[
            ["운전 조건", request.operating.map((o) => o.name).join(", ")],
            ["공간 압력", optionalText(conditions.spacePressure.state, conditions.spacePressure.packages.length)],
            ["열교환기", optionalText(conditions.heatExchanger.state, conditions.heatExchanger.packages.length)],
            ["필터", conditions.filter.enabled ? `${conditions.filter.packages.length}개` : "없음"],
          ]}
        />
        <StepCard
          title="Case"
          status={statuses.cases}
          onEdit={() => onEditStep("cases")}
          rows={[
            ["Case 수", `${caseCount}개`],
            ["확인", request.casesConfirmed ? "확인됨" : "확인 전"],
          ]}
        />
      </div>
    </section>
  );
}
