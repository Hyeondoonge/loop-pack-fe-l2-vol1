// AI 생성: 설계 문서 M(테스트 범위)은 아직 미결이라, DOM 없이 검증 가능한 store 로직만 최소로 남긴다.
import { describe, expect, it } from 'vitest';
import { createIdSetStore } from './createIdSetStore';

describe('createIdSetStore', () => {
  it('toggle은 없으면 추가하고 있으면 제거한다', () => {
    const useStore = createIdSetStore();
    useStore.getState().toggle('p1');
    expect(useStore.getState().ids.has('p1')).toBe(true);

    useStore.getState().toggle('p1');
    expect(useStore.getState().ids.has('p1')).toBe(false);
  });

  it('add는 이미 있는 id를 다시 넣어도 참조를 바꾸지 않는다', () => {
    const useStore = createIdSetStore();
    useStore.getState().add('p1');
    const beforeRef = useStore.getState().ids;

    useStore.getState().add('p1');
    expect(useStore.getState().ids).toBe(beforeRef);
  });

  it('remove는 없는 id를 지워도 참조를 바꾸지 않는다', () => {
    const useStore = createIdSetStore();
    const beforeRef = useStore.getState().ids;

    useStore.getState().remove('p1');
    expect(useStore.getState().ids).toBe(beforeRef);
  });

  it('서로 다른 store 인스턴스는 상태를 공유하지 않는다', () => {
    const cart = createIdSetStore();
    const wishlist = createIdSetStore();

    cart.getState().add('p1');
    expect(wishlist.getState().ids.has('p1')).toBe(false);
  });
});
