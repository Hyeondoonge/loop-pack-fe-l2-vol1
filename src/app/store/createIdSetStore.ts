// AI 생성: 설계 문서 1번은 store 인스턴스를 cart/wishlist로 분리하는 것만 정했다.
// 두 store가 "ID Set 토글" 구조를 그대로 공유해 로직 중복(버그 발생 지점 2곳)을 피하기 위한 내부 팩토리이며,
// 분리된 두 store 인스턴스를 만든다는 결정 자체는 바꾸지 않는다.
import { create } from 'zustand';

export type IdSetStore = {
  ids: Set<string>;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
};

export function createIdSetStore() {
  return create<IdSetStore>((set) => ({
    ids: new Set(),
    toggle: (id) =>
      set((state) => {
        const next = new Set(state.ids);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ids: next };
      }),
    add: (id) => set((state) => (state.ids.has(id) ? state : { ids: new Set(state.ids).add(id) })),
    remove: (id) =>
      set((state) => {
        if (!state.ids.has(id)) return state;
        const next = new Set(state.ids);
        next.delete(id);
        return { ids: next };
      })
  }));
}
