import { z, ZodTypeAny } from 'zod';

export function parseInput<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}