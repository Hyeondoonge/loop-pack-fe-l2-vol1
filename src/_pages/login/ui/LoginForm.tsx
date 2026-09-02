'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authQueries } from '@/entities/auth';
import { ApiError } from '@/shared/api/apiFetch';
import { resolveLoginDestination } from '../lib/resolveLoginDestination';
import { login } from '../api/login';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useMutation({ mutationFn: login });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await loginMutation.mutateAsync({ email, password });
      void queryClient.invalidateQueries({ queryKey: authQueries.all() });
      //  로그인 화면은 스토리에 남지 않는다
      router.replace(resolveLoginDestination(searchParams.get('next'), window.location.origin));
    } catch {
      // loginMutation.error에 담긴 값으로 아래에서 렌더링한다.
    }
  }

  const errorMessage = loginMutation.error instanceof ApiError ? loginMutation.error.message : loginMutation.isError ? '로그인하지 못했습니다.' : '';

  return (
    <form className="login-form" onSubmit={handleSubmit}>
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
