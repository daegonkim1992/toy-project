"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { SimpleSelect } from "@/components/select-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { allCombinations, caseSources, defaultCaseRow, isMatrixMode, toggleMatrixCell, validateCases } from "../cases";
import type { AirflowRequest, CaseRow, SubmissionIssue } from "../model";
import { SectionHeading } from "./form-layout";

function MatrixView({ request, onChange }: { request: AirflowRequest; onChange: (cases: CaseRow[]) => void }) {
  const sources = caseSources(request);
  const fixed = [
    sources.pressures?.length === 1 ? sources.pressures[0].name : null,
    sources.heatExchangers?.length === 1 ? sources.heatExchangers[0].name : null,
    sources.filters?.length === 1 ? sources.filters[0].name : null,
  ].filter(Boolean);
  const selected = (productId: string, operatingId: string) =>
    request.cases.some((row) => row.productId === productId && row.operatingId === operatingId);
  const count = request.cases.filter((row) => row.operatingId).length;

  return (
    <>
      {fixed.length > 0 ? (
        <p className="text-sm text-muted-foreground">{fixed.join(", ")}은(는) 선택지가 하나뿐이라 모든 Case에 자동으로 들어갑니다.</p>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>형상 ↓ &nbsp;운전 조건 →</TableHead>
              {sources.operating.map((o) => (
                <TableHead key={o.id} className="text-center">
                  {o.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.products.map((product, index) => (
              <TableRow key={product.id}>
                <TableCell className="max-w-72">
                  <span className="font-medium">{product.displayName}</span>{" "}
                  <span className="truncate text-muted-foreground">{index === 0 ? "Base" : product.difference}</span>
                </TableCell>
                {sources.operating.map((o) => (
                  <TableCell key={o.id} className="text-center">
                    <Checkbox
                      aria-label={`${product.displayName} + ${o.name}`}
                      checked={selected(product.id, o.id)}
                      onCheckedChange={() => onChange(toggleMatrixCell(request.cases, product.id, o.id, sources))}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(allCombinations(sources))}>
          전부 선택 ({sources.products.length * sources.operating.length}개)
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange([])}>
          모두 해제
        </Button>
        <span className="text-sm text-muted-foreground">선택한 Case {count}개</span>
      </div>
    </>
  );
}

function TableView({ request, onChange }: { request: AirflowRequest; onChange: (cases: CaseRow[]) => void }) {
  const sources = caseSources(request);
  const setRow = (id: string, patch: Partial<CaseRow>) => onChange(request.cases.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const combinations = allCombinations(sources).length;
  const optional = [
    { key: "pressureId", label: "공간 압력", list: sources.pressures },
    { key: "heatExchangerId", label: "열교환기", list: sources.heatExchangers },
    { key: "filterId", label: "필터", list: sources.filters },
  ] as const;

  return (
    <>
      <p className="text-sm text-muted-foreground">선택지가 둘 이상인 조건이 있어 조합을 표로 고릅니다.</p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Case</TableHead>
              <TableHead>형상</TableHead>
              <TableHead>운전 조건</TableHead>
              {optional.map((c) => (c.list ? <TableHead key={c.key}>{c.label}</TableHead> : null))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.cases.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <SimpleSelect
                    ariaLabel={`Case ${index + 1} 형상`}
                    value={row.productId}
                    className="h-8 w-full"
                    onChange={(v) => setRow(row.id, { productId: v })}
                    options={sources.products.map((p) => ({ value: p.id, label: p.displayName }))}
                  />
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    ariaLabel={`Case ${index + 1} 운전 조건`}
                    value={row.operatingId}
                    className="h-8 w-full"
                    onChange={(v) => setRow(row.id, { operatingId: v })}
                    options={sources.operating.map((o) => ({ value: o.id, label: o.name }))}
                  />
                </TableCell>
                {optional.map((c) =>
                  c.list ? (
                    <TableCell key={c.key}>
                      <SimpleSelect
                        ariaLabel={`Case ${index + 1} ${c.label}`}
                        value={row[c.key]}
                        className="h-8 w-full"
                        onChange={(v) => setRow(row.id, { [c.key]: v })}
                        options={c.list.map((item) => ({ value: item.id, label: item.name }))}
                      />
                    </TableCell>
                  ) : null,
                )}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Case ${index + 1} 삭제`}
                    disabled={request.cases.length <= 1}
                    onClick={() => onChange(request.cases.filter((r) => r.id !== row.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange([...request.cases, { ...defaultCaseRow(""), id: crypto.randomUUID() }])}>
          <PlusIcon /> Case 추가
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange(allCombinations(sources))}>
          전부 조합 ({combinations}개)
        </Button>
        <span className="text-sm text-muted-foreground">Case {request.cases.length}개</span>
      </div>
    </>
  );
}

export function CasesStep({
  request,
  issues,
  onChange,
  onConfirm,
}: {
  request: AirflowRequest;
  issues: SubmissionIssue[];
  onChange: (cases: CaseRow[]) => void;
  onConfirm: () => void;
}) {
  const sources = caseSources(request);
  const live = validateCases(request.cases, sources);
  const shown = issues.length > 0 ? issues : live;

  return (
    <section aria-label="Case 구성" className="flex flex-col gap-4">
      <SectionHeading
        title="Case"
        aside="해석할 형상과 조건의 조합"
        help="모든 조건을 자동으로 곱하지 않고 필요한 조합만 고릅니다. 입력한 형상과 조건은 최소 한 Case에서 쓰여야 합니다. 형상이나 조건을 바꾸면 Case 구성을 다시 확인해야 제출할 수 있습니다."
      />
      {isMatrixMode(sources) ? <MatrixView request={request} onChange={onChange} /> : <TableView request={request} onChange={onChange} />}
      {shown.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc pl-4">
              {shown.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onConfirm} disabled={live.length > 0}>
          Case 구성 확인
        </Button>
        {request.casesConfirmed ? (
          <Badge variant="secondary">Case 구성이 확인되었습니다</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">제품이나 조건을 바꾸면 다시 확인해야 합니다.</span>
        )}
      </div>
    </section>
  );
}
