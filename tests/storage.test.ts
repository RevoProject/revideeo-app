import { beforeEach, describe, expect, it } from 'vitest';
import { deleteProject, getMedia, listProjects, putMedia, readProjectFile, sha256Hex, upsertProject } from '../src/storage';
import type { StoredProject } from '../src/types';

const project: StoredProject = {
  id: 'project-1',
  name: 'Test project',
  savedAt: 1,
  config: { resolutionLabel: '480p', orientation: '16:9' },
  clips: [],
  assets: [],
  trackCount: 1,
  markers: [],
  trackSettings: [{ name: 'V1', locked: false, muted: false, hidden: false }],
};

const createProjectFile = async (overrides: Record<string, unknown> = {}) => {
  const base = {
    app: 'revideeo',
    version: 1,
    format: 'reevproj',
    name: project.name,
    config: project.config,
    clips: project.clips,
    assets: project.assets,
    trackCount: project.trackCount,
    markers: project.markers,
    trackSettings: project.trackSettings,
    media: {},
    ...overrides,
  };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(base, null, 2)));
  const checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return new File([JSON.stringify({ ...base, checksum }, null, 2)], 'project.reevproj', { type: 'application/json' });
};

describe('project storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and lists project metadata in localStorage', () => {
    upsertProject(project);
    expect(listProjects()).toHaveLength(1);
    expect(listProjects()[0].name).toBe('Test project');
    deleteProject(project.id);
    expect(listProjects()).toHaveLength(0);
  });

  it('round-trips a valid .reevproj payload', async () => {
    const result = await readProjectFile(await createProjectFile());
    expect(result.project.name).toBe('Test project');
    expect(result.project.trackSettings?.[0].name).toBe('V1');
    expect(result.media).toEqual({});
  });

  it('rejects a tampered project checksum', async () => {
    const file = await createProjectFile();
    const tampered = new File([JSON.stringify({ ...(JSON.parse(await file.text())), name: 'tampered' })], 'tampered.reevproj');
    await expect(readProjectFile(tampered)).rejects.toThrow('Suma kontrolna');
  });

  it('stores media blobs in IndexedDB', async () => {
    const blob = new Blob(['video-data'], { type: 'video/mp4' });
    await putMedia('project-media', 'asset-1', blob);
    const stored = await getMedia('project-media', 'asset-1');
    expect(stored).not.toBeNull();
    expect(stored).toBeTruthy();
  });

  it('import dziala bezpiecznie bez crypto.subtle i crypto.randomUUID (http na LAN)', async () => {
    // Symulacja kontekstu niebezpiecznego: crypto.subtle oraz crypto.randomUUID === undefined
    const subtleDescriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'subtle');
    const uuidDescriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
    Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: undefined });
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      // "abc" -> znany wektor SHA-256
      expect(await sha256Hex('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );

      const base = {
        app: 'revideeo',
        version: 1,
        format: 'reevproj',
        name: project.name,
        config: project.config,
        clips: project.clips,
        assets: project.assets,
        trackCount: project.trackCount,
        markers: project.markers,
        trackSettings: project.trackSettings,
        media: {},
      };
      const checksum = await sha256Hex(JSON.stringify(base, null, 2));
      const file = new File([JSON.stringify({ ...base, checksum }, null, 2)], 'project.reevproj', {
        type: 'application/json',
      });
      const result = await readProjectFile(file);
      expect(result.project.name).toBe('Test project');
      expect(result.media).toEqual({});
      expect(result.project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    } finally {
      if (subtleDescriptor) Object.defineProperty(globalThis.crypto, 'subtle', subtleDescriptor);
      if (uuidDescriptor) Object.defineProperty(globalThis.crypto, 'randomUUID', uuidDescriptor);
    }
  });
});
