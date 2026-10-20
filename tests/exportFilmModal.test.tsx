import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ExportFilmModal } from '../src/components/modals/ExportFilmModal';

describe('ExportFilmModal rendering engines', () => {
  it('offers browser rendering without an online server', () => {
    const html = renderToString(
      <ExportFilmModal
        totalFrames={30}
        fps={30}
        servers={[]}
        browserRenderingAvailable
        onExport={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('export.renderWithoutServer');
    expect(html).toContain('export.renderEngine');
    expect(html).not.toContain('export.renderOfflineDesc');
  });
});
