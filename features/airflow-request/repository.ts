import type { AirflowRequest } from "./model";

export const STORAGE_KEY = "airflow-requests-v1";

export function parseRequests(raw: string | null): AirflowRequest[] {
  try {
    return raw ? (JSON.parse(raw) as AirflowRequest[]) : [];
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
