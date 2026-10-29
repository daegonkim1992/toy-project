"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { AirflowRequest, Product } from "../model";
import { CellInput, SectionHeading } from "./form-layout";

export function ProductsStep({
  request,
  onChange,
}: {
  request: AirflowRequest;
  onChange: (base: Product, comparisons: Product[]) => void;
}) {
  const { base, comparisons } = request;
  const setComparison = (id: string, patch: Partial<Product>) =>
    onChange(base, comparisons.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <section aria-label="해석 제품 목록" className="flex flex-col gap-4">
      <SectionHeading
        title="해석 제품"
        aside={`${comparisons.length + 1}개 형상 · Base 1개, 비교 ${comparisons.length}개`}
        help="해석에 쓸 총조립 형상을 등록합니다. 부품의 각도, 위치, 배치가 다르면 다른 총조립 형상이므로 도면번호도 달라야 합니다. 단품 도면은 쓸 수 없습니다. 도면번호는 영문, 숫자, 하이픈만 씁니다."
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>형상</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>도면번호</TableHead>
              <TableHead>Base 대비 차이</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">{base.displayName}</TableCell>
              <TableCell>
                <Badge variant="secondary">Base</Badge>
              </TableCell>
              <TableCell>
                <CellInput label={`${base.displayName} 도면번호`} value={base.drawingNo} onChange={(v) => onChange({ ...base, drawingNo: v }, comparisons)} />
              </TableCell>
              <TableCell className="text-muted-foreground">기준 형상</TableCell>
              <TableCell />
            </TableRow>
            {comparisons.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.displayName}</TableCell>
                <TableCell>
                  <Badge variant="outline">비교</Badge>
                </TableCell>
                <TableCell>
                  <CellInput label={`${product.displayName} 도면번호`} value={product.drawingNo} onChange={(v) => setComparison(product.id, { drawingNo: v })} />
                </TableCell>
                <TableCell>
                  <div title={product.difference}>
                    <CellInput
                      label={`${product.displayName} Base 대비 차이`}
                      value={product.difference}
                      className="min-w-64"
                      onChange={(v) => setComparison(product.id, { difference: v })}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${product.displayName} 삭제`}
                    onClick={() => onChange(base, comparisons.filter((p) => p.id !== product.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange(base, [
              ...comparisons,
              { id: crypto.randomUUID(), drawingNo: "", displayName: `형상 ${comparisons.length + 2}`, difference: "" },
            ])
          }
        >
          <PlusIcon /> 비교 제품 추가
        </Button>
      </div>
    </section>
  );
}
