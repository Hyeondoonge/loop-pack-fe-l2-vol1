'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/apiFetch';
import { isSafeRedirect } from '@/shared/lib/isSafeRedirect';
import { login } from '../api/login';

const HOME_PATH = '/';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useMutation({ mutationFn: login });

  // next는 비어 있을 수 있고, 로그인 화면은 공개 페이지라 값이 우리가 만든 것이라는 보장이 없다.
  // 값의 출처가 아니라 형태로 판단한다 — 빈 값을 먼저 거르고, 남은 값만 origin 비교로 검증한다.
  function resolveDestination() {
    const next = searchParams.get('next');
    if (!next) {
      return HOME_PATH;
    }

    return isSafeRedirect(next, window.location.origin) ? next : HOME_PATH;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await loginMutation.mutateAsync({ email, password });
      router.push(resolveDestination());
    } catch {
      // loginMutation.error에 담긴 값으로 아래에서 렌더링한다.
    }
  }

  const errorMessage = loginMutation.error instanceof ApiError ? loginMutation.error.message : loginMutation.isError ? '로그인하지 못했습니다.' : '';

  return (
    <form onSubmit={handleSubmit}>
      <label>
        이메일
        <input name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {errorMessage !== '' && <p role="alert">{errorMessage}</p>}
      <button type="submit" disabled={loginMutation.isPending}>
        로그인
      </button>
    </form>
  );
}
