"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findUser } from "@/features/people";

import { caseSources } from "../cases";
import { STATUS_LABEL, type AirflowRequest } from "../model";
import { DECISION_USES, OPERATION_MODE_OPTIONS, SCOPE_OPTIONS, findPmsProject } from "../reference-data";

const HISTORY_LABEL = { created: "작성 시작", target_locked: "의뢰 대상 확정", submitted: "제출" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{children || "-"}</dd>
    </>
  );
}

export function RequestSummary({ request }: { request: AirflowRequest }) {
  const { target, info } = request;
  const project = findPmsProject(info.pmsProjectId);
  const products = [request.base, ...request.comparisons];
  const productName = (id: string) => products.find((p) => p.id === id)?.displayName ?? "-";
  const operatingName = (id: string) => request.operating.find((o) => o.id === id)?.name ?? "-";
  const { spacePressure, heatExchanger, filter } = request.conditions;
  const sources = caseSources(request);
  const nameIn = (list: { id: string; name: string }[] | null, id: string) => list?.find((x) => x.id === id)?.name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{request.requestNo || "의뢰번호 미발급"}</h1>
        <Badge>{STATUS_LABEL[request.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>의뢰 대상과 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label="제품 분류">{[target.division, target.lineup, target.platform, target.chassis].filter(Boolean).join(" › ")}</Row>
            <Row label="해석유형">풍량</Row>
            {target.scope ? <Row label="해석 범위">{SCOPE_OPTIONS.find((o) => o.value === target.scope)?.label}</Row> : null}
            {target.operationMode ? (
              <Row label="운전 구분">{OPERATION_MODE_OPTIONS.find((o) => o.value === target.operationMode)?.label}</Row>
            ) : null}
            <Row label="의뢰자">{`${info.requesterName} (${info.rank}, ${info.requesterDivision} ${info.department})`}</Row>
            <Row label="의뢰 유형">{info.requestType}</Row>
            {project ? <Row label="프로젝트(PMS)">{`${project.name} · ${project.code} · ${project.region} · ${info.developmentGrade} · ${info.npiStage}`}</Row> : null}
            <Row label="모델명">{info.modelSuffix}</Row>
            <Row label="희망 완료일">{info.desiredDate}</Row>
            <Row label="요청 배경">{info.background}</Row>
            <Row label="확인하고 싶은 내용">{info.wantedResult}</Row>
            <Row label="결과 활용 목적">{DECISION_USES.find((d) => d.value === info.decisionUse)?.label ?? ""}</Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>해석 제품</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {products.map((p, i) => (
              <li key={p.id}>
                {p.displayName} ({i === 0 ? "Base" : "비교"}) · 도면번호 {p.drawingNo}
                {p.difference ? ` · 차이: ${p.difference}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>운전 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {request.operating.map((o) => (
              <li key={o.id}>
                {o.name} · 팬 {o.fanCount}개 ·{" "}
                {o.rpmMode === "common"
                  ? `전체 ${o.commonRpm || "-"} rpm`
                  : o.fans.slice(0, Number(o.fanCount)).map((f, i) => `팬 ${i + 1}(${f.location}) ${f.rpm || "-"} rpm`).join(", ")}
                {o.airflow ? ` · 풍량 ${o.airflow} m³/min (${o.airflowPurpose === "reflect" ? "해석에 반영" : "참고 정보"})` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>선택 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label="공간 압력">
              {spacePressure.state === "use"
                ? spacePressure.packages.map((p) => `${p.name}: 입구 ${p.inlet} Pa, 출구 ${p.outlet} Pa`).join(" / ")
                : "없음"}
            </Row>
            <Row label="열교환기">
              {heatExchanger.state === "use"
                ? heatExchanger.packages
                    .map((h) => `${h.name}: ${h.type}, ${h.tubeDiameter}, ${h.finType}, ${h.rowCount}열, FPI ${h.fpi}`)
                    .join(" / ")
                : "없음"}
            </Row>
            <Row label="필터">
              {filter.enabled
                ? filter.packages
                    .map((p) => `${p.name}: ${p.physicalFilters.map((f) => `${f.name}(측정점 ${f.points.length}개)`).join(", ")}`)
                    .join(" / ")
                : "없음"}
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-1 text-sm">
            {request.cases.map((row, i) => (
              <li key={row.id}>
                Case {i + 1}:{" "}
                {[
                  productName(row.productId),
                  operatingName(row.operatingId),
                  nameIn(sources.pressures, row.pressureId),
                  nameIn(sources.heatExchangers, row.heatExchangerId),
                  nameIn(sources.filters, row.filterId),
                ]
                  .filter(Boolean)
                  .join(" + ")}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>진행 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {request.history.map((event, i) => (
              <li key={i}>
                {new Date(event.at).toLocaleString("ko-KR")} · {findUser(event.actorId)?.name ?? event.actorId} · {HISTORY_LABEL[event.type]}
                {event.from && event.from !== event.to ? ` (${STATUS_LABEL[event.from]} → ${STATUS_LABEL[event.to]})` : ""}
              </li>
            ))}
          </ul>
          {request.revisions.length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">현재 revision {request.revisions.length}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
