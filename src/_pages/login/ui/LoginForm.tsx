'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, apiFetch } from '@/shared/api/apiFetch';
import { isSafeRedirect } from '@/shared/lib/isSafeRedirect';

const HOME_PATH = '/';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      router.push(resolveDestination());
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '로그인하지 못했습니다.');
      setIsSubmitting(false);
    }
  }

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
      <button type="submit" disabled={isSubmitting}>
        로그인
      </button>
    </form>
  );
}
