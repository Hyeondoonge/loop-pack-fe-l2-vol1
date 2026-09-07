// /api/auth/me 기본 핸들러 — 비로그인 상태만 담는다. 로그인 상태가 필요한 테스트는 server.use()로 덮는다.
// Header가 모든 화면에 얹히면서 세션 조회가 목록·홈 등 다른 슬라이스의 통합 테스트에도 딸려 들어온다.
// 화면마다 스텁을 다시 두는 대신 기본값을 여기 한 곳에 둔다.
import { http, HttpResponse } from 'msw';

// jsdom의 기본 origin. apiFetch는 브라우저 환경에서 상대 경로로 요청하므로 여기에 붙어 해석된다.
export const ME_ENDPOINT = 'http://localhost:3000/api/auth/me';

export const authHandlers = [
  // 실제 라우트(app/api/auth/me/route.ts)와 같은 401 계약을 따른다. getMe가 이를 "세션 없음"으로 해석해 null을 준다.
  http.get(ME_ENDPOINT, () => HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 }))
];
