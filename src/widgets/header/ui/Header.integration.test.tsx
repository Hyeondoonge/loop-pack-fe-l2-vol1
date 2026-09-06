import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { server } from '@/test/mocks/node';
import { renderWithProviders } from '@/test/lib/render';
import Header from './Header';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const ME_ENDPOINT = 'http://localhost:3000/api/auth/me';
const LOGOUT_ENDPOINT = 'http://localhost:3000/api/auth/logout';

// jsdom의 window.alert는 호출되면 "Not implemented"를 뱉는 자리표시자다. 실제 대화상자를 띄우는
// 대신 호출을 가로채 인자를 확인한다.
const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

beforeEach(() => {
  replace.mockClear();
  alertSpy.mockClear();
  // 로그아웃 버튼은 로그인 상태에서만 그려진다. 세션 조회 자체는 이 파일의 관심사가 아니라 항상 성공시킨다.
  server.use(http.get(ME_ENDPOINT, () => HttpResponse.json({ user: { id: 'u1', name: '루퍼', email: 'looper1@loopers.dev' } })));
});

async function renderHeaderAndClickLogout() {
  renderWithProviders(<Header />);
  await userEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
}

// 로그아웃 라우트에는 시나리오 노브가 없어 항상 204다. 실제로 실패할 수 있는 건
// 앱 서버·프록시의 5xx와 네트워크 단절 둘뿐이므로, 이 두 가지가 화면에 같은 결과로 나타나는지를 본다.
describe('로그아웃 실패', () => {
  it('서버가 5xx로 응답하면 실패를 알리고 로그인 상태를 그대로 둔다', async () => {
    server.use(http.post(LOGOUT_ENDPOINT, () => HttpResponse.json({ message: '서버 오류' }, { status: 500 })));

    await renderHeaderAndClickLogout();

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('link', { name: '루퍼님 마이페이지' })).toBeVisible();
  });

  it('요청이 네트워크에서 끊겨 상태 코드가 없어도 같은 안내를 보여준다', async () => {
    server.use(http.post(LOGOUT_ENDPOINT, () => HttpResponse.error()));

    await renderHeaderAndClickLogout();

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('link', { name: '루퍼님 마이페이지' })).toBeVisible();
  });

  it('로그아웃이 성공하면 안내를 띄우지 않는다', async () => {
    server.use(http.post(LOGOUT_ENDPOINT, () => new HttpResponse(null, { status: 204 })));

    await renderHeaderAndClickLogout();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
