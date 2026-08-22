import { useRef, useEffect } from 'react';
import type { PlayerClip, OutgoingTransition } from './types.js';
import { computeClipStyle } from './clipStyle.js';

interface ClipRendererProps {
  clip: PlayerClip;
  outgoing?: OutgoingTransition;
  muted: boolean;
  frame: number;
  playing: boolean;
}

export const ClipRenderer = ({ clip, outgoing, muted, frame, playing }: ClipRendererProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const style = computeClipStyle(clip, outgoing, frame);

  const audioFadeIn = clip.audioFadeInFrames
    ? Math.min(1, frame / clip.audioFadeInFrames)
    : 1;
  const audioFadeOut = clip.audioFadeOutFrames
    ? Math.min(1, (clip.durationInFrames - frame) / clip.audioFadeOutFrames)
    : 1;
  const volume = muted ? 0 : (clip.volume ?? 1) * audioFadeIn * audioFadeOut;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const desired = (clip.startFrame + frame) / 30;
    if (playing) {
      if (Math.abs(el.currentTime - desired) > 0.15) {
        el.currentTime = desired;
      }
      el.play().catch(() => {});
    } else {
      el.pause();
      if (Math.abs(el.currentTime - desired) > 0.15) {
        el.currentTime = desired;
      }
    }
  }, [playing, frame, clip.startFrame]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const desired = (clip.startFrame + frame) / 30;
    el.volume = Math.max(0, Math.min(1, volume));
    if (playing) {
      if (Math.abs(el.currentTime - desired) > 0.15) {
        el.currentTime = desired;
      }
      el.play().catch(() => {});
    } else {
      el.pause();
      if (Math.abs(el.currentTime - desired) > 0.15) {
        el.currentTime = desired;
      }
    }
  }, [playing, frame, clip.startFrame, volume]);

  if (clip.type === 'text') {
    return (
      <div
        style={{
          ...style,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            clip.textAlign === 'left'
              ? 'flex-start'
              : clip.textAlign === 'right'
                ? 'flex-end'
                : 'center',
          color: clip.textColor ?? '#ffffff',
          fontFamily: clip.fontFamily ?? 'Inter, sans-serif',
          fontSize: clip.fontSize ?? 64,
          fontWeight: clip.fontWeight ?? 600,
          textAlign: clip.textAlign ?? 'center',
          backgroundColor: clip.textBackground ?? 'transparent',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.1,
          padding: '0 12px',
          pointerEvents: 'none',
        }}
      >
        {clip.text ?? 'Tekst'}
      </div>
    );
  }

  if (clip.type === 'image') {
    return <img src={clip.url ?? ''} style={style as React.CSSProperties} alt="" />;
  }

  if (clip.type === 'audio') {
    return (
      <audio ref={audioRef} src={clip.url} loop={false} style={{ display: 'none' }} />
    );
  }

  if (!clip.url) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />;
  }

  return (
    <video
      ref={videoRef}
      src={clip.url}
      muted={volume === 0}
      loop={false}
      style={style as React.CSSProperties}
      preload="auto"
    />
  );
};
