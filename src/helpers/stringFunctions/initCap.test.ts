import { initCap } from './initCap';
import { test } from '@jest/globals';

describe('initCap', () => {
  test('capitalizes single word', async () => {
    const res = await initCap('hello');
    expect(res).toBe('Hello');
  });

  test('capitalizes all words', async () => {
    const res = await initCap('hello sir');
    expect(res).toBe('Hello Sir');
  });

  test('doesnt touch numbers', async () => {
    const res = await initCap('hello sir 123');
    expect(res).toBe('Hello Sir 123');
  });

  test('allows only numbers', async () => {
    const res = await initCap('123 123');
    expect(res).toBe('123 123');
  });
});
