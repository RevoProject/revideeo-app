import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ExportFilmModal } from '../src/components/modals/ExportFilmModal';

describe('ONDA export target', () => {
  it('is listed without an online render server', () => {
    const html = renderToString(
      <ExportFilmModal
        totalFrames={30}
        fps={30}
        servers={[]}
        ondaAvailable
        onExport={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('ONDA Native');
    expect(html).toContain('export.renderTargetsLabel');
    expect(html).not.toContain('export.renderOfflineDesc');
  });
});
