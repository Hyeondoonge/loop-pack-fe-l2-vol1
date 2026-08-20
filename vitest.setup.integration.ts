// DOM이 있는 integration 프로젝트에서만 로드한다. unit 프로젝트(node 환경)에 DOM matcher를
// 올릴 이유가 없어 setup을 나눴다.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useCartStore } from '@/entities/cart';
import { useWishlistStore } from '@/entities/wishlist';

// globals를 끈 채로 두었으므로 Testing Library의 자동 cleanup이 동작하지 않는다. 명시한다(결정 8).
afterEach(cleanup);

// 두 store는 모듈 최상위에서 만들어지는 zustand 인스턴스라 상태가 파일·테스트 간에 공유된다.
// persist가 없어 localStorage는 대상이 아니다(결정 7).
afterEach(() => {
  useCartStore.setState({ ids: new Set() });
  useWishlistStore.setState({ ids: new Set() });
});
