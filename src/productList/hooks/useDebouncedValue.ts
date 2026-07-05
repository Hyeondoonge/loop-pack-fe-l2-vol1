import { useEffect, useState } from 'react';

// 값이 delay(ms) 동안 변경되지 않을 때만 반영 — 검색어처럼 빠르게 바뀌는 입력의 다운스트림 부작용(API 요청 등)을 지연시킬 때 사용.
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
