/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { MediaInfo } from './types.js';
import type { MediaProvider } from './provider.js';
import type { MediaAPI } from './api.js';

export function createMediaContext(provider: MediaProvider): MediaAPI {
  return {
    get(id: string): MediaInfo | null {
      return provider.getById(id);
    },
    list(): readonly MediaInfo[] {
      return provider.getAll();
    },
  };
}
