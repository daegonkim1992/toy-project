"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AirflowRequest, RequestInfo } from "../model";
import {
  DECISION_USES,
  DEVELOPMENT_GRADES,
  DEV_PROJECT_TYPE,
  NPI_STAGES,
  RANKS,
  REQUESTER_DIVISIONS,
  REQUEST_TYPES,
  findPmsProject,
  pmsProjects,
} from "../reference-data";
import { AreaField, ChoiceField, SelectInput, TextField } from "./form";

export function InfoStep({ request, onChange }: { request: AirflowRequest; onChange: (info: RequestInfo) => void }) {
  const { info, target } = request;
  const [requesterOpen, setRequesterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(info.decisionUse !== "");
  const set = (patch: Partial<RequestInfo>) => onChange({ ...info, ...patch });
  const project = findPmsProject(info.pmsProjectId);
  const isDevProject = info.requestType === DEV_PROJECT_TYPE;

  return (
    <div className="flex flex-col gap-6">
      {requesterOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>의뢰자 정보</CardTitle>
            <CardAction>
              <Button variant="link" size="sm" onClick={() => setRequesterOpen(false)}>
                접기
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ChoiceField label="사업부(의뢰자 소속)" value={info.requesterDivision} options={REQUESTER_DIVISIONS} onChange={(v) => set({ requesterDivision: v })} />
            <TextField label="부서" value={info.department} onChange={(v) => set({ department: v })} />
            <TextField label="요청자" value={info.requesterName} onChange={(v) => set({ requesterName: v })} />
            <ChoiceField label="직급" value={info.rank} options={RANKS} onChange={(v) => set({ rank: v })} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm">
          <span>
            <span className="text-muted-foreground">의뢰자</span>&nbsp;{" "}
            <strong className="font-semibold">{info.requesterName || "이름 없음"}</strong> · {info.rank} · {info.requesterDivision} {info.department}
          </span>
          <Button variant="link" size="sm" onClick={() => setRequesterOpen(true)}>
            수정
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>의뢰 개요</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChoiceField
              label="의뢰 유형"
              value={info.requestType}
              options={[...REQUEST_TYPES, "기타"]}
              onChange={(v) => set({ requestType: v, pmsProjectId: "", developmentGrade: "", npiStage: "" })}
            />
            <TextField label="모델명 (Model Suffix)" value={info.modelSuffix} onChange={(v) => set({ modelSuffix: v })} />
            {isDevProject ? (
              <>
                <SelectInput
                  label="프로젝트명(PMS)"
                  value={info.pmsProjectId}
                  options={pmsProjects.filter((p) => p.division === target.division).map((p) => ({ value: p.id, label: p.name }))}
                  hint={project ? `Project Code ${project.code} · Region ${project.region}` : `제품 사업부(${target.division}) 프로젝트에서 고릅니다.`}
                  onChange={(v) => set({ pmsProjectId: v })}
                />
                {project ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChoiceField label="개발 등급" value={info.developmentGrade} options={DEVELOPMENT_GRADES} onChange={(v) => set({ developmentGrade: v })} />
                    <ChoiceField label="NPI 단계" value={info.npiStage} options={NPI_STAGES} onChange={(v) => set({ npiStage: v })} />
                  </div>
                ) : (
                  <div />
                )}
              </>
            ) : null}
            <TextField
              label="희망 완료일"
              type="date"
              value={info.desiredDate}
              hint={`의뢰 요청일(${request.requestDate})보다 앞설 수 없습니다.`}
              onChange={(v) => set({ desiredDate: v })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AreaField label="해석을 요청하게 된 배경" value={info.background} onChange={(v) => set({ background: v })} />
            <AreaField label="해석으로 확인하고 싶은 내용" value={info.wantedResult} onChange={(v) => set({ wantedResult: v })} />
          </div>
          <div>
            <Button variant="ghost" size="sm" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
              {moreOpen ? <ChevronDownIcon /> : <ChevronRightIcon />} 선택 항목 (결과 활용 목적)
            </Button>
          </div>
          {moreOpen ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="결과 활용 목적 (선택)" value={info.decisionUse} options={DECISION_USES} onChange={(v) => set({ decisionUse: v })} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
