import { emptyConditions } from "./conditions";
import type { AirflowRequest, CaseRow, RequestContent } from "./model";

export const STORAGE_KEY = "airflow-requests-v1";

type StoredContent = Omit<RequestContent, "conditions" | "cases"> & {
  conditions?: RequestContent["conditions"];
  cases: Partial<CaseRow>[];
};

// 선택 조건이 생기기 전에 저장된 의뢰서에 빈 선택 조건과 Case 열을 채운다.
function normalizeContent<T extends StoredContent>(content: T): T & Pick<RequestContent, "conditions" | "cases"> {
  return {
    ...content,
    conditions: content.conditions ?? emptyConditions(),
    cases: content.cases.map((row) => ({ pressureId: "", heatExchangerId: "", filterId: "", ...row }) as CaseRow),
  };
}

export function parseRequests(raw: string | null): AirflowRequest[] {
  try {
    const stored = raw ? (JSON.parse(raw) as (AirflowRequest & StoredContent)[]) : [];
    return stored.map((request) => ({
      ...normalizeContent(request),
      assigneeId: request.assigneeId ?? "",
      revisions: request.revisions.map((revision) => ({ ...revision, snapshot: normalizeContent(revision.snapshot as StoredContent) })),
    })) as AirflowRequest[];
  } catch {
    return [];
  }
}

// 의뢰서는 브라우저 저장소에 보관한다. 서버 저장소로 옮길 때는 이 파일과 use-requests만 바꾼다.
export function loadRequests(storage: Pick<Storage, "getItem">): AirflowRequest[] {
  return parseRequests(storage.getItem(STORAGE_KEY));
}

export function saveRequests(requests: AirflowRequest[], storage: Pick<Storage, "setItem">): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(requests));
}
