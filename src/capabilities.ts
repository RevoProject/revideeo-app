/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export interface ReVideeoCapabilities {
  timeline: {
    maxTracks: number;
    maxTransitionDuration: number;
    minTransitionDuration: number;
  };
  export: {
    supportedFormats: string[];
  };
  ui: {
    maxRecentExports: number;
  };
}

const DEFAULT_CAPABILITIES: ReVideeoCapabilities = {
  timeline: {
    maxTracks: 5,
    maxTransitionDuration: 30,
    minTransitionDuration: 5,
  },
  export: {
    supportedFormats: ['mp4', 'mkv', 'webm'],
  },
  ui: {
    maxRecentExports: 30,
  },
};

let _capabilities: ReVideeoCapabilities = { ...DEFAULT_CAPABILITIES };

export const getCapabilities = (): Readonly<ReVideeoCapabilities> => _capabilities;

export const getMaxTracks = (): number => _capabilities.timeline.maxTracks;
