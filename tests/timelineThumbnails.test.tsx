import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';

/**
 * Helper: render a React element to a DOM string, then parse it into a JSDOM
 * so we can run real DOM queries (querySelector, textContent, etc.).
 */
const renderToDOM = (element: React.ReactElement) => {
  const html = renderToString(element);
  const dom = new JSDOM(html);
  return dom.window.document;
};

// ---------------------------------------------------------------------------
// TimelineClip badge tests
// ---------------------------------------------------------------------------

// We test the badge rendering logic by importing the component source directly.
// Because TimelineClip depends on useTranslation (React context), we test the
// rendered HTML strings for the badge markup.

import { TimelineClip } from '../src/editor/timeline/components/TimelineClip';

const baseClipProps = {
  index: 0,
  assetName: 'test-asset',
  showName: true,
  trimStart: 0,
  trimEnd: 1,
  isSelected: false,
  locked: false,
  hasTransition: false,
  transitionLeft: '0%',
  transitionWidth: '0%',
  transitionTitle: '',
  left: '0%',
  width: '50%',
  onContextMenu: () => {},
  onDoubleClick: () => {},
  onPointerDown: () => {},
  onClick: () => {},
  onTrimLeftPointerDown: () => {},
  onTrimRightPointerDown: () => {},
  onTransitionPointerDown: () => {},
  onTransitionDoubleClick: () => {},
};

import type { StoredClip } from '../src/types';

const makeClip = (type: StoredClip['type'], overrides: Partial<StoredClip> = {}): StoredClip => ({
  id: 'c1',
  sourceId: 'a1',
  startFrame: 0,
  durationInFrames: 150,
  offsetInTimeline: 0,
  trackIndex: 0,
  posX: 0,
  posY: 0,
  scale: 1,
  type,
  transitionIn: 'none',
  transitionDurationInFrames: 0,
  ...overrides,
});

describe('TimelineClip type badges', () => {
  it('renders a video badge for video clips', () => {
    const clip = makeClip('video');
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    // The video badge uses the "media.video" translation key which resolves to "VIDEO"
    // and uses the Film icon + blue badge
    expect(html).toContain('media.video');
    expect(html).toContain('bg-blue-950/80');
  });

  it('renders an audio badge for audio clips', () => {
    const clip = makeClip('audio');
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    expect(html).toContain('media.audio');
    expect(html).toContain('bg-pink-950/80');
  });

  it('renders an image badge for image clips', () => {
    const clip = makeClip('image');
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    expect(html).toContain('media.image');
    expect(html).toContain('bg-amber-950/80');
  });

  it('renders a text badge for text clips', () => {
    const clip = makeClip('text', { text: 'Hello' });
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    expect(html).toContain('media.text');
    expect(html).toContain('bg-blue-950/80');
  });
});

// ---------------------------------------------------------------------------
// ClipThumbnailStrip tests
// ---------------------------------------------------------------------------

import { ClipThumbnailStrip } from '../src/editor/timeline/components/ClipThumbnailStrip';

describe('ClipThumbnailStrip', () => {
  it('renders thumbnail images when thumbnails are provided', () => {
    const thumbnails = ['data:image/jpeg;base64,abc', 'data:image/jpeg;base64,def', 'data:image/jpeg;base64,ghi'];
    const html = renderToString(
      <ClipThumbnailStrip clipId="c1" thumbnails={thumbnails} trimStart={0} trimEnd={1} />
    );
    const doc = renderToDOM(
      <ClipThumbnailStrip clipId="c1" thumbnails={thumbnails} trimStart={0} trimEnd={1} />
    );
    const imgs = doc.querySelectorAll('img');
    expect(imgs.length).toBe(3);
    expect(html).toContain('data:image/jpeg;base64,abc');
  });

  it('returns null (renders nothing) when thumbnails array is empty', () => {
    const html = renderToString(
      <ClipThumbnailStrip clipId="c1" thumbnails={[]} trimStart={0} trimEnd={1} />
    );
    expect(html).toBe('');
  });

  it('video clips with thumbnails render strip; video clips without thumbnails render nothing', () => {
    const withThumbs = renderToString(
      <ClipThumbnailStrip clipId="v1" thumbnails={['thumb1.jpg', 'thumb2.jpg']} trimStart={0} trimEnd={1} />
    );
    const withoutThumbs = renderToString(
      <ClipThumbnailStrip clipId="v2" thumbnails={[]} trimStart={0} trimEnd={1} />
    );
    expect(withThumbs).toContain('img');
    expect(withoutThumbs).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Track name preservation on import (stepExecutor-level)
// ---------------------------------------------------------------------------

import { executeOperation, type ExecutionContext } from '../src/juicer/stepExecutor';

describe('video track name preservation', () => {
  it('add_clip does not overwrite existing track name with filename', () => {
    const ctx: ExecutionContext = {
      clips: [],
      trackCount: 1,
      trackSettings: [{ name: 'Main Video', locked: false, muted: false, hidden: false }],
      fps: 30,
      attachmentNames: { att_000: 'my-video.mp4' },
      attachmentKinds: { att_000: 'video' },
    };
    const result = executeOperation(
      { id: 'op1', type: 'add_clip', params: { sourceId: 'att_000', trackIndex: 0, offsetInTimeline: 0 } },
      ctx,
    );
    expect(result.trackSettings[0].name).toBe('Main Video');
  });

  it('add_clip still references the correct source file', () => {
    const ctx: ExecutionContext = {
      clips: [],
      trackCount: 1,
      trackSettings: [{ name: 'Main Video', locked: false, muted: false, hidden: false }],
      fps: 30,
      attachmentNames: { att_000: 'my-video.mp4' },
      attachmentKinds: { att_000: 'video' },
    };
    const result = executeOperation(
      { id: 'op1', type: 'add_clip', params: { sourceId: 'att_000', trackIndex: 0, offsetInTimeline: 0 } },
      ctx,
    );
    expect(result.clips[0].sourceId).toBe('att_000');
  });
});

// ---------------------------------------------------------------------------
// Image tracks remain unchanged
// ---------------------------------------------------------------------------

describe('image tracks remain unchanged', () => {
  it('image clip uses amber badge styling', () => {
    const clip = makeClip('image');
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    expect(html).toContain('bg-amber-700/40');
    expect(html).toContain('bg-amber-950/80');
  });

  it('image clip does not render video badge', () => {
    const clip = makeClip('image');
    const html = renderToString(
      <TimelineClip
        clip={clip}
        thumbnails={[]}
        {...baseClipProps}
      />
    );
    expect(html).not.toContain('bg-blue-950/80');
  });
});
