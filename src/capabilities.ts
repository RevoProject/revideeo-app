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
