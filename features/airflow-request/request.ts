import type { SessionUser } from "@/features/people";

import { defaultCaseRow, reconcileCases, validateCases } from "./cases";
import {
  FREE_TEXT_LIMIT,
  type AirflowRequest,
  type RequestContent,
  type RequestStatus,
  type SubmissionIssue,
} from "./model";
import { operatingSignature, validateOperatingPackage } from "./operating";
import { DEV_PROJECT_TYPE, findClassification, findPmsProject } from "./reference-data";

const EDITABLE: RequestStatus[] = ["draft", "revision_needed"];

export const isEditable = (status: RequestStatus) => EDITABLE.includes(status);

export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function createDraft(user: SessionUser, now: Date, id: string): AirflowRequest {
  return {
    id,
    requestNo: "",
    requestDate: dateKey(now),
    ownerId: user.id,
    ownerDepartment: user.department,
    status: "draft",
    casesConfirmed: false,
    target: { locked: false, division: "", lineup: "", platform: "", chassis: "", scope: "", operationMode: "" },
    info: {
      requesterDivision: user.division,
      department: user.department,
      requesterName: user.name,
      rank: user.rank,
      requestType: "",
      pmsProjectId: "",
      developmentGrade: "",
      npiStage: "",
      modelSuffix: "",
      desiredDate: "",
      background: "",
      wantedResult: "",
      decisionUse: "",
    },
    base: { id: "base", drawingNo: "", displayName: "형상 1", difference: "" },
    comparisons: [],
    operating: [],
    cases: [defaultCaseRow("base")],
    revisions: [],
    history: [
      { type: "created", from: null, to: "draft", actorId: user.id, at: now.toISOString(), note: "" },
    ],
  };
}

export type RequestPatch = Partial<Pick<AirflowRequest, "target" | "info" | "base" | "comparisons" | "operating" | "cases">>;

/** 수정 가능한 상태에서만 반영한다. 제품, 조건, Case를 바꾸면 Case를 다시 확인받아야 한다. */
export function editRequest(request: AirflowRequest, patch: RequestPatch): AirflowRequest {
  if (!isEditable(request.status)) return request;
  const next: AirflowRequest = { ...request };
  if (patch.target && !request.target.locked) next.target = patch.target;
  if (patch.info) next.info = patch.info;
  if (patch.base) next.base = patch.base;
  if (patch.comparisons) next.comparisons = patch.comparisons;
  if (patch.operating) next.operating = patch.operating;
  if (patch.cases) next.cases = patch.cases;

  const casesAffected = patch.base || patch.comparisons || patch.operating || patch.cases;
  if (casesAffected) {
    next.cases = reconcileCases(next.cases, [next.base, ...next.comparisons], next.operating);
    next.casesConfirmed = false;
  }
  return next;
}

export type LockResult = { ok: true; request: AirflowRequest } | { ok: false; message: string };

export function lockTarget(request: AirflowRequest, existing: AirflowRequest[], now: Date): LockResult {
  if (request.target.locked) return { ok: false, message: "이미 확정된 의뢰 대상입니다." };
  const row = findClassification(request.target);
  if (!row) return { ok: false, message: "등록된 제품 분류 조합을 선택해야 합니다." };
  if (row.windowScope && request.target.scope === "") return { ok: false, message: "해석 범위를 선택해야 합니다." };
  if (row.unified && request.target.operationMode === "") return { ok: false, message: "운전 구분을 선택해야 합니다." };

  const day = dateKey(now);
  const prefix = `CFD-${day.replaceAll("-", "")}-`;
  const lastSeq = existing
    .map((r) => r.requestNo)
    .filter((no) => no.startsWith(prefix))
    .reduce((max, no) => Math.max(max, Number(no.slice(prefix.length))), 0);

  return {
    ok: true,
    request: {
      ...request,
      requestNo: `${prefix}${String(lastSeq + 1).padStart(3, "0")}`,
      requestDate: day,
      target: {
        ...request.target,
        locked: true,
        scope: row.windowScope ? request.target.scope : "",
        operationMode: row.unified ? request.target.operationMode : "",
      },
      history: [
        ...request.history,
        { type: "target_locked", from: "draft", to: "draft", actorId: request.ownerId, at: now.toISOString(), note: "" },
      ],
    },
  };
}

function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${withBatchim}(${without})`;
  return code % 28 === 0 ? without : withBatchim;
}

export function validateSubmission(request: AirflowRequest): SubmissionIssue[] {
  const issues: SubmissionIssue[] = [];
  const add = (step: SubmissionIssue["step"], message: string) => issues.push({ step, message });
  const { target, info } = request;

  if (!target.locked) add("target", "의뢰 대상을 확정해야 합니다.");

  const required: [string, string][] = [
    [info.requesterDivision, "의뢰자 사업부"],
    [info.department, "부서"],
    [info.requesterName, "요청자"],
    [info.rank, "직급"],
    [info.requestType, "의뢰 유형"],
    [info.modelSuffix, "모델명"],
    [info.background, "해석을 요청하게 된 배경"],
    [info.wantedResult, "해석으로 확인하고 싶은 내용"],
  ];
  for (const [value, label] of required) {
    if (value.trim() === "") add("info", `${label}${josa(label, "을", "를")} 입력해야 합니다.`);
  }

  if (info.requestType === DEV_PROJECT_TYPE) {
    const project = findPmsProject(info.pmsProjectId);
    if (!project) add("info", "PMS 프로젝트를 선택해야 합니다.");
    else if (project.division !== target.division) {
      add("info", `제품 사업부(${target.division})에 해당하는 PMS 프로젝트를 선택해야 합니다.`);
    }
    if (project) {
      if (info.developmentGrade.trim() === "") add("info", "개발 등급을 입력해야 합니다.");
      if (info.npiStage.trim() === "") add("info", "NPI 단계를 입력해야 합니다.");
    }
  }

  if (info.desiredDate.trim() === "") add("info", "희망 완료일을 입력해야 합니다.");
  else if (info.desiredDate < request.requestDate) {
    add("info", `희망 완료일은 의뢰 요청일(${request.requestDate})보다 앞설 수 없습니다.`);
  }

  const products = [
    { product: request.base, label: "Base 제품", isBase: true },
    ...request.comparisons.map((product) => ({ product, label: product.displayName, isBase: false })),
  ];
  const seenDrawings = new Set<string>();
  for (const { product, label, isBase } of products) {
    const drawing = product.drawingNo.trim();
    if (drawing === "") add("products", `${label}의 도면번호를 입력해야 합니다.`);
    else if (!/^[A-Za-z0-9-]+$/.test(drawing)) add("products", `${label}의 도면번호는 영문, 숫자, 하이픈만 쓸 수 있습니다.`);
    else {
      const key = drawing.toUpperCase();
      if (seenDrawings.has(key)) add("products", `도면번호 ${drawing}이(가) 다른 제품과 중복됩니다.`);
      seenDrawings.add(key);
    }
    if (!isBase && product.difference.trim() === "") add("products", `${label}의 Base 대비 차이를 입력해야 합니다.`);
  }

  if (request.operating.length === 0) add("operating", "운전 조건을 1개 이상 입력해야 합니다.");
  const signatures = new Map<string, string>();
  for (const pkg of request.operating) {
    for (const message of validateOperatingPackage(pkg)) add("operating", `${pkg.name}: ${message}`);
    const signature = operatingSignature(pkg);
    const same = signatures.get(signature);
    if (same) add("operating", `${same}과(와) ${pkg.name}의 내용이 같습니다.`);
    else signatures.set(signature, pkg.name);
  }

  const caseIssues = validateCases(request.cases, [request.base, ...request.comparisons], request.operating);
  issues.push(...caseIssues);
  if (caseIssues.length === 0 && !request.casesConfirmed) add("cases", "Case 구성을 확인해야 합니다.");

  const textFields: [string, string][] = [
    [info.requesterDivision, "의뢰자 사업부"],
    [info.department, "부서"],
    [info.requesterName, "요청자"],
    [info.rank, "직급"],
    [info.requestType, "의뢰 유형"],
    [info.developmentGrade, "개발 등급"],
    [info.npiStage, "NPI 단계"],
    [info.modelSuffix, "모델명"],
    [info.background, "해석을 요청하게 된 배경"],
    [info.wantedResult, "해석으로 확인하고 싶은 내용"],
    ...products.flatMap(({ product, label }): [string, string][] => [
      [product.difference, `${label}의 Base 대비 차이`],
      [product.drawingNo, `${label}의 도면번호`],
    ]),
    ...request.operating.flatMap((pkg): [string, string][] =>
      pkg.fans.map((fan, i) => [fan.location, `${pkg.name}의 팬 ${i + 1} 위치`]),
    ),
  ];
  for (const [value, label] of textFields) {
    if (value.length > FREE_TEXT_LIMIT) {
      add(step(label), `${label}${josa(label, "은", "는")} ${FREE_TEXT_LIMIT}자를 넘을 수 없습니다.`);
    }
  }
  return issues;
}

function step(label: string): SubmissionIssue["step"] {
  if (label.includes("Base 대비 차이") || label.includes("도면번호")) return "products";
  if (label.includes("팬")) return "operating";
  return "info";
}

export type CasesResult = { ok: true; request: AirflowRequest } | { ok: false; issues: SubmissionIssue[] };

export function confirmCases(request: AirflowRequest): CasesResult {
  const issues = validateCases(request.cases, [request.base, ...request.comparisons], request.operating);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, request: { ...request, casesConfirmed: true } };
}

export type SubmitResult = { ok: true; request: AirflowRequest } | { ok: false; issues: SubmissionIssue[] };

export function submitRequest(request: AirflowRequest, user: SessionUser, now: Date): SubmitResult {
  if (request.ownerId !== user.id || request.status !== "draft") {
    return { ok: false, issues: [{ step: "review", message: "제출할 수 없는 상태이거나 작성자가 아닙니다." }] };
  }
  const issues = validateSubmission(request);
  if (issues.length > 0) return { ok: false, issues };

  const snapshot: RequestContent = structuredClone({
    target: request.target,
    info: request.info,
    base: request.base,
    comparisons: request.comparisons,
    operating: request.operating,
    cases: request.cases,
  });
  const at = now.toISOString();
  return {
    ok: true,
    request: {
      ...request,
      status: "under_review",
      revisions: [...request.revisions, { no: request.revisions.length + 1, snapshot, submittedBy: user.id, submittedAt: at }],
      history: [...request.history, { type: "submitted", from: request.status, to: "under_review", actorId: user.id, at, note: "" }],
    },
  };
}

export function visibleRequests(user: SessionUser, all: AirflowRequest[]): AirflowRequest[] {
  if (user.role === "requester") {
    return all.filter(
      (r) => r.ownerId === user.id || (r.ownerDepartment === user.department && r.status !== "draft"),
    );
  }
  if (user.role === "manager") return all.filter((r) => r.status !== "draft");
  return [];
}

export type RequestAction = "edit" | "submit";

export function allowedActions(user: SessionUser, request: AirflowRequest): RequestAction[] {
  if (user.role === "requester" && request.ownerId === user.id && request.status === "draft") return ["edit", "submit"];
  return [];
}
