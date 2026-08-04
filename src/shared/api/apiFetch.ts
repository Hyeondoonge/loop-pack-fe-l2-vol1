// AI 생성
export type ApiErrorResponse = {
  message: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const message = await res
      .json()
      .then((body: ApiErrorResponse) => body.message)
      .catch(() => '요청을 처리하지 못했습니다.');
    throw new ApiError(res.status, message);
  }

  return res.json();
}
