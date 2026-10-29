import { describe, expect, it } from "vitest";

import { sampleUsers } from "@/features/people";

import { createDraft, loadRequests, saveRequests } from "./index";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

describe("의뢰서 저장", () => {
  it("저장한 작성 중 의뢰를 다시 열면 그대로 불러온다", () => {
    const storage = memoryStorage();
    const draft = createDraft(sampleUsers[0], new Date(2026, 9, 29), "r1");
    saveRequests([draft], storage);
    expect(loadRequests(storage)).toEqual([draft]);
  });

  it("저장된 것이 없거나 깨져 있으면 빈 목록으로 시작한다", () => {
    expect(loadRequests(memoryStorage())).toEqual([]);
    expect(loadRequests({ getItem: () => "{깨진 JSON" })).toEqual([]);
  });
});
