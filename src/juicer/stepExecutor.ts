/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { StoredClip, TrackSettings } from '../types';

export interface JuicerOperation {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface JuicerPlanResponse {
  status: 'plan_ready' | 'clarification_required';
  summary?: string;
  question?: string;
  operations?: JuicerOperation[];
}

export interface ExecutionContext {
  clips: StoredClip[];
  trackCount: number;
  trackSettings: TrackSettings[];
  fps: number;
  resolution?: string;
  orientation?: string;
  attachmentNames?: Record<string, string>;
  attachmentKinds?: Record<string, string>;
  attachmentDurations?: Record<string, number>;
}

export interface StepResult {
  clips: StoredClip[];
  trackCount: number;
  trackSettings: TrackSettings[];
  message: string;
}

const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const opSetProjectConfig = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const parts: string[] = [];
  if (params.orientation) parts.push(`orientacja: ${params.orientation}`);
  if (params.resolution) parts.push(`rozdzielczość: ${params.resolution}`);
  if (params.fps) parts.push(`FPS: ${params.fps}`);
  return { ...ctx, message: `Ustawiono projekt: ${parts.join(', ') || 'bez zmian'}` };
};

const opAddTrack = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const name = (params.name as string) ?? `Ścieżka ${ctx.trackCount + 1}`;
  return {
    clips: ctx.clips,
    trackCount: ctx.trackCount + 1,
    trackSettings: [...ctx.trackSettings, { name, locked: false, muted: false, hidden: false }],
    message: `Dodano ścieżkę: ${name}`,
  };
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac']);

const guessTypeFromFilename = (name: string): 'image' | 'video' | 'audio' | undefined => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return undefined;
};

const opAddClip = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const sourceId = (params.sourceId as string) ?? (params.attachmentId as string) ?? makeId();
  let trackIndex = (params.trackIndex as number) ?? 0;
  const offsetInTimeline = (params.offsetInTimeline as number) ?? 0;
  const startFrame = (params.startFrame as number) ?? 0;
  const knownDuration = ctx.attachmentDurations?.[sourceId];
  const durationInFrames = (params.durationInFrames as number) ?? knownDuration ?? ctx.fps * 3;

  const clipType = (ctx.attachmentKinds?.[sourceId] as StoredClip['type'])
    ?? guessTypeFromFilename(ctx.attachmentNames?.[sourceId] ?? sourceId)
    ?? 'video';

  if (clipType === 'audio') {
    const hasVideo = ctx.clips.some((c) => c.trackIndex === trackIndex && c.type !== 'audio');
    if (hasVideo) {
      trackIndex = ctx.trackCount;
    }
  } else {
    const hasAudio = ctx.clips.some((c) => c.trackIndex === trackIndex && c.type === 'audio');
    if (hasAudio) {
      trackIndex = Math.max(trackIndex + 1, 1);
      while (ctx.clips.some((c) => c.trackIndex === trackIndex)) trackIndex++;
    }
  }

  const newClip: StoredClip = {
    id: makeId(), type: clipType, sourceId, trackIndex, offsetInTimeline, startFrame, durationInFrames,
    scale: 1, posX: 0, posY: 0, transitionIn: 'none', transitionDurationInFrames: 0,
  };

  const newClips = [...ctx.clips, newClip].sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);
  const name = ctx.attachmentNames?.[sourceId] ?? sourceId;
  const cleanName = name.replace(/\.[^.]+$/, '');

  return { ...ctx, clips: newClips, message: `Dodano ${clipType} ${cleanName} na ścieżce ${trackIndex + 1} (${(durationInFrames / ctx.fps).toFixed(1)}s)` };
};

const opMoveClip = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const offset = params.offsetInTimeline as number;
  const trackIndex = params.trackIndex as number | undefined;

  const newClips = ctx.clips.map((c) => {
    if (c.id !== clipId && c.sourceId !== clipId) return c;
    return { ...c, offsetInTimeline: offset ?? c.offsetInTimeline, trackIndex: trackIndex ?? c.trackIndex };
  });
  return { ...ctx, clips: newClips, message: `Przesunięto klip ${clipId.slice(0, 8)}` };
};

const opSplitClip = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const atFrame = (params.atFrame as number) ?? 0;

  const clip = ctx.clips.find((c) => c.id === clipId || c.sourceId === clipId);
  if (!clip) return { ...ctx, message: `Nie znaleziono klipu ${clipId}` };

  const splitPoint = Math.max(clip.startFrame + 1, Math.min(atFrame, clip.startFrame + clip.durationInFrames - 1));
  const firstDur = splitPoint - clip.startFrame;
  const secondDur = clip.durationInFrames - firstDur;

  const clip1: StoredClip = { ...clip, id: clip.id, durationInFrames: firstDur };
  const clip2: StoredClip = {
    ...clip, id: makeId(), startFrame: splitPoint, durationInFrames: secondDur,
    offsetInTimeline: clip.offsetInTimeline + firstDur,
  };

  const newClips = ctx.clips.filter((c) => c.id !== clip.id && c.sourceId !== clip.id);
  newClips.push(clip1, clip2);
  newClips.sort((a, b) => a.offsetInTimeline - b.offsetInTimeline);

  return { ...ctx, clips: newClips, message: `Rozcięto klip w klatce ${splitPoint}` };
};

const opTrimClip = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const clip = ctx.clips.find((c) => c.id === clipId || c.sourceId === clipId);
  if (!clip) return { ...ctx, message: `Nie znaleziono klipu ${clipId}` };

  const newStart = (params.startFrame as number) ?? clip.startFrame;
  const newEnd = (params.endFrame as number) ?? (clip.startFrame + clip.durationInFrames);
  const newDuration = Math.max(1, newEnd - newStart);

  const newClips = ctx.clips.map((c) => {
    if (c.id !== clip.id && c.sourceId !== clip.id) return c;
    return { ...c, startFrame: newStart, durationInFrames: newDuration };
  });

  const trimmedFrames = clip.durationInFrames - newDuration;
  return { ...ctx, clips: newClips, message: `Przycięto klip: ${Math.round(trimmedFrames / ctx.fps * 10) / 10}s (start: ${newStart}, dur: ${newDuration})` };
};

const opRemoveClip = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const newClips = ctx.clips.filter((c) => c.id !== clipId && c.sourceId !== clipId);
  return { ...ctx, clips: newClips, message: `Usunięto klip ${clipId.slice(0, 8)}` };
};

const ALLOWED_CLIP_PROPS = new Set([
  'posX', 'posY', 'scale', 'rotation', 'opacity',
  'width', 'height', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom',
  'playbackRate', 'volume', 'fadeInFrames', 'fadeOutFrames',
]);

const opSetClipProperties = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const changes = (params.changes ?? params) as Record<string, unknown>;
  const newClips = ctx.clips.map((c) => {
    if (c.id !== clipId && c.sourceId !== clipId) return c;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      if (ALLOWED_CLIP_PROPS.has(key)) patch[key] = value;
    }
    return { ...c, ...patch };
  });
  const changed = Object.keys(changes).filter((k) => ALLOWED_CLIP_PROPS.has(k)).join(', ');
  return { ...ctx, clips: newClips, message: `Zmieniono właściwości klipu: ${changed || 'brak zmian'}` };
};

const opCreateText = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const text = (params.text as string) ?? 'Tekst';
  const trackIndex = (params.trackIndex as number) ?? ctx.trackCount;
  const offsetInTimeline = (params.offsetInTimeline as number) ?? 0;
  const durationInFrames = (params.durationInFrames as number) ?? ctx.fps * 3;

  const newTrackSettings = trackIndex >= ctx.trackCount
    ? [...ctx.trackSettings, { name: 'Tekst', locked: false, muted: false, hidden: false }]
    : ctx.trackSettings;

  const newClip: StoredClip = {
    id: makeId(), type: 'text', sourceId: makeId(), trackIndex, offsetInTimeline,
    startFrame: 0, durationInFrames, scale: 1, posX: params.posX as number ?? 0, posY: params.posY as number ?? 0,
    width: 80, height: 16, text, fontSize: (params.fontSize as number) ?? 48,
    fontWeight: (params.fontWeight as number) ?? 600, textColor: (params.textColor as string) ?? '#ffffff',
    textAlign: (params.textAlign as 'left' | 'center' | 'right') ?? 'center',
    transitionIn: 'none', transitionDurationInFrames: 0, opacity: 1,
  };

  return {
    clips: [...ctx.clips, newClip],
    trackCount: Math.max(ctx.trackCount, trackIndex + 1),
    trackSettings: newTrackSettings,
    message: `Dodano tekst: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
  };
};

const opAddTransition = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const type = (params.type as string) ?? 'fade';
  const duration = (params.durationInFrames as number) ?? 15;

  const newClips = ctx.clips.map((c) => {
    if (c.id !== clipId && c.sourceId !== clipId) return c;
    return { ...c, transitionIn: type as StoredClip['transitionIn'], transitionDurationInFrames: duration };
  });
  return { ...ctx, clips: newClips, message: `Dodano przejście ${type} (${duration} klatek)` };
};

const opAddAudio = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const sourceId = (params.sourceId as string) ?? (params.attachmentId as string) ?? makeId();

  const offsetInTimeline = (params.offsetInTimeline as number) ?? 0;
  const startFrame = (params.startFrame as number) ?? 0;
  const knownDuration = ctx.attachmentDurations?.[sourceId];
  const durationInFrames = (params.durationInFrames as number) ?? knownDuration ?? ctx.fps * 30;
  const volume = (params.volume as number) ?? 0.8;

  const audioName = (ctx.attachmentNames?.[sourceId] ?? sourceId).replace(/\.[^.]+$/, '');

  let targetTrack = 0;
  const hasVideoOnTrack0 = ctx.clips.some((c) => c.trackIndex === 0 && c.type !== 'audio');
  if (hasVideoOnTrack0) {
    targetTrack = ctx.trackCount;
  }
  const hasAudioOnTrack0 = ctx.clips.some((c) => c.trackIndex === 0 && c.type === 'audio');
  if (hasAudioOnTrack0) {
    targetTrack = 1;
    while (ctx.clips.some((c) => c.trackIndex === targetTrack)) targetTrack++;
  }

  const newClip: StoredClip = {
    id: makeId(), type: 'audio', sourceId, trackIndex: targetTrack, offsetInTimeline, startFrame, durationInFrames,
    scale: 1, posX: 0, posY: 0, volume, transitionIn: 'none', transitionDurationInFrames: 0,
  };

  const newTrackSettings = [...ctx.trackSettings];
  if (targetTrack >= ctx.trackCount) {
    newTrackSettings.push({ name: `Ścieżka ${targetTrack + 1}`, locked: false, muted: false, hidden: false });
  }

  return {
    clips: [...ctx.clips, newClip],
    trackCount: Math.max(ctx.trackCount, targetTrack + 1),
    trackSettings: newTrackSettings,
    message: `Dodano audio ${audioName} na ścieżce ${targetTrack + 1} (${(durationInFrames / ctx.fps).toFixed(0)}s, głośność ${Math.round(volume * 100)}%)`,
  };
};

const opSetClipName = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const name = params.name as string;
  if (!clipId || !name) return { ...ctx, message: 'Brak clipId lub name' };
  const newClips = ctx.clips.map((c) => {
    if (c.id !== clipId && c.sourceId !== clipId) return c;
    return { ...c, displayName: name };
  });
  return { ...ctx, clips: newClips, message: `Nazwano klip: ${name}` };
};

const opSetAudioName = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const clipId = params.clipId as string;
  const name = params.name as string;
  if (!clipId || !name) return { ...ctx, message: 'Brak clipId lub name' };
  const newClips = ctx.clips.map((c) => {
    if ((c.id !== clipId && c.sourceId !== clipId) || c.type !== 'audio') return c;
    return { ...c, displayName: name };
  });
  return { ...ctx, clips: newClips, message: `Nazwano audio: ${name}` };
};

const opSetTrackName = (ctx: ExecutionContext, params: Record<string, unknown>): StepResult => {
  const trackIndex = params.trackIndex as number;
  const name = params.name as string;
  const newSettings = ctx.trackSettings.map((s, i) => i === trackIndex ? { ...s, name } : s);
  return { ...ctx, trackSettings: newSettings, message: `Nazwano ścieżkę ${trackIndex + 1}: ${name}` };
};

const opSetMarkers = (ctx: ExecutionContext, _params: Record<string, unknown>): StepResult => {
  return { ...ctx, message: 'Ustawiono markery' };
};

const OPERATIONS: Record<string, (ctx: ExecutionContext, params: Record<string, unknown>) => StepResult> = {
  set_project_config: opSetProjectConfig,
  add_track: opAddTrack,
  add_clip: opAddClip,
  move_clip: opMoveClip,
  split_clip: opSplitClip,
  trim_clip: opTrimClip,
  remove_clip: opRemoveClip,
  set_clip_properties: opSetClipProperties,
  create_text: opCreateText,
  add_transition: opAddTransition,
  add_audio: opAddAudio,
  set_clip_name: opSetClipName,
  set_audio_name: opSetAudioName,
  set_track_name: opSetTrackName,
  set_markers: opSetMarkers,
};

export const executeOperation = (op: JuicerOperation, ctx: ExecutionContext): StepResult => {
  const executor = OPERATIONS[op.type];
  if (executor) return executor(ctx, op.params ?? {});
  return { ...ctx, message: `${op.type} — nieznana operacja, pominięto` };
};

const resolveClipIds = (operations: JuicerOperation[], attachmentNames?: Record<string, string>, attachmentDurations?: Record<string, number>, fps: number = 30): Record<string, string> => {
  const mapping: Record<string, string> = {};
  let clipIdx = 0;
  const attachmentKeys = attachmentNames ? Object.keys(attachmentNames).filter((k) => k.startsWith('att_')).sort() : [];

  const filenameToAttId: Record<string, string> = {};
  if (attachmentNames) {
    for (const [attId, filename] of Object.entries(attachmentNames)) {
      if (attId.startsWith('att_') && !filenameToAttId[filename]) {
        filenameToAttId[filename] = attId;
        filenameToAttId[filename.toLowerCase()] = attId;
      }
    }
  }

  for (const op of operations) {
    if (op.type === 'add_clip' || op.type === 'add_audio') {
      let src = (op.params.sourceId as string) ?? (op.params.attachmentId as string);

      if (src && filenameToAttId[src]) {
        src = filenameToAttId[src];
        op.params.sourceId = src;
      }

      if (!src && clipIdx < attachmentKeys.length) {
        src = attachmentKeys[clipIdx];
        op.params.sourceId = src;
        op.params.trackIndex = op.params.trackIndex ?? (op.type === 'add_audio' ? 2 : 0);
        op.params.offsetInTimeline = op.params.offsetInTimeline ?? 0;
        op.params.startFrame = op.params.startFrame ?? 0;
      }

      if (src) {
        const knownDuration = attachmentDurations?.[src];
        if (op.type === 'add_audio') {
          op.params.durationInFrames = op.params.durationInFrames ?? knownDuration ?? 900;
          op.params.volume = op.params.volume ?? 0.25;
        } else {
          op.params.durationInFrames = op.params.durationInFrames ?? knownDuration ?? (fps * 3);
        }
        clipIdx++;
        mapping[`clip_${String(clipIdx).padStart(3, '0')}`] = src;
        mapping[op.id] = src;
      }
    }
    if (op.type === 'create_text') {
      mapping[op.id] = op.id;
    }
  }
  return mapping;
};

const applyClipIdMapping = (params: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> => {
  const result = { ...params };
  if (result.clipId && typeof result.clipId === 'string' && mapping[result.clipId]) {
    result.clipId = mapping[result.clipId];
  }
  return result;
};

export const executeOperations = async (
  operations: JuicerOperation[],
  ctx: ExecutionContext,
  onStep: (index: number, result: StepResult) => void,
): Promise<{ clips: StoredClip[]; trackCount: number; trackSettings: TrackSettings[] }> => {
  const clipMapping = resolveClipIds(operations, ctx.attachmentNames, ctx.attachmentDurations, ctx.fps);
  let current: ExecutionContext = { ...ctx };
  for (let i = 0; i < operations.length; i++) {
    const mappedParams = applyClipIdMapping(operations[i].params ?? {}, clipMapping);
    const resolvedOp = { ...operations[i], params: mappedParams };
    const result = executeOperation(resolvedOp, current);
    current = { clips: result.clips, trackCount: result.trackCount, trackSettings: result.trackSettings, fps: ctx.fps, attachmentNames: ctx.attachmentNames, attachmentKinds: ctx.attachmentKinds, attachmentDurations: ctx.attachmentDurations };
    onStep(i, result);
    await new Promise((r) => setTimeout(r, 200));
  }
  if (current.trackCount < 1) {
    current.trackCount = 1;
    if (current.trackSettings.length < 1) {
      current.trackSettings = [{ name: 'Ścieżka 1', locked: false, muted: false, hidden: false }];
    }
  }
  return { clips: current.clips, trackCount: current.trackCount, trackSettings: current.trackSettings };
};
