// AI 생성: SSR 프리페치용 서버 전용 QueryClient 팩토리. providers.tsx의 클라이언트 QueryClient와
// 별개로, 요청마다 새 인스턴스를 만들어야 요청 간 캐시가 공유되지 않는다. React의 cache()로 감싸
// 한 요청 안에서는 같은 인스턴스를 재사용한다(page.tsx에서 prefetch와 dehydrate가 같은 client를 쓰도록).
import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';

export const getQueryClient = cache(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20 * 1000 } } }));
