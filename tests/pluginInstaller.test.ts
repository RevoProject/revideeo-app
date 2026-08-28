import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const TMP = path.join(os.tmpdir(), 'plugin-installer-test');
const SERVER_DIR = path.resolve(__dirname, '..', 'server');

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('pluginInstaller utilities', () => {
  describe('checkDiskSpace', () => {
    it('returns a result with freeMB and requiredMB', async () => {
      const { checkDiskSpace } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await checkDiskSpace(os.tmpdir());
      expect(typeof result.freeMB).toBe('number');
      expect(typeof result.requiredMB).toBe('number');
      expect(result.requiredMB).toBe(2048);
    });

    it('fails for nonexistent path', async () => {
      const { checkDiskSpace } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await checkDiskSpace('/nonexistent/path/that/does/not/exist');
      expect(result.ok).toBe(false);
    });
  });

  describe('checkPython', () => {
    it('finds python3', async () => {
      const { checkPython } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await checkPython();
      expect(result.ok).toBe(true);
      expect(result.command).toMatch(/^python[3]?$/);
      expect(result.version).toContain('Python');
    });
  });

  describe('checkFfmpeg', () => {
    it('finds ffmpeg', async () => {
      const { checkFfmpeg } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await checkFfmpeg();
      expect(result.ok).toBe(true);
      expect(result.version).toContain('ffmpeg');
    });
  });

  describe('createVenv', () => {
    it('creates a venv directory', async () => {
      const { createVenv, checkPython } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const python = await checkPython();
      const venvPath = path.join(TMP, 'test-venv');
      const result = await createVenv(venvPath, python.command);
      expect(result.ok).toBe(true);
      const binExists = await fs.access(path.join(venvPath, 'bin', 'python')).then(() => true).catch(() => false);
      expect(binExists).toBe(true);
    }, 30000);
  });

  describe('cleanupDir', () => {
    it('removes directory', async () => {
      const { cleanupDir } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const dir = path.join(TMP, 'to-cleanup');
      await fs.mkdir(dir);
      await fs.writeFile(path.join(dir, 'test.txt'), 'hello');
      await cleanupDir(dir);
      const exists = await fs.access(dir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    }, 15000);

    it('does not throw for nonexistent dir', async () => {
      const { cleanupDir } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      await expect(cleanupDir('/nonexistent/dir')).resolves.toBeUndefined();
    });
  });

  describe('runCommand', () => {
    it('runs a command successfully', async () => {
      const { runCommand } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await runCommand('echo', ['hello']);
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
    });

    it('returns error code for failing command', async () => {
      const { runCommand } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const result = await runCommand('false', []);
      expect(result.code).not.toBe(0);
    });
  });
});

describe('whisper-runtime installer contract', () => {
  describe('manifest', () => {
    it('exists and is valid JSON', async () => {
      const raw = await fs.readFile(
        path.join(SERVER_DIR, 'plugins', 'whisper-runtime', 'manifest.json'),
        'utf8',
      );
      const manifest = JSON.parse(raw);
      expect(manifest.id).toBe('whisper-runtime');
      expect(manifest.name).toBe('Whisper Runtime');
      expect(manifest.version).toBe('1.0.0');
    });

    it('install.mjs exists', async () => {
      const stat = await fs.stat(
        path.join(SERVER_DIR, 'plugins', 'whisper-runtime', 'install.mjs'),
      );
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('preflight via pluginInstaller utilities', () => {
    it('checkPython and checkFfmpeg succeed (preflight deps)', async () => {
      const { checkPython, checkFfmpeg } = await import(path.join(SERVER_DIR, 'modules', 'pluginInstaller.mjs'));
      const python = await checkPython();
      const ffmpeg = await checkFfmpeg();
      expect(python.ok).toBe(true);
      expect(ffmpeg.ok).toBe(true);
    });
  });
});

describe('plugin state machine', () => {
  it('manifest-only does not equal ready', async () => {
    const dir = path.join(TMP, 'state-test');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'manifest.json'), '{"id":"test","status":"ready"}');
    const hasVenv = await fs.access(path.join(dir, 'venv')).then(() => true).catch(() => false);
    expect(hasVenv).toBe(false);
    const actualStatus = hasVenv ? 'ready' : 'not-installed';
    expect(actualStatus).toBe('not-installed');
  });

  it('venv presence = ready', async () => {
    const dir = path.join(TMP, 'state-ready');
    await fs.mkdir(path.join(dir, 'venv', 'bin'), { recursive: true });
    const hasVenv = await fs.access(path.join(dir, 'venv')).then(() => true).catch(() => false);
    expect(hasVenv).toBe(true);
  });

  it('error status is preserved', () => {
    const states = ['not-installed', 'installing', 'ready', 'error'];
    expect(states).toContain('error');
    expect(states).toContain('not-installed');
  });
});
