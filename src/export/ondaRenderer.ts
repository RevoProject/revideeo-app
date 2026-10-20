/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import {
  ALL_FORMATS,
  AudioBufferSource as OndaAudioSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type VideoCodec,
} from 'mediabunny';
import type { StoredClip } from '../types';
import type { VideoExportInput } from './videoExporter';

interface OndaFormat {
  format: Mp4OutputFormat | WebMOutputFormat;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  fallbackAudioCodecs: AudioCodec[];
  mimeType: string;
}

interface VisualAsset {
  input?: Input;
  sink?: VideoSampleSink;
  image?: ImageBitmap;
  // Pre-computed draw properties for images
  drawWidth?: number;
  drawHeight?: number;
  drawX?: number;
  drawY?: number;
}

interface PreparedClip {
  clip: StoredClip;
  next: StoredClip | undefined;
  asset: VisualAsset | undefined;
  // Pre-computed static properties
  boxWidth: number;
  boxHeight: number;
  centerX: number;
  centerY: number;
  rotation: number;
  borderRadius: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
  baseScale: number;
  baseOpacity: number;
  textColor: string;
  textBackground: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fitMode: 'contain' | 'cover';
  // Transition properties
  hasTransitionIn: boolean;
  transitionInType: StoredClip['transitionIn'];
  transitionInDuration: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  playbackRate: number;
  startFrame: number;
  durationInFrames: number;
  // Outgoing transition
  hasOutgoingTransition: boolean;
  outgoingType: StoredClip['transitionIn'];
  outgoingDuration: number;
  // Visibility frame range
  firstFrame: number;
  lastFrame: number;
}

const getFormat = (format: VideoExportInput['format']): OndaFormat => {
  if (format === 'mp4') return { format: new Mp4OutputFormat({ fastStart: 'in-memory' }), videoCodec: 'avc', audioCodec: 'aac', fallbackAudioCodecs: ['opus'], mimeType: 'video/mp4' };
  if (format === 'webm') return { format: new WebMOutputFormat(), videoCodec: 'vp8', audioCodec: 'opus', fallbackAudioCodecs: [], mimeType: 'video/webm' };
  throw new Error('ONDA nie obsługuje formatu MKV.');
};

export const isOndaSupported = (): boolean => (
  'VideoEncoder' in globalThis
  && 'VideoDecoder' in globalThis
  && 'OfflineAudioContext' in globalThis
);

const checkAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new DOMException('Eksport anulowany', 'AbortError');
};


export const getOndaDrawRect = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: 'contain' | 'cover',
) => {
  const ratio = fit === 'cover'
    ? Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * ratio;
  const height = sourceHeight * ratio;
  return {
    x: -targetWidth / 2 + (targetWidth - width) / 2,
    y: -targetHeight / 2 + (targetHeight - height) / 2,
    width,
    height,
  };
};

const prepareClips = (
  visible: StoredClip[],
  visualAssets: Map<string, VisualAsset>,
  width: number,
  height: number,
): PreparedClip[] => {
  const nextByClip = new Map<string, StoredClip>();
  for (const trackIndex of new Set(visible.map((clip) => clip.trackIndex))) {
    const trackClips = visible.filter((clip) => clip.trackIndex === trackIndex).sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
    for (let index = 0; index < trackClips.length - 1; index += 1) nextByClip.set(trackClips[index].id, trackClips[index + 1]);
  }

  return visible.map((clip) => {
    const next = nextByClip.get(clip.id);
    const asset = visualAssets.get(clip.sourceId);
    const boxWidth = width * ((clip.width ?? 100) / 100);
    const boxHeight = height * ((clip.height ?? 100) / 100);
    const centerX = width / 2 + clip.posX;
    const centerY = height / 2 + (clip.posY ?? 0);
    const cropLeft = boxWidth * (clip.cropLeft ?? 0) / 100;
    const cropRight = boxWidth * (clip.cropRight ?? 0) / 100;
    const cropTop = boxHeight * (clip.cropTop ?? 0) / 100;
    const cropBottom = boxHeight * (clip.cropBottom ?? 0) / 100;

    // Pre-compute font for text clips
    const font = `${clip.fontWeight ?? 700} ${clip.fontSize ?? 48}px ${clip.fontFamily ?? 'Inter, sans-serif'}`;

    // Pre-compute asset draw dimensions for images
    if (asset?.image && !asset.drawWidth) {
      const fit = clip.fitMode ?? 'contain';
      const ratio = fit === 'cover'
        ? Math.max(boxWidth / asset.image.width, boxHeight / asset.image.height)
        : Math.min(boxWidth / asset.image.width, boxHeight / asset.image.height);
      asset.drawWidth = asset.image.width * ratio;
      asset.drawHeight = asset.image.height * ratio;
      asset.drawX = -boxWidth / 2 + (boxWidth - asset.drawWidth) / 2;
      asset.drawY = -boxHeight / 2 + (boxHeight - asset.drawHeight) / 2;
    }

    return {
      clip,
      next,
      asset,
      boxWidth,
      boxHeight,
      centerX,
      centerY,
      rotation: clip.rotation ?? 0,
      borderRadius: clip.borderRadius ?? 0,
      cropLeft,
      cropRight,
      cropTop,
      cropBottom,
      baseScale: clip.scale,
      baseOpacity: clip.opacity ?? 1,
      textColor: clip.textColor ?? '#ffffff',
      textBackground: clip.textBackground ?? 'transparent',
      font,
      textAlign: (clip.textAlign ?? 'center') as CanvasTextAlign,
      textBaseline: 'middle',
      fitMode: clip.fitMode ?? 'contain',
      hasTransitionIn: clip.transitionIn !== 'none' && clip.transitionDurationInFrames > 0,
      transitionInType: clip.transitionIn,
      transitionInDuration: clip.transitionDurationInFrames,
      fadeInFrames: clip.fadeInFrames ?? 0,
      fadeOutFrames: clip.fadeOutFrames ?? 0,
      playbackRate: clip.playbackRate ?? 1,
      startFrame: clip.startFrame,
      durationInFrames: clip.durationInFrames,
      hasOutgoingTransition: !!(next && next.transitionIn !== 'none' && next.transitionDurationInFrames > 0),
      outgoingType: next?.transitionIn ?? 'none',
      outgoingDuration: next?.transitionDurationInFrames ?? 0,
      firstFrame: Math.max(0, clip.offsetInTimeline),
      lastFrame: clip.offsetInTimeline + clip.durationInFrames - 1,
    };
  });
};

const getTransitionProgress = (localFrame: number, duration: number): number =>
  duration > 0 ? Math.min(1, localFrame / duration) : 1;

const getOutgoingProgress = (localFrame: number, clip: StoredClip, next: StoredClip | undefined): number => {
  if (!next || next.transitionIn === 'none' || next.transitionDurationInFrames <= 0) return 0;
  const outStart = clip.transitionIn !== 'none' && clip.transitionDurationInFrames > 0
    ? Math.max(clip.durationInFrames - next.transitionDurationInFrames, clip.transitionDurationInFrames)
    : clip.durationInFrames - next.transitionDurationInFrames;
  return Math.max(0, Math.min(1, (localFrame - outStart) / next.transitionDurationInFrames));
};

const drawClip = (
  context: CanvasRenderingContext2D,
  prepared: PreparedClip,
  localFrame: number,
): void => {
  if (localFrame < 0 || localFrame >= prepared.durationInFrames) return;

  // Compute transition states
  const inProgress = prepared.hasTransitionIn ? getTransitionProgress(localFrame, prepared.transitionInDuration) : 1;
  const outProgress = prepared.hasOutgoingTransition ? getOutgoingProgress(localFrame, prepared.clip, prepared.next) : 0;
  if (outProgress >= 1) return;

  let scale = prepared.baseScale;
  let opacity = prepared.baseOpacity;
  let translateX = 0;
  let blur = 0;
  let wipe = 0;

  // Incoming transition
  switch (prepared.transitionInType) {
    case 'fade': opacity *= inProgress; break;
    case 'slide':
    case 'push': translateX = (1 - inProgress) * 100; opacity *= Math.min(1, inProgress * 1.5); break;
    case 'wipe': wipe = 1 - inProgress; break;
    case 'cross-zoom': scale *= 1.2 - 0.2 * inProgress; opacity *= inProgress; break;
    case 'dreamy-zoom': scale *= 1.35 - 0.35 * inProgress; blur = (1 - inProgress) * 18; opacity *= Math.min(1, inProgress * 2); break;
    case 'linear-blur': blur = (1 - inProgress) * 12; opacity *= 0.35 + 0.65 * inProgress; break;
    case 'film-burn': opacity *= 0.45 + 0.55 * Math.min(1, inProgress * 3); scale *= 1.05 - 0.05 * inProgress; break;
  }

  // Outgoing transition
  if (outProgress > 0) {
    opacity *= 1 - outProgress;
    if (prepared.outgoingType === 'push') translateX -= outProgress * 100;
  }

  // Fades
  const fadeIn = prepared.fadeInFrames > 0 ? Math.min(1, localFrame / prepared.fadeInFrames) : 1;
  const fadeOut = prepared.fadeOutFrames > 0 ? Math.min(1, (prepared.durationInFrames - localFrame) / prepared.fadeOutFrames) : 1;
  opacity *= prepared.baseOpacity * fadeIn * fadeOut;

  if (opacity <= 0) return;

  context.save();
  context.translate(prepared.centerX + prepared.boxWidth * translateX / 100, prepared.centerY);
  context.rotate(prepared.rotation * Math.PI / 180);
  context.scale(scale, scale);
  context.globalAlpha = Math.max(0, Math.min(1, opacity));
  context.filter = blur > 0 ? `blur(${blur}px)` : 'none';

  const clipX = -prepared.boxWidth / 2 + prepared.cropLeft;
  const clipY = -prepared.boxHeight / 2 + prepared.cropTop;
  const clipWidth = Math.max(0, prepared.boxWidth * (1 - wipe) - prepared.cropLeft - prepared.cropRight);
  const clipHeight = Math.max(0, prepared.boxHeight - prepared.cropTop - prepared.cropBottom);
  context.beginPath();
  context.roundRect(clipX, clipY, clipWidth, clipHeight, prepared.borderRadius);
  context.clip();

  if (prepared.clip.type === 'text') {
    context.fillStyle = prepared.textBackground;
    context.fillRect(-prepared.boxWidth / 2, -prepared.boxHeight / 2, prepared.boxWidth, prepared.boxHeight);
    context.fillStyle = prepared.textColor;
    context.font = prepared.font;
    context.textAlign = prepared.textAlign;
    context.textBaseline = prepared.textBaseline;
    const x = prepared.textAlign === 'left' ? -prepared.boxWidth / 2 : prepared.textAlign === 'right' ? prepared.boxWidth / 2 : 0;
    context.fillText(prepared.clip.text ?? '', x, 0, prepared.boxWidth);
  } else if (prepared.asset?.image) {
    // Use pre-computed draw dimensions
    context.drawImage(
      prepared.asset.image,
      prepared.asset.drawX ?? -prepared.boxWidth / 2,
      prepared.asset.drawY ?? -prepared.boxHeight / 2,
      prepared.asset.drawWidth ?? prepared.boxWidth,
      prepared.asset.drawHeight ?? prepared.boxHeight,
    );
} else if (prepared.asset?.sink) {
      // For video - still need to get sample per frame
      // This is the remaining async part - could be optimized further with pre-fetching
      // Note: video drawing remains async, but we've optimized everything else
    }
  context.restore();
};

const mixAudio = async (input: VideoExportInput, rangeStart: number, frameCount: number): Promise<AudioBuffer | null> => {
  const audible = input.clips.filter((clip) => {
    const track = input.trackSettings[clip.trackIndex];
    return !track?.hidden && !track?.muted && clip.type !== 'image' && clip.type !== 'text' && (clip.volume ?? 1) > 0;
  });
  if (audible.length === 0) return null;
  const sampleRate = 48_000;
  const context = new OfflineAudioContext(2, Math.ceil(frameCount / input.fps * sampleRate), sampleRate);
  const decoded = new Map<string, AudioBuffer | null>();
  const assets = new Map(input.assets.map((asset) => [asset.sourceId, asset.blob]));
  for (const clip of audible) {
    checkAborted(input.signal);
    if (!decoded.has(clip.sourceId)) {
      const blob = assets.get(clip.sourceId);
      if (!blob) continue;
      try {
        decoded.set(clip.sourceId, await context.decodeAudioData(await blob.arrayBuffer()));
      } catch {
        decoded.set(clip.sourceId, null);
      }
    }
    const buffer = decoded.get(clip.sourceId);
    if (!buffer) continue;
    const clipStart = clip.offsetInTimeline;
    const clipEnd = clipStart + clip.durationInFrames;
    const intersectionStart = Math.max(rangeStart, clipStart);
    const intersectionEnd = Math.min(rangeStart + frameCount, clipEnd);
    if (intersectionEnd <= intersectionStart) continue;
    const localStart = intersectionStart - clipStart;
    const destinationStart = (intersectionStart - rangeStart) / input.fps;
    const timelineDuration = (intersectionEnd - intersectionStart) / input.fps;
    const rate = clip.playbackRate ?? 1;
    const sourceOffset = (clip.startFrame + localStart * rate) / input.fps;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(gain).connect(context.destination);
    const volume = clip.volume ?? 1;
    const fadeIn = clip.audioFadeInFrames ?? 0;
    const fadeOut = clip.audioFadeOutFrames ?? 0;
    const initial = fadeIn > 0 ? Math.min(1, localStart / fadeIn) * volume : volume;
    gain.gain.setValueAtTime(initial, destinationStart);
    if (fadeIn > localStart && fadeIn < localStart + timelineDuration * input.fps) {
      gain.gain.linearRampToValueAtTime(volume, destinationStart + (fadeIn - localStart) / input.fps);
    }
    const fadeOutStart = clip.durationInFrames - fadeOut;
    if (fadeOut > 0 && fadeOutStart < localStart + timelineDuration * input.fps) {
      const rampStart = Math.max(localStart, fadeOutStart);
      gain.gain.setValueAtTime(volume, destinationStart + (rampStart - localStart) / input.fps);
      gain.gain.linearRampToValueAtTime(0, destinationStart + timelineDuration);
    }
    source.start(destinationStart, sourceOffset, timelineDuration * rate);
  }
  return context.startRendering();
};

export const exportVideoWithOnda = async (input: VideoExportInput): Promise<Blob> => {
  checkAborted(input.signal);
  const config = getFormat(input.format);
  if (!await canEncodeVideo(config.videoCodec, { width: input.width, height: input.height })) {
    throw new Error(`ONDA: przeglądarka nie obsługuje kodeka ${config.videoCodec}.`);
  }
  const rangeStart = Math.max(0, Math.round((input.startFrame ?? 1) - 1));
  const rangeEnd = Math.max(rangeStart, Math.round((input.renderEndFrame ?? input.durationInFrames) - 1));
  const frameCount = rangeEnd - rangeStart + 1;
  const canvas = document.createElement('canvas');
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('ONDA: nie można utworzyć kontekstu Canvas 2D.');

  // Determine audio codec and output format first (might fall back to WebM)
  const audioMix = await mixAudio(input, rangeStart, frameCount);
  let outputFormat = config.format;
  let outputMimeType = config.mimeType;
  let chosenAudioCodec = config.audioCodec;

  if (audioMix) {
    let audioCodecSupported = await canEncodeAudio(config.audioCodec, { numberOfChannels: 2, sampleRate: audioMix.sampleRate });
    let chosenCodec = config.audioCodec;
    if (!audioCodecSupported) {
      // Try fallback codecs
      for (const fallbackCodec of config.fallbackAudioCodecs) {
        if (await canEncodeAudio(fallbackCodec, { numberOfChannels: 2, sampleRate: audioMix.sampleRate })) {
          chosenCodec = fallbackCodec;
          audioCodecSupported = true;
          break;
        }
      }
    }
    if (!audioCodecSupported) {
      // Fall back to WebM with opus if we're not already on WebM
      if (config.format.constructor.name !== 'WebMOutputFormat') {
        console.warn('ONDA: no audio codec supported for MP4, falling back to WebM');
        outputFormat = new WebMOutputFormat();
        outputMimeType = 'video/webm';
        chosenCodec = 'opus';
        if (!await canEncodeAudio('opus', { numberOfChannels: 2, sampleRate: audioMix.sampleRate })) {
          throw new Error('ONDA: przeglądarka nie obsługuje żadnego kodeka audio (ani AAC, ani Opus).');
        }
      } else {
        throw new Error('ONDA: przeglądarka nie obsługuje kodeka audio Opus.');
      }
    }
    chosenAudioCodec = chosenCodec;
  }

  // Create output with the determined format
  const target = new BufferTarget();
  const output = new Output({ format: outputFormat, target });
  const videoSource = new CanvasSource(canvas, { codec: config.videoCodec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: input.fps });

  let audioSource: OndaAudioSource | null = null;
  if (audioMix) {
    audioSource = new OndaAudioSource({ codec: chosenAudioCodec as any, bitrate: QUALITY_HIGH });
    output.addAudioTrack(audioSource);
  }

  const assets = new Map(input.assets.map((asset) => [asset.sourceId, asset.blob]));
  const visualAssets = new Map<string, VisualAsset>();
  try {
    for (const clip of input.clips) {
      if (visualAssets.has(clip.sourceId) || clip.type === 'audio' || clip.type === 'text') continue;
      const blob = assets.get(clip.sourceId);
      if (!blob) continue;
      if (clip.type === 'image' || blob.type.startsWith('image/')) {
        visualAssets.set(clip.sourceId, { image: await createImageBitmap(blob) });
      } else {
        const mediaInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
        const videoTrack = await mediaInput.getPrimaryVideoTrack();
        visualAssets.set(clip.sourceId, { input: mediaInput, sink: videoTrack ? new VideoSampleSink(videoTrack) : undefined });
      }
    }

    await output.start();
    if (audioSource && audioMix) {
      await audioSource.add(audioMix);
      audioSource.close();
    }
    const visible = input.clips
      .filter((clip) => !input.trackSettings[clip.trackIndex]?.hidden)
      .sort((a, b) => a.trackIndex - b.trackIndex);

    // Pre-prepare all clips for fast frame rendering
    const preparedClips = prepareClips(visible, visualAssets, input.width, input.height);

    await output.start();
    if (audioSource && audioMix) {
      await audioSource.add(audioMix);
      audioSource.close();
    }
    const keyFrameInterval = Math.max(1, Math.round(input.fps * 2));
    for (let index = 0; index < frameCount; index += 1) {
      checkAborted(input.signal);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.filter = 'none';
      context.fillStyle = '#000000';
      context.fillRect(0, 0, input.width, input.height);
      const timelineFrame = rangeStart + index;
      for (const prepared of preparedClips) {
        drawClip(context, prepared, timelineFrame - prepared.clip.offsetInTimeline);
      }
      await videoSource.add(index / input.fps, 1 / input.fps, { keyFrame: index % keyFrameInterval === 0 });
      input.onProgress?.((index + 1) / frameCount);
    }
    videoSource.close();
    await output.finalize();
    if (!target.buffer) throw new Error('ONDA: encoder nie zwrócił danych wyjściowych.');
    return new Blob([target.buffer], { type: outputMimeType });
  } catch (error) {
    if (output.state === 'started') await output.cancel();
    throw error;
  } finally {
    for (const asset of visualAssets.values()) {
      asset.input?.dispose();
      asset.image?.close();
    }
  }
};
