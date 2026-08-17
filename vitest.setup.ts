import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/shared/mocks/node';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
