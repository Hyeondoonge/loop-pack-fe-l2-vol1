// AI 생성: SSR 프리페치용 서버 전용 QueryClient 팩토리. providers.tsx의 클라이언트 QueryClient와
// 별개로, 호출할 때마다 새 인스턴스를 만든다.
//
// AI 생성: week-07 3단계 — 이전에는 React cache()로 감싸 한 요청 안에서 같은 인스턴스를 재사용했지만,
// 그러면 generateMetadata와 본문이 QueryClient 캐시를 공유하게 된다. 두 경로의 중복 요청은 QueryClient를
// 공유해서가 아니라 같은 render/request에서 URL·options가 같은 native fetch가 memoization되어 사라져야 한다.
// prefetch와 dehydrate가 같은 client를 써야 하는 곳은 호출부에서 결과를 변수에 담아 쓴다(HomePage.tsx).
import { QueryClient } from '@tanstack/react-query';

export const getQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 20 * 1000 } } });
