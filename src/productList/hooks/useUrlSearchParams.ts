import { useSyncExternalStore, useCallback } from 'react';

const CHANGE_EVENT = 'urlsearchparamschange';

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('popstate', callback); // 뒤로/앞으로 이동 시 재동기화
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('popstate', callback);
  };
}

// 문자열 스냅샷 → 같은 search면 참조 동일, 무한 렌더 없음
const getSnapshot = () => window.location.search;

export function useUrlSearchParams() {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const params = new URLSearchParams(search); // 파생값, 매 렌더 재계산 OK

  const setParams = useCallback((next: URLSearchParams) => {
    const qs = next.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.pushState(null, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [params, setParams] as const;
}
