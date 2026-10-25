import { it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
it('all self-hosted font URLs resolve to included files', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const urls = [...css.matchAll(/url\(['"]?(\/fonts\/[^)'" ]+)/g)].map((m) => m[1]);
  expect(urls).toHaveLength(8);
  for (const url of urls) expect(existsSync(join('public', url))).toBe(true);
});
it('every shipped photo in the asset manifest exists', () => {
  const files = readdirSync('public/images').filter((f) => f.endsWith('.webp'));
  expect(files.length).toBeGreaterThanOrEqual(20);
  for (const file of files) {
    const data = readFileSync(join('public/images', file));
    expect(data.subarray(0, 4).toString()).toBe('RIFF');
    expect(data.subarray(8, 12).toString()).toBe('WEBP');
  }
});
