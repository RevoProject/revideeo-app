/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { MediaInfo } from './types.js';

export interface MediaProvider {
  getById(id: string): MediaInfo | null;
  getAll(): readonly MediaInfo[];
}
