"use client";

import { useCallback, useSyncExternalStore } from "react";

import { createBrowserStore } from "@/lib/browser-store";

import type { AirflowRequest } from "./model";
import { STORAGE_KEY, parseRequests } from "./repository";

const store = createBrowserStore(STORAGE_KEY);

let cachedRaw: string | null | undefined;
let cachedValue: AirflowRequest[] = [];

function getSnapshot(): AirflowRequest[] {
  const raw = store.read();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseRequests(raw);
  }
  return cachedValue;
}

/** 브라우저 저장소의 의뢰 목록. 서버에서 그릴 때와 처음 읽기 전에는 null이다. */
export function useRequests() {
  const requests = useSyncExternalStore(store.subscribe, getSnapshot, () => null);

  const commit = useCallback((update: (previous: AirflowRequest[]) => AirflowRequest[]) => {
    store.write(JSON.stringify(update(getSnapshot())));
  }, []);

  return { requests, commit };
}
