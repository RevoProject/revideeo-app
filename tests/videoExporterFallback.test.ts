import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/export/renderClient', () => {
  class ManifestEndpointUnavailableError extends Error {}
  return {
    ManifestEndpointUnavailableError,
    exportVideoViaManifest: vi.fn(),
    exportVideoViaRenderServer: vi.fn(),
  };
});

import {
  ManifestEndpointUnavailableError,
  exportVideoViaManifest,
  exportVideoViaRenderServer,
} from '../src/export/renderClient';
import { exportVideo, type VideoExportInput } from '../src/export/videoExporter';

const input: VideoExportInput = {
  clips: [],
  assets: [],
  trackSettings: [],
  width: 640,
  height: 360,
  fps: 30,
  durationInFrames: 1,
  format: 'mp4',
};

describe('exportVideo manifest fallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back when the manifest endpoint is unavailable', async () => {
    const rendered = new Blob(['video']);
    vi.mocked(exportVideoViaManifest).mockRejectedValue(new ManifestEndpointUnavailableError(404));
    vi.mocked(exportVideoViaRenderServer).mockResolvedValue(rendered);

    await expect(exportVideo(input)).resolves.toBe(rendered);
    expect(exportVideoViaRenderServer).toHaveBeenCalledOnce();
  });

  it('does not restart a failed manifest render', async () => {
    vi.mocked(exportVideoViaManifest).mockRejectedValue(new Error('PipelineStatus::PIPELINE_ERROR_READ'));

    await expect(exportVideo(input)).rejects.toThrow('PIPELINE_ERROR_READ');
    expect(exportVideoViaRenderServer).not.toHaveBeenCalled();
  });
});
