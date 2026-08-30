import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <main className="page-container">
      <h1>로그인</h1>
      {/* useSearchParams는 Suspense 경계 안에서만 정적 렌더를 통과한다 */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
