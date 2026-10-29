"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

import type { AirflowRequest, Product } from "../model";
import { AreaField, TextField } from "./form";

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
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        해석에 쓸 총조립 형상을 등록합니다. 부품의 각도, 위치, 배치가 다르면 다른 총조립 형상이므로 도면번호도 달라야 합니다. 단품 도면은 쓸 수 없습니다.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Base 제품 ({base.displayName})</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <TextField
              label="Base 제품 도면번호"
              value={base.drawingNo}
              hint="영문, 숫자, 하이픈"
              onChange={(v) => onChange({ ...base, drawingNo: v }, comparisons)}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {comparisons.map((product) => (
        <Card key={product.id}>
          <CardHeader>
            <CardTitle>비교 제품 ({product.displayName})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <TextField label={`${product.displayName} 도면번호`} value={product.drawingNo} onChange={(v) => setComparison(product.id, { drawingNo: v })} />
              <AreaField
                label={`${product.displayName} Base 대비 차이`}
                value={product.difference}
                hint="최대 200자"
                onChange={(v) => setComparison(product.id, { difference: v })}
              />
            </FieldGroup>
            <div>
              <Button variant="outline" size="sm" onClick={() => onChange(base, comparisons.filter((p) => p.id !== product.id))}>
                <Trash2Icon /> {product.displayName} 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div>
        <Button
          variant="outline"
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
    </div>
  );
}
