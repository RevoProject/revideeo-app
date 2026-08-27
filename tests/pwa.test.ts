import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PWA service worker versioning', () => {
  it('public/sw.js template contains v4 placeholder', () => {
    const sw = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');
    expect(sw).toContain("CACHE_NAME = 'revideeo-v4'");
    expect(sw).toContain("STATIC_CACHE = 'revideeo-static-v4'");
  });

  it('dist/sw.js contains version-injected cache names after build', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const sw = readFileSync(join(process.cwd(), 'dist', 'sw.js'), 'utf8');
    expect(sw).toContain(`CACHE_NAME = 'revideeo-v${pkg.version}'`);
    expect(sw).toContain(`STATIC_CACHE = 'revideeo-static-v${pkg.version}'`);
    expect(sw).not.toContain('revideeo-v4');
  });

  it('dist/sw.js retains core SW functionality', () => {
    const sw = readFileSync(join(process.cwd(), 'dist', 'sw.js'), 'utf8');
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('clients.claim');
    expect(sw).toContain('addEventListener');
  });

  it('version.json matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const versionJson = JSON.parse(readFileSync(join(process.cwd(), 'public', 'version.json'), 'utf8'));
    expect(versionJson.version).toBe(pkg.version);
  });

  it('APP_VERSION matches package.json version', async () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const { APP_VERSION } = await import('../src/pwa.js');
    expect(APP_VERSION).toBe(pkg.version);
  });
});
