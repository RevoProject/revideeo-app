import { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { NativePlayerProps, NativePlayerHandle, PlayerClip, OutgoingTransition } from './types.js';
import { ClipRenderer } from './ClipRenderer.js';

const groupByTrack = (clips: readonly PlayerClip[]): Map<number, PlayerClip[]> => {
  const grouped = new Map<number, PlayerClip[]>();
  for (const clip of clips) {
    const existing = grouped.get(clip.trackIndex);
    if (existing) {
      existing.push(clip);
    } else {
      grouped.set(clip.trackIndex, [clip as PlayerClip]);
    }
  }
  for (const [, trackClips] of grouped) {
    trackClips.sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
  }
  return grouped;
};

export const NativePlayer = forwardRef<NativePlayerHandle, NativePlayerProps>(
  (
    {
      clips,
      trackSettings,
      compositionWidth,
      compositionHeight,
      durationInFrames,
      fps,
      currentFrame,
      onFrameChange,
      onPlayStateChange,
      style,
    },
    ref,
  ) => {
    const [playing, setPlaying] = useState(false);
    const playingRef = useRef(false);
    const rafRef = useRef(0);
    const lastTimeRef = useRef(0);
    const frameRef = useRef(currentFrame);
    const [displayFrame, setDisplayFrame] = useState(currentFrame);

    if (!playingRef.current) {
      frameRef.current = currentFrame;
    }

    const tracks = useMemo(() => groupByTrack(clips), [clips]);

    const isPortrait = compositionHeight > compositionWidth;
    const clipScale = isPortrait ? 1.2 : 1.15;

    const updateDOM = (frame: number, total: number) => {
      const seekbar = document.querySelector<HTMLInputElement>('[data-testid="timeline-seekbar"]');
      if (seekbar) seekbar.value = String(frame);
      const playhead = document.querySelector<HTMLDivElement>('[data-testid="timeline-playhead"]');
      if (playhead) playhead.style.left = `${(frame / total) * 100}%`;
      const frameLabel = document.querySelector<HTMLSpanElement>('[data-testid="timeline-frame-label"]');
      if (frameLabel) frameLabel.textContent = String(frame);
    };

    useEffect(() => {
      if (!playing) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }

      lastTimeRef.current = performance.now();
      let frameCount = 0;

      const loop = () => {
        if (!playingRef.current) return;
        const now = performance.now();
        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;
        const framesElapsed = (delta / 1000) * fps;
        const next = frameRef.current + framesElapsed;

        if (next >= durationInFrames) {
          playingRef.current = false;
          setPlaying(false);
          frameRef.current = durationInFrames;
          setDisplayFrame(durationInFrames);
          updateDOM(durationInFrames, durationInFrames);
          onFrameChange(durationInFrames);
          onPlayStateChange(false);
          return;
        }

        const newFrame = Math.floor(next);
        frameRef.current = next;

        updateDOM(newFrame, durationInFrames);

        frameCount++;
        if (frameCount % 3 === 0) {
          setDisplayFrame(newFrame);
        }
        if (frameCount % 6 === 0) {
          onFrameChange(newFrame);
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }, [playing, fps, durationInFrames]);

    useImperativeHandle(
      ref,
      () => ({
        toggle() {
          if (playingRef.current) {
            playingRef.current = false;
            setPlaying(false);
            const f = Math.round(frameRef.current);
            setDisplayFrame(f);
            updateDOM(f, durationInFrames);
            onFrameChange(f);
            onPlayStateChange(false);
          } else {
            playingRef.current = true;
            setPlaying(true);
            lastTimeRef.current = performance.now();
            onPlayStateChange(true);
          }
        },
        seekTo(frame: number) {
          const clamped = Math.max(0, Math.min(frame, durationInFrames));
          frameRef.current = clamped;
          setDisplayFrame(clamped);
          updateDOM(clamped, durationInFrames);
          onFrameChange(clamped);
        },
        getCurrentFrame() {
          return Math.round(frameRef.current);
        },
        isPlaying() {
          return playingRef.current;
        },
      }),
      [durationInFrames, onFrameChange, onPlayStateChange],
    );

    const sortedEntries = useMemo(
      () => [...tracks.entries()].sort(([a], [b]) => a - b),
      [tracks],
    );

    if (clips.length === 0) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            ...style,
          }}
        >
          <p
            className={`${isPortrait ? 'text-3xl' : 'text-lg'} font-bold text-gray-500`}
          >
            Brak mediów
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {sortedEntries.map(([trackIndex, trackClips]) => {
          const track = trackSettings[trackIndex];
          const hidden = track?.hidden ?? false;
          return (
            <div
              key={trackIndex}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: trackIndex,
                opacity: hidden ? 0 : 1,
                pointerEvents: hidden ? 'none' : undefined,
              }}
            >
              {trackClips.map((clip, index) => {
                const isVisible =
                  displayFrame >= clip.offsetInTimeline &&
                  displayFrame < clip.offsetInTimeline + clip.durationInFrames;
                if (!isVisible) return null;

                const next = trackClips[index + 1];
                const outgoing: OutgoingTransition | undefined =
                  next &&
                  next.offsetInTimeline < clip.offsetInTimeline + clip.durationInFrames
                    ? {
                        transitionIn: next.transitionIn,
                        durationInFrames: next.transitionDurationInFrames,
                      }
                    : undefined;

                const isMedia = clip.type !== 'text' && clip.type !== 'audio';
                const scaledClip: PlayerClip = isMedia
                  ? { ...clip, scale: (clip.scale ?? 1) * clipScale }
                  : clip;

                const localFrame = displayFrame - clip.offsetInTimeline;

                return (
                  <div
                    key={clip.id}
                    style={{
                      position: 'absolute',
                      inset: 0,
                    }}
                  >
                    <ClipRenderer
                      clip={scaledClip}
                      outgoing={outgoing}
                      muted={track?.muted ?? false}
                      frame={localFrame}
                      playing={playingRef.current}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
);

NativePlayer.displayName = 'NativePlayer';
