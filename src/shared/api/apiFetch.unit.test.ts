import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../mocks/node';
import { ApiError, apiFetch } from './apiFetch';

// /api/example은 실재하지 않는 경로다 — 이 테스트는 특정 라우트가 아니라 apiFetch의 계약만 검증
const EXAMPLE_PATH = '*/api/example';

describe('apiFetch', () => {
  it('returns parsed JSON on a 2xx response', async () => {
    server.use(http.get(EXAMPLE_PATH, () => HttpResponse.json({ value: 1 })));

    await expect(apiFetch('/api/example')).resolves.toEqual({ value: 1 });
  });

  it('throws ApiError with the response status and message on a non-2xx response', async () => {
    server.use(http.get(EXAMPLE_PATH, () => HttpResponse.json({ message: '요청 조건을 확인해주세요.' }, { status: 400 })));

    await expect(apiFetch('/api/example')).rejects.toMatchObject({
      status: 400,
      message: '요청 조건을 확인해주세요.'
    });
    await expect(apiFetch('/api/example')).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to a default message when the error body is not JSON', async () => {
    server.use(http.get(EXAMPLE_PATH, () => new HttpResponse('not json', { status: 500 })));

    await expect(apiFetch('/api/example')).rejects.toMatchObject({
      status: 500,
      message: '요청을 처리하지 못했습니다.'
    });
  });
});
