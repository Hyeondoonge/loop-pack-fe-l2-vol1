import { apiFetch } from '@/shared/api/apiFetch';

export type LoginCredentials = {
  email: string;
  password: string;
};

export function login(credentials: LoginCredentials) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials)
  });
}
