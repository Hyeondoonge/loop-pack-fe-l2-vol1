// DOM이 있는 integration 프로젝트에서만 로드한다. unit 프로젝트(node 환경)에 DOM matcher를
// 올릴 이유가 없어 setup을 나눴다.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useCartStore } from '@/entities/cart';
import { useWishlistStore } from '@/entities/wishlist';

// 모듈 최상위에서 만들어지는 전역 스토어 격리
afterEach(() => {
  useCartStore.setState({ ids: new Set() });
  useWishlistStore.setState({ ids: new Set() });
});

afterEach(cleanup);
