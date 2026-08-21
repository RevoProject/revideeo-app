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
