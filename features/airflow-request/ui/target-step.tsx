"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AirflowRequest, RequestTarget } from "../model";
import {
  OPERATION_MODE_OPTIONS,
  SCOPE_OPTIONS,
  chassisOptions,
  divisionOptions,
  findClassification,
  lineupOptions,
  platformOptions,
} from "../reference-data";
import { SelectInput } from "./form";

const asOptions = (values: string[]) => values.map((v) => ({ value: v === "" ? "-" : v, label: v === "" ? "해당 없음" : v }));
const fromOption = (value: string) => (value === "-" ? "" : value);

export function TargetStep({
  request,
  lockMessage,
  onChangeTarget,
  onLock,
}: {
  request: AirflowRequest;
  lockMessage: string;
  onChangeTarget: (target: RequestTarget) => void;
  onLock: () => void;
}) {
  const { target } = request;

  if (target.locked) {
    const row = findClassification(target);
    return (
      <Card>
        <CardHeader>
          <CardTitle>의뢰 대상</CardTitle>
          <CardAction>
            <Badge variant="secondary">확정됨</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">제품 분류</dt>
            <dd>{[target.division, target.lineup, target.platform, target.chassis].filter(Boolean).join(" › ")}</dd>
            <dt className="text-muted-foreground">해석유형</dt>
            <dd>풍량</dd>
            {row?.windowScope ? (
              <>
                <dt className="text-muted-foreground">해석 범위</dt>
                <dd>{SCOPE_OPTIONS.find((o) => o.value === target.scope)?.label}</dd>
              </>
            ) : null}
            {row?.unified ? (
              <>
                <dt className="text-muted-foreground">운전 구분</dt>
                <dd>{OPERATION_MODE_OPTIONS.find((o) => o.value === target.operationMode)?.label}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">의뢰번호</dt>
            <dd>{request.requestNo}</dd>
          </dl>
          <p className="text-sm text-muted-foreground">
            확정된 의뢰 대상은 바꿀 수 없습니다. 다른 제품으로 의뢰하려면 이 의뢰를 취소하고 새로 작성합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const row = findClassification(target);
  const set = (patch: Partial<RequestTarget>) => onChangeTarget({ ...target, ...patch });
  const lineups = target.division ? lineupOptions(target.division) : [];
  const platforms = target.lineup ? platformOptions(target.division, target.lineup) : [];
  const chassis = target.lineup ? chassisOptions(target.division, target.lineup, target.platform) : [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        제품 분류를 고르고 의뢰 대상을 확정하면 의뢰번호가 발급되고 바꿀 수 없습니다. 이 의뢰서는 풍량 해석을 요청합니다.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label="사업부"
          value={target.division}
          options={asOptions(divisionOptions())}
          onChange={(v) => set({ division: v, lineup: "", platform: "", chassis: "", scope: "", operationMode: "" })}
        />
        <SelectInput
          label="Product Line-up"
          value={target.lineup}
          options={asOptions(lineups)}
          disabled={!target.division}
          onChange={(v) => {
            const nextPlatforms = platformOptions(target.division, v);
            const platform = nextPlatforms.length === 1 ? nextPlatforms[0] : "";
            const nextChassis = chassisOptions(target.division, v, platform);
            set({
              lineup: v,
              platform: nextPlatforms.length === 1 ? platform : "",
              chassis: nextPlatforms.length === 1 && nextChassis.length === 1 ? nextChassis[0] : "",
              scope: "",
              operationMode: "",
            });
          }}
        />
        <SelectInput
          label="Platform"
          value={target.platform === "" && platforms.length === 1 && platforms[0] === "" ? "-" : target.platform}
          options={asOptions(platforms)}
          disabled={!target.lineup}
          onChange={(v) => {
            const platform = fromOption(v);
            const nextChassis = chassisOptions(target.division, target.lineup, platform);
            set({ platform, chassis: nextChassis.length === 1 ? nextChassis[0] : "", scope: "", operationMode: "" });
          }}
        />
        <SelectInput
          label="Chassis"
          value={target.chassis === "" && chassis.length === 1 && chassis[0] === "" ? "-" : target.chassis}
          options={asOptions(chassis)}
          disabled={!target.lineup || (target.platform === "" && !platforms.includes(""))}
          onChange={(v) => set({ chassis: fromOption(v) })}
        />
        {row?.windowScope ? (
          <SelectInput
            label="해석 범위"
            value={target.scope}
            options={SCOPE_OPTIONS.map((o) => ({ ...o }))}
            hint="실내·실외 모두는 동시운전이 아니라 두 측을 모두 해석해 달라는 뜻이며 의뢰 한 건으로 다룹니다."
            onChange={(v) => set({ scope: v as RequestTarget["scope"] })}
          />
        ) : null}
        {row?.unified ? (
          <SelectInput
            label="운전 구분"
            value={target.operationMode}
            options={OPERATION_MODE_OPTIONS.map((o) => ({ ...o }))}
            onChange={(v) => set({ operationMode: v as RequestTarget["operationMode"] })}
          />
        ) : null}
      </div>
      {lockMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{lockMessage}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button onClick={onLock}>의뢰 대상 확정</Button>
      </div>
    </div>
  );
}
