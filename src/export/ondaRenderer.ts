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
  type VideoSample,
} from 'mediabunny';
import type { StoredClip } from '../types';
import type { VideoExportInput } from './videoExporter';

interface OndaFormat {
  format: Mp4OutputFormat | WebMOutputFormat;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  mimeType: string;
}

interface VisualAsset {
  input?: Input;
  sink?: VideoSampleSink;
  image?: ImageBitmap;
}

const getFormat = (format: VideoExportInput['format']): OndaFormat => {
  if (format === 'mp4') return { format: new Mp4OutputFormat({ fastStart: 'in-memory' }), videoCodec: 'avc', audioCodec: 'aac', mimeType: 'video/mp4' };
  if (format === 'webm') return { format: new WebMOutputFormat(), videoCodec: 'vp8', audioCodec: 'opus', mimeType: 'video/webm' };
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

const getTransitionState = (clip: StoredClip, next: StoredClip | undefined, localFrame: number) => {
  const progress = clip.transitionIn !== 'none' && clip.transitionDurationInFrames > 0
    ? Math.min(1, localFrame / clip.transitionDurationInFrames)
    : 1;
  let scale = clip.scale;
  let opacity = 1;
  let translateX = 0;
  let blur = 0;
  let wipe = 0;
  switch (clip.transitionIn) {
    case 'fade': opacity = progress; break;
    case 'slide':
    case 'push': translateX = (1 - progress) * 100; opacity = Math.min(1, progress * 1.5); break;
    case 'wipe': wipe = 1 - progress; break;
    case 'cross-zoom': scale *= 1.2 - 0.2 * progress; opacity = progress; break;
    case 'dreamy-zoom': scale *= 1.35 - 0.35 * progress; blur = (1 - progress) * 18; opacity = Math.min(1, progress * 2); break;
    case 'linear-blur': blur = (1 - progress) * 12; opacity = 0.35 + 0.65 * progress; break;
    case 'film-burn': opacity = 0.45 + 0.55 * Math.min(1, progress * 3); scale *= 1.05 - 0.05 * progress; break;
  }
  if (next && next.transitionIn !== 'none' && next.transitionDurationInFrames > 0) {
    const outStart = clip.transitionIn !== 'none' && clip.transitionDurationInFrames > 0
      ? Math.max(clip.durationInFrames - next.transitionDurationInFrames, clip.transitionDurationInFrames)
      : clip.durationInFrames - next.transitionDurationInFrames;
    const outProgress = Math.max(0, Math.min(1, (localFrame - outStart) / next.transitionDurationInFrames));
    opacity *= 1 - outProgress;
    if (next.transitionIn === 'push') translateX -= outProgress * 100;
  }
  const fadeIn = clip.fadeInFrames ? Math.min(1, localFrame / clip.fadeInFrames) : 1;
  const fadeOut = clip.fadeOutFrames ? Math.min(1, (clip.durationInFrames - localFrame) / clip.fadeOutFrames) : 1;
  return { scale, opacity: opacity * (clip.opacity ?? 1) * fadeIn * fadeOut, translateX, blur, wipe };
};

const drawFitted = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource | VideoSample,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: 'contain' | 'cover',
): void => {
  const rect = getOndaDrawRect(sourceWidth, sourceHeight, targetWidth, targetHeight, fit);
  if ('draw' in source) source.draw(context, rect.x, rect.y, rect.width, rect.height);
  else context.drawImage(source, rect.x, rect.y, rect.width, rect.height);
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

const drawClip = async (
  context: CanvasRenderingContext2D,
  clip: StoredClip,
  next: StoredClip | undefined,
  localFrame: number,
  fps: number,
  width: number,
  height: number,
  asset: VisualAsset | undefined,
): Promise<void> => {
  if (clip.type === 'audio') return;
  const state = getTransitionState(clip, next, localFrame);
  if (state.opacity <= 0) return;
  const boxWidth = width * ((clip.width ?? 100) / 100);
  const boxHeight = height * ((clip.height ?? 100) / 100);
  context.save();
  context.translate(width / 2 + clip.posX + boxWidth * state.translateX / 100, height / 2 + (clip.posY ?? 0));
  context.rotate((clip.rotation ?? 0) * Math.PI / 180);
  context.scale(state.scale, state.scale);
  context.globalAlpha = Math.max(0, Math.min(1, state.opacity));
  context.filter = state.blur > 0 ? `blur(${state.blur}px)` : 'none';
  const cropLeft = boxWidth * (clip.cropLeft ?? 0) / 100;
  const cropRight = boxWidth * (clip.cropRight ?? 0) / 100;
  const cropTop = boxHeight * (clip.cropTop ?? 0) / 100;
  const cropBottom = boxHeight * (clip.cropBottom ?? 0) / 100;
  const clipX = -boxWidth / 2 + cropLeft;
  const clipY = -boxHeight / 2 + cropTop;
  const clipWidth = Math.max(0, boxWidth * (1 - state.wipe) - cropLeft - cropRight);
  const clipHeight = Math.max(0, boxHeight - cropTop - cropBottom);
  context.beginPath();
  context.roundRect(clipX, clipY, clipWidth, clipHeight, clip.borderRadius ?? 0);
  context.clip();

  if (clip.type === 'text') {
    context.fillStyle = clip.textBackground ?? 'transparent';
    context.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    context.fillStyle = clip.textColor ?? '#ffffff';
    context.font = `${clip.fontWeight ?? 700} ${clip.fontSize ?? 48}px ${clip.fontFamily ?? 'Inter, sans-serif'}`;
    context.textAlign = clip.textAlign ?? 'center';
    context.textBaseline = 'middle';
    const x = clip.textAlign === 'left' ? -boxWidth / 2 : clip.textAlign === 'right' ? boxWidth / 2 : 0;
    context.fillText(clip.text ?? '', x, 0, boxWidth);
  } else if (asset?.image) {
    drawFitted(context, asset.image, asset.image.width, asset.image.height, boxWidth, boxHeight, clip.fitMode ?? 'contain');
  } else if (asset?.sink) {
    const sourceTime = (clip.startFrame + localFrame * (clip.playbackRate ?? 1)) / fps;
    const sample = await asset.sink.getSample(sourceTime);
    if (sample) {
      drawFitted(context, sample, sample.displayWidth, sample.displayHeight, boxWidth, boxHeight, clip.fitMode ?? 'contain');
      sample.close();
    }
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

  const target = new BufferTarget();
  const output = new Output({ format: config.format, target });
  const videoSource = new CanvasSource(canvas, { codec: config.videoCodec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: input.fps });
  const audioMix = await mixAudio(input, rangeStart, frameCount);
  let audioSource: OndaAudioSource | null = null;
  if (audioMix) {
    if (!await canEncodeAudio(config.audioCodec, { numberOfChannels: 2, sampleRate: audioMix.sampleRate })) {
      throw new Error(`ONDA: przeglądarka nie obsługuje kodeka audio ${config.audioCodec}.`);
    }
    audioSource = new OndaAudioSource({ codec: config.audioCodec, bitrate: QUALITY_HIGH });
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
    const nextByClip = new Map<string, StoredClip>();
    for (const trackIndex of new Set(visible.map((clip) => clip.trackIndex))) {
      const trackClips = visible.filter((clip) => clip.trackIndex === trackIndex).sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
      for (let index = 0; index < trackClips.length - 1; index += 1) nextByClip.set(trackClips[index].id, trackClips[index + 1]);
    }
    for (let index = 0; index < frameCount; index += 1) {
      checkAborted(input.signal);
      const timelineFrame = rangeStart + index;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.filter = 'none';
      context.fillStyle = '#000000';
      context.fillRect(0, 0, input.width, input.height);
      for (const clip of visible) {
        const localFrame = timelineFrame - clip.offsetInTimeline;
        if (localFrame < 0 || localFrame >= clip.durationInFrames) continue;
        await drawClip(context, clip, nextByClip.get(clip.id), localFrame, input.fps, input.width, input.height, visualAssets.get(clip.sourceId));
      }
      await videoSource.add(index / input.fps, 1 / input.fps, { keyFrame: index % Math.max(1, Math.round(input.fps * 2)) === 0 });
      input.onProgress?.((index + 1) / frameCount);
    }
    videoSource.close();
    await output.finalize();
    if (!target.buffer) throw new Error('ONDA: encoder nie zwrócił danych wyjściowych.');
    return new Blob([target.buffer], { type: config.mimeType });
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
