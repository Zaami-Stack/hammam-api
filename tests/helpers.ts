import { Test } from 'supertest';
import request from 'supertest';
import { app } from '../src/app';

const headers = { 'X-Requested-With': 'XMLHttpRequest' };

export function client() {
  const agent = request.agent(app);
  return {
    agent,
    get: (url: string): Test => agent.get(url).set(headers),
    post: (url: string): Test => agent.post(url).set(headers),
    put: (url: string): Test => agent.put(url).set(headers),
    patch: (url: string): Test => agent.patch(url).set(headers),
    delete: (url: string): Test => agent.delete(url).set(headers),
  };
}

export async function loginAs(email: string, password: string) {
  const c = client();
  const res = await c.post('/api/auth/login').send({ email, password });
  return { c, res };
}