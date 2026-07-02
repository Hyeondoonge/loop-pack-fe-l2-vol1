import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// localStorage와 동기화되는 state. read는 lazy init, write는 effect(외부 시스템 동기화).
// state-backed 영속값 전용 — 렌더에서 안 읽히는 write-only 값에는 쓰지 않는다.
// AI 생성 L6 - L25
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage 사용 불가 시 무시
    }
  }, [key, value]);

  return [value, setValue];
}
