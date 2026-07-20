import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './apiFetch';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on a 2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 1 })
      })
    );

    await expect(apiFetch('/api/example')).resolves.toEqual({ value: 1 });
  });

  it('throws ApiError with the response status and message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: '요청 조건을 확인해주세요.' })
      })
    );

    await expect(apiFetch('/api/example')).rejects.toMatchObject({
      status: 400,
      message: '요청 조건을 확인해주세요.'
    });
    await expect(apiFetch('/api/example')).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to a default message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json'))
      })
    );

    await expect(apiFetch('/api/example')).rejects.toMatchObject({
      status: 500,
      message: '요청을 처리하지 못했습니다.'
    });
  });
});
