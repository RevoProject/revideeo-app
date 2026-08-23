/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { pluginRegistry } from './registry';
import type { PluginDefinition } from './types';

const BUNDLED_PLUGINS: PluginDefinition[] = [];

const registerBundled = async () => {
  try {
    const mod = await import('../../plugins/auto-captions/index.tsx');
    if (mod.default) BUNDLED_PLUGINS.push(mod.default);
  } catch { /* plugin not available */ }
};

let loaded = false;

export const loadBundledPlugins = async (): Promise<void> => {
  if (loaded) return;
  loaded = true;
  await registerBundled();
  for (const def of BUNDLED_PLUGINS) {
    const existing = pluginRegistry.getPlugin(def.manifest.id);
    if (!existing) {
      await pluginRegistry.registerPlugin(def);
    }
  }
};
