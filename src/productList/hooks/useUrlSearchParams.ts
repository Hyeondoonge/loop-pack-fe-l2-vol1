import { useSyncExternalStore, useCallback } from 'react';

const CHANGE_EVENT = 'urlsearchparamschange';

function subscribe(callback: () => void) {
  // ponytail: pushState 안 씀 → popstate로 감지할 히스토리 이동 없음. 도입 시 여기에 popstate 리스너 추가
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

// 문자열 스냅샷 → 같은 search면 참조 동일, 무한 렌더 없음
const getSnapshot = () => window.location.search;

export function useUrlSearchParams() {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const params = new URLSearchParams(search); // 파생값, 매 렌더 재계산 OK

  const setParams = useCallback((next: URLSearchParams) => {
    const qs = next.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url); // ponytail: 히스토리 관리(뒤로가기 단위 복원) 불필요, 필요해지면 pushState로 전환
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [params, setParams] as const;
}
