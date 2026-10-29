// localStorage 한 키를 React의 useSyncExternalStore에 연결하는 작은 저장소.
// 저장소를 쓸 수 없는 환경에서도 메모리 값으로 계속 동작한다.
export function createBrowserStore(key: string) {
  const listeners = new Set<() => void>();
  let current: string | null | undefined;

  const readStorage = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const notify = () => listeners.forEach((listener) => listener());

  return {
    read(): string | null {
      if (current === undefined) current = readStorage();
      return current;
    },
    write(value: string) {
      current = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        // 저장에 실패해도 현재 화면에서는 값을 유지한다.
      }
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        current = event.newValue;
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
