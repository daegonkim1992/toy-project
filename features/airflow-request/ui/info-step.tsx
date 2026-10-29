"use client";

import { FieldGroup } from "@/components/ui/field";

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
  const set = (patch: Partial<RequestInfo>) => onChange({ ...info, ...patch });
  const project = findPmsProject(info.pmsProjectId);
  const isDevProject = info.requestType === DEV_PROJECT_TYPE;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">의뢰자 정보</h3>
        <FieldGroup>
          <ChoiceField label="사업부(의뢰자 소속)" value={info.requesterDivision} options={REQUESTER_DIVISIONS} onChange={(v) => set({ requesterDivision: v })} />
          <TextField label="부서" value={info.department} onChange={(v) => set({ department: v })} />
          <TextField label="요청자" value={info.requesterName} onChange={(v) => set({ requesterName: v })} />
          <ChoiceField label="직급" value={info.rank} options={RANKS} onChange={(v) => set({ rank: v })} />
        </FieldGroup>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">의뢰 개요</h3>
        <FieldGroup>
          <ChoiceField
            label="의뢰 유형"
            value={info.requestType}
            options={[...REQUEST_TYPES, "기타"]}
            onChange={(v) => set({ requestType: v, pmsProjectId: "", developmentGrade: "", npiStage: "" })}
          />
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
                <>
                  <ChoiceField label="개발 등급" value={info.developmentGrade} options={DEVELOPMENT_GRADES} onChange={(v) => set({ developmentGrade: v })} />
                  <ChoiceField label="NPI 단계" value={info.npiStage} options={NPI_STAGES} onChange={(v) => set({ npiStage: v })} />
                </>
              ) : null}
            </>
          ) : null}
          <TextField label="모델명 (Model Suffix)" value={info.modelSuffix} onChange={(v) => set({ modelSuffix: v })} />
          <TextField
            label="희망 완료일"
            type="date"
            value={info.desiredDate}
            hint={`의뢰 요청일(${request.requestDate})보다 앞설 수 없습니다.`}
            onChange={(v) => set({ desiredDate: v })}
          />
          <AreaField label="해석을 요청하게 된 배경" value={info.background} onChange={(v) => set({ background: v })} hint="최대 200자" />
          <AreaField label="해석으로 확인하고 싶은 내용" value={info.wantedResult} onChange={(v) => set({ wantedResult: v })} hint="최대 200자" />
          <SelectInput
            label="결과 활용 목적 (선택)"
            value={info.decisionUse}
            options={DECISION_USES}
            onChange={(v) => set({ decisionUse: v })}
          />
        </FieldGroup>
      </section>
    </div>
  );
}
