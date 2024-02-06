import { replaceColonsWithBrackets } from './replaceColonsWithBrackets';
import { test } from '@jest/globals';

describe('initCap', () => {
    test('leaves text as is',  async () => {
        const res = await replaceColonsWithBrackets('hello');
        expect(res).toBe('hello');
    });

    test('leaves text as is with dots',  async () => {
        const res = await replaceColonsWithBrackets('hello.world');
        expect(res).toBe('hello.world');
    });

    test('replaces colons',  async () => {
        const res = await replaceColonsWithBrackets('hello.world:magic');
        expect(res).toBe('hello.world[magic]');
    });
});