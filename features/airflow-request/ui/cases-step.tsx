"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { SimpleSelect } from "@/components/select-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { caseSources, defaultCaseRow } from "../cases";
import type { AirflowRequest, CaseRow, SubmissionIssue } from "../model";

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
  const products = sources.products;
  const setRow = (id: string, patch: Partial<CaseRow>) => onChange(request.cases.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        해석할 형상과 운전 조건의 조합을 직접 정합니다. 형상마다 기본 1행이 있고, 필요한 조합만 추가합니다.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Case</TableHead>
            <TableHead>형상</TableHead>
            <TableHead>운전 조건</TableHead>
            {sources.pressures ? <TableHead>공간 압력</TableHead> : null}
            {sources.heatExchangers ? <TableHead>열교환기</TableHead> : null}
            {sources.filters ? <TableHead>필터</TableHead> : null}
            <TableHead className="w-24" />
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
                  onChange={(v) => setRow(row.id, { productId: v })}
                  options={products.map((p) => ({ value: p.id, label: p.displayName }))}
                />
              </TableCell>
              <TableCell>
                <SimpleSelect
                  ariaLabel={`Case ${index + 1} 운전 조건`}
                  value={row.operatingId}
                  onChange={(v) => setRow(row.id, { operatingId: v })}
                  options={request.operating.map((o) => ({ value: o.id, label: o.name }))}
                  placeholder={request.operating.length === 0 ? "운전 조건을 먼저 입력하세요" : "선택"}
                />
              </TableCell>
              {sources.pressures ? (
                <TableCell>
                  <SimpleSelect
                    ariaLabel={`Case ${index + 1} 공간 압력`}
                    value={row.pressureId}
                    onChange={(v) => setRow(row.id, { pressureId: v })}
                    options={sources.pressures.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </TableCell>
              ) : null}
              {sources.heatExchangers ? (
                <TableCell>
                  <SimpleSelect
                    ariaLabel={`Case ${index + 1} 열교환기`}
                    value={row.heatExchangerId}
                    onChange={(v) => setRow(row.id, { heatExchangerId: v })}
                    options={sources.heatExchangers.map((h) => ({ value: h.id, label: h.name }))}
                  />
                </TableCell>
              ) : null}
              {sources.filters ? (
                <TableCell>
                  <SimpleSelect
                    ariaLabel={`Case ${index + 1} 필터`}
                    value={row.filterId}
                    onChange={(v) => setRow(row.id, { filterId: v })}
                    options={sources.filters.map((f) => ({ value: f.id, label: f.name }))}
                  />
                </TableCell>
              ) : null}
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
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
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => onChange([...request.cases, { ...defaultCaseRow(""), id: crypto.randomUUID() }])}
        >
          <PlusIcon /> Case 추가
        </Button>
        <Button onClick={onConfirm}>Case 구성 확인</Button>
      </div>
      {issues.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc pl-4">
              {issues.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {request.casesConfirmed ? (
        <Alert>
          <AlertDescription>Case 구성이 확인되었습니다.</AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">제품이나 조건을 바꾸면 Case 구성을 다시 확인해야 제출할 수 있습니다.</p>
      )}
    </div>
  );
}
