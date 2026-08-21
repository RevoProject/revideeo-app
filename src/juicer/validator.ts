import type { JuicerOperation } from './stepExecutor';
import type { StoredClip, TrackSettings } from '../types';
import { getMaxTracks } from '../capabilities';

const ALLOWED_OPERATIONS = new Set([
  'set_project_config', 'add_track', 'add_clip', 'move_clip', 'split_clip', 'trim_clip',
  'remove_clip', 'set_clip_properties', 'create_text', 'add_transition',
  'add_audio', 'set_track_name', 'set_clip_name', 'set_audio_name', 'set_markers',
]);

const ALLOWED_CLIP_PROPS = new Set([
  'posX', 'posY', 'scale', 'rotation', 'opacity',
  'width', 'height', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom',
  'playbackRate', 'volume', 'fadeInFrames', 'fadeOutFrames',
]);

const VALID_TRANSITIONS = new Set([
  'none', 'fade', 'slide', 'wipe', 'push', 'cross-zoom', 'dreamy-zoom', 'linear-blur', 'film-burn',
]);

export interface ValidationError {
  operationId: string;
  type: 'schema' | 'permission' | 'state' | 'range';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  cleanedOperations: JuicerOperation[];
}

const validateSchema = (op: unknown): op is JuicerOperation => {
  if (!op || typeof op !== 'object') return false;
  const o = op as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.type !== 'string') return false;
  if (o.params !== undefined && (typeof o.params !== 'object' || o.params === null)) return false;
  return true;
};

const REQUIRED_PARAMS: Record<string, string[]> = {
  add_clip: ['sourceId', 'attachmentId'],
  add_audio: ['sourceId', 'attachmentId'],
  move_clip: ['clipId'],
  split_clip: ['clipId', 'atFrame'],
  trim_clip: ['clipId'],
  remove_clip: ['clipId'],
  set_clip_properties: ['clipId'],
  add_transition: ['clipId', 'type'],
  create_text: ['text'],
  set_project_config: [],
  add_track: [],
  set_track_name: ['trackIndex', 'name'],
  set_markers: ['markers'],
};

const validatePermission = (op: JuicerOperation): ValidationError | null => {
  if (!ALLOWED_OPERATIONS.has(op.type)) {
    return { operationId: op.id, type: 'permission', message: `Operacja "${op.type}" nie jest dozwolona` };
  }
  const required = REQUIRED_PARAMS[op.type];
  if (required && required.length > 0) {
    const p = op.params ?? {};
    const hasAny = required.some((k) => p[k] !== undefined && p[k] !== null && p[k] !== '');
    if (!hasAny) {
      return { operationId: op.id, type: 'schema', message: `Operacja "${op.type}" wymaga jednego z: ${required.join(', ')}` };
    }
  }
  return null;
};

const validateState = (op: JuicerOperation, ctx: { clips: StoredClip[]; trackCount: number; trackSettings: TrackSettings[] }, knownIds?: Set<string>): ValidationError | null => {
  const p = op.params;

  if (['move_clip', 'split_clip', 'trim_clip', 'remove_clip', 'set_clip_properties', 'add_transition'].includes(op.type)) {
    const clipId = p.clipId as string;
    if (!clipId || typeof clipId !== 'string') {
      return { operationId: op.id, type: 'state', message: `Brak clipId` };
    }
    const exists = ctx.clips.some((c) => c.id === clipId || c.sourceId === clipId) || knownIds?.has(clipId) || /^clip_\d+$/.test(clipId) || /^op_\d+$/.test(clipId) || /^att_\d+$/.test(clipId);
    if (!exists) {
      return { operationId: op.id, type: 'state', message: `Klip "${clipId}" nie istnieje w projekcie` };
    }
  }

  if (op.type === 'add_clip' || op.type === 'add_audio') {
    const trackIndex = (p.trackIndex as number) ?? 0;
    if (trackIndex < 0 || trackIndex > getMaxTracks()) {
      return { operationId: op.id, type: 'state', message: `Nieprawidłowy trackIndex: ${trackIndex} (max: ${getMaxTracks()})` };
    }
  }

  if (op.type === 'create_text') {
    const trackIndex = (p.trackIndex as number) ?? ctx.trackCount;
    if (trackIndex < 0 || trackIndex > getMaxTracks() + 1) {
      return { operationId: op.id, type: 'state', message: `Nieprawidłowy trackIndex: ${trackIndex} (max captions: ${getMaxTracks() + 1})` };
    }
  }

  if (op.type === 'add_track') {
    if (ctx.trackCount >= getMaxTracks()) {
      return { operationId: op.id, type: 'state', message: `Osiągnięto limit ścieżek (${getMaxTracks()})` };
    }
  }

  if (op.type === 'set_track_name') {
    const trackIndex = p.trackIndex as number;
    if (typeof trackIndex !== 'number' || trackIndex < 0 || trackIndex >= ctx.trackSettings.length) {
      return { operationId: op.id, type: 'state', message: `Ścieżka ${trackIndex} nie istnieje` };
    }
  }

  return null;
};

const validateRange = (op: JuicerOperation): ValidationError | null => {
  const p = op.params;

  if (op.type === 'set_clip_properties') {
    const changes = (p.changes ?? p) as Record<string, unknown>;

    for (const key of Object.keys(changes)) {
      if (!ALLOWED_CLIP_PROPS.has(key)) {
        return { operationId: op.id, type: 'permission', message: `Właściwość "${key}" nie jest dozwolona w set_clip_properties` };
      }
    }

    if (changes.volume !== undefined) {
      const v = changes.volume as number;
      if (typeof v !== 'number' || v < 0 || v > 2) {
        return { operationId: op.id, type: 'range', message: `volume musi być 0–2, otrzymano: ${v}` };
      }
    }
    if (changes.opacity !== undefined) {
      const v = changes.opacity as number;
      if (typeof v !== 'number' || v < 0 || v > 1) {
        return { operationId: op.id, type: 'range', message: `opacity musi być 0–1, otrzymano: ${v}` };
      }
    }
    if (changes.scale !== undefined) {
      const v = changes.scale as number;
      if (typeof v !== 'number' || v < 0.1 || v > 10) {
        return { operationId: op.id, type: 'range', message: `scale musi być 0.1–10, otrzymano: ${v}` };
      }
    }
    if (changes.fadeInFrames !== undefined) {
      const v = changes.fadeInFrames as number;
      if (typeof v !== 'number' || v < 0 || v > 300) {
        return { operationId: op.id, type: 'range', message: `fadeInFrames musi być 0–300, otrzymano: ${v}` };
      }
    }
    if (changes.fadeOutFrames !== undefined) {
      const v = changes.fadeOutFrames as number;
      if (typeof v !== 'number' || v < 0 || v > 300) {
        return { operationId: op.id, type: 'range', message: `fadeOutFrames musi być 0–300, otrzymano: ${v}` };
      }
    }
    if (changes.playbackRate !== undefined) {
      const v = changes.playbackRate as number;
      if (typeof v !== 'number' || v < 0.1 || v > 4) {
        return { operationId: op.id, type: 'range', message: `playbackRate musi być 0.1–4, otrzymano: ${v}` };
      }
    }
  }

  if (op.type === 'add_audio') {
    if (p.volume !== undefined) {
      const v = p.volume as number;
      if (typeof v !== 'number' || v < 0 || v > 2) {
        return { operationId: op.id, type: 'range', message: `volume musi być 0–2, otrzymano: ${v}` };
      }
    }
    if (p.durationInFrames !== undefined) {
      const v = p.durationInFrames as number;
      if (typeof v !== 'number' || v < 1 || v > 30 * 60 * 60 * 30) {
        return { operationId: op.id, type: 'range', message: `durationInFrames nieprawidłowe: ${v}` };
      }
    }
  }

  if (op.type === 'add_clip') {
    if (p.durationInFrames !== undefined) {
      const v = p.durationInFrames as number;
      if (typeof v !== 'number' || v < 1) {
        return { operationId: op.id, type: 'range', message: `durationInFrames musi być > 0, otrzymano: ${v}` };
      }
    }
    if (p.offsetInTimeline !== undefined) {
      const v = p.offsetInTimeline as number;
      if (typeof v !== 'number' || v < 0) {
        return { operationId: op.id, type: 'range', message: `offsetInTimeline musi być >= 0, otrzymano: ${v}` };
      }
    }
  }

  if (op.type === 'create_text') {
    if (p.fontSize !== undefined) {
      const v = p.fontSize as number;
      if (typeof v !== 'number' || v < 8 || v > 200) {
        return { operationId: op.id, type: 'range', message: `fontSize musi być 8–200, otrzymano: ${v}` };
      }
    }
    if (p.durationInFrames !== undefined) {
      const v = p.durationInFrames as number;
      if (typeof v !== 'number' || v < 1) {
        return { operationId: op.id, type: 'range', message: `durationInFrames musi być > 0, otrzymano: ${v}` };
      }
    }
  }

  if (op.type === 'add_transition') {
    if (p.type !== undefined && !VALID_TRANSITIONS.has(p.type as string)) {
      return { operationId: op.id, type: 'range', message: `Nieprawidłowy typ przejścia: ${p.type}` };
    }
    if (p.durationInFrames !== undefined) {
      const v = p.durationInFrames as number;
      if (typeof v !== 'number' || v < 1 || v > 120) {
        return { operationId: op.id, type: 'range', message: `durationInFrames musi być 1–120, otrzymano: ${v}` };
      }
    }
  }

  if (op.type === 'split_clip') {
    if (p.atFrame !== undefined) {
      const v = p.atFrame as number;
      if (typeof v !== 'number' || v < 0) {
        return { operationId: op.id, type: 'range', message: `atFrame musi być >= 0, otrzymano: ${v}` };
      }
    }
  }

  if (op.type === 'trim_clip') {
    if (p.startFrame !== undefined) {
      const v = p.startFrame as number;
      if (typeof v !== 'number' || v < 0) {
        return { operationId: op.id, type: 'range', message: `startFrame musi być >= 0, otrzymano: ${v}` };
      }
    }
    if (p.endFrame !== undefined) {
      const v = p.endFrame as number;
      if (typeof v !== 'number' || v < 1) {
        return { operationId: op.id, type: 'range', message: `endFrame musi być > 0, otrzymano: ${v}` };
      }
    }
  }

  return null;
};

export const validateOperations = (
  operations: unknown[],
  ctx: { clips: StoredClip[]; trackCount: number; trackSettings: TrackSettings[] },
): ValidationResult => {
  const errors: ValidationError[] = [];
  const cleaned: JuicerOperation[] = [];
  const knownIds = new Set<string>();
  const pendingClips: string[] = [];

  for (const clip of ctx.clips) {
    knownIds.add(clip.id);
    knownIds.add(clip.sourceId);
  }

  if (!Array.isArray(operations) || operations.length === 0) {
    return { valid: false, errors: [{ operationId: '?', type: 'schema', message: 'Brak operacji lub pusta tablica' }], cleanedOperations: [] };
  }

  if (operations.length > 20) {
    return { valid: false, errors: [{ operationId: '?', type: 'range', message: `Za dużo operacji (${operations.length}), max 20` }], cleanedOperations: [] };
  }

  for (const op of operations) {
    if (!validateSchema(op)) {
      errors.push({ operationId: 'unknown', type: 'schema', message: 'Nieprawidłowa struktura operacji' });
      continue;
    }

    const permissionError = validatePermission(op);
    if (permissionError) {
      errors.push(permissionError);
      continue;
    }

    const stateError = validateState(op, ctx, knownIds);
    if (stateError) {
      errors.push(stateError);
      continue;
    }

    const rangeError = validateRange(op);
    if (rangeError) {
      errors.push(rangeError);
      continue;
    }

    cleaned.push(op);

    if (['add_clip', 'add_audio'].includes(op.type)) {
      const src = (op.params.sourceId as string) ?? (op.params.attachmentId as string);
      if (src) {
        knownIds.add(src);
        pendingClips.push(src);
        knownIds.add(`clip_${String(pendingClips.length).padStart(3, '0')}`);
        knownIds.add(`att_${String(pendingClips.length).padStart(3, '0')}`);
      }
      knownIds.add(op.id);
    }
    if (op.type === 'create_text') {
      const textId = (op.params.text as string) ?? 'text';
      knownIds.add(`text_${textId.slice(0, 8)}`);
      knownIds.add(op.id);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanedOperations: cleaned,
  };
};
