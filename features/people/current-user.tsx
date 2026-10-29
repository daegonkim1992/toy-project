"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

import { createBrowserStore } from "@/lib/browser-store";

import { ROLE_LABEL, findUser, sampleUsers, type SessionUser } from "./index";

const store = createBrowserStore("current-user-v1");

type CurrentUserValue = { user: SessionUser; setUserId: (id: string) => void };

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const savedId = useSyncExternalStore(store.subscribe, store.read, () => null);

  const setUserId = useCallback((id: string) => {
    if (findUser(id)) store.write(id);
  }, []);

  const user = (savedId && findUser(savedId)) || sampleUsers[0];
  return <CurrentUserContext.Provider value={{ user, setUserId }}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserValue {
  const value = useContext(CurrentUserContext);
  if (!value) throw new Error("CurrentUserProvider 안에서만 쓸 수 있습니다.");
  return value;
}

export const userLabel = (user: SessionUser) => `${user.name} · ${ROLE_LABEL[user.role]} · ${user.department}`;
