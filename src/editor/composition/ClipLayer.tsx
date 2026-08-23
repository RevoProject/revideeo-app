/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { Audio, Img, Video } from 'remotion';
import type { OutgoingTransition, RenderClip } from '../editorTypes';
import { getClipStyle } from './transitionStyles';
import { useTranslation } from '../../i18n';

export const ClipLayer = ({ clip, outgoing, muted, frame }: { clip: RenderClip; outgoing?: OutgoingTransition; muted: boolean; frame: number }) => {
  const { t } = useTranslation();
  const style = getClipStyle(clip, outgoing, frame);
  if (clip.type === 'text') {
    return <div style={{ ...style, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: clip.textAlign === 'left' ? 'flex-start' : clip.textAlign === 'right' ? 'flex-end' : 'center', color: clip.textColor ?? '#ffffff', fontFamily: clip.fontFamily ?? 'Inter, sans-serif', fontSize: clip.fontSize ?? 64, fontWeight: clip.fontWeight ?? 600, textAlign: clip.textAlign ?? 'center', backgroundColor: clip.textBackground ?? 'transparent', whiteSpace: 'pre-wrap', lineHeight: 1.1, padding: '0 12px', pointerEvents: 'none' }}>{clip.text ?? t('props.standardText')}</div>;
  }
  if (clip.type === 'image') return <Img src={clip.url ?? ''} style={style} />;
  if (!clip.url) return <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />;
  const audioFadeIn = clip.audioFadeInFrames ? Math.min(1, frame / clip.audioFadeInFrames) : 1;
  const audioFadeOut = clip.audioFadeOutFrames ? Math.min(1, (clip.durationInFrames - frame) / clip.audioFadeOutFrames) : 1;
  const volume = muted ? 0 : (clip.volume ?? 1) * audioFadeIn * audioFadeOut;
  if (clip.type === 'audio') return <Audio src={clip.url} playbackRate={clip.playbackRate ?? 1} volume={volume} startFrom={clip.startFrame} />;
  return <Video src={clip.url} startFrom={clip.startFrame} playbackRate={clip.playbackRate ?? 1} volume={volume} delayRenderTimeoutInMilliseconds={120000} style={style} />;
};
