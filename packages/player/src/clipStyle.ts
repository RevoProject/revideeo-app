import type { PlayerClip, OutgoingTransition } from './types.js';

export interface ClipStyle {
  transform: string;
  transformOrigin: string;
  opacity: number;
  filter?: string;
  clipPath?: string;
  borderRadius: string;
  width: string;
  height: string;
  objectFit: 'contain' | 'cover';
}

export function computeClipStyle(
  clip: PlayerClip,
  outgoing: OutgoingTransition | undefined,
  frame: number,
): ClipStyle {
  const duration = clip.durationInFrames;
  const transition = clip.transitionIn;
  const transitionDuration = clip.transitionDurationInFrames;
  const progress =
    transition !== 'none' && transitionDuration > 0
      ? Math.min(1, frame / transitionDuration)
      : 1;

  let scale = clip.scale;
  let opacity = 1;
  let translateX = 0;
  let blur = 0;
  let clipPath: string | undefined;

  switch (transition) {
    case 'fade':
      opacity = progress;
      break;
    case 'slide':
      translateX = (1 - progress) * 100;
      opacity = Math.min(1, progress * 1.5);
      break;
    case 'wipe':
      clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
      break;
    case 'push':
      translateX = (1 - progress) * 100;
      opacity = Math.min(1, progress * 1.5);
      break;
    case 'cross-zoom':
      scale = clip.scale * (1.2 - 0.2 * progress);
      opacity = progress;
      break;
    case 'dreamy-zoom':
      scale = clip.scale * (1.35 - 0.35 * progress);
      blur = (1 - progress) * 18;
      opacity = Math.min(1, progress * 2);
      break;
    case 'linear-blur':
      blur = (1 - progress) * 12;
      opacity = 0.35 + 0.65 * progress;
      break;
    case 'film-burn':
      opacity = 0.45 + 0.55 * Math.min(1, progress * 3);
      scale = clip.scale * (1.05 - 0.05 * progress);
      break;
  }

  if (outgoing && outgoing.transitionIn !== 'none' && outgoing.durationInFrames > 0) {
    const outStart = (transition !== 'none' && transitionDuration > 0)
      ? Math.max(duration - outgoing.durationInFrames, transitionDuration)
      : duration - outgoing.durationInFrames;
    const outProgress = Math.max(
      0,
      Math.min(1, (frame - outStart) / outgoing.durationInFrames),
    );
    opacity *= 1 - outProgress;
    if (outgoing.transitionIn === 'push') translateX -= outProgress * 100;
  }

  const fadeIn = clip.fadeInFrames ? Math.min(1, frame / clip.fadeInFrames) : 1;
  const fadeOut = clip.fadeOutFrames
    ? Math.min(1, (duration - frame) / clip.fadeOutFrames)
    : 1;

  const cropTop = clip.cropTop ?? 0;
  const cropRight = clip.cropRight ?? 0;
  const cropBottom = clip.cropBottom ?? 0;
  const cropLeft = clip.cropLeft ?? 0;
  const hasCrop = cropTop > 0 || cropRight > 0 || cropBottom > 0 || cropLeft > 0;
  const crop = hasCrop
    ? `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`
    : undefined;

  return {
    transform: `translateX(${clip.posX}px) translateY(${clip.posY ?? 0}px) translateX(${translateX}%) rotate(${clip.rotation ?? 0}deg) scale(${scale})`,
    transformOrigin: 'center center',
    opacity: opacity * (clip.opacity ?? 1) * fadeIn * fadeOut,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    clipPath: clipPath ?? crop,
    borderRadius: `${clip.borderRadius ?? 0}px`,
    width: `${clip.width ?? 100}%`,
    height: `${clip.height ?? 100}%`,
    objectFit: clip.fitMode ?? 'contain',
  };
}
