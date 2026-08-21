const PLUGIN_STORAGE_KEY = 'revideeo:plugins';
const PLUGIN_GLOBAL_PREFIX = 'revideeo:plugin:global:';
const PLUGIN_PROJECT_PREFIX = 'revideeo:plugin:project:';

export interface PluginStorageEntry {
  id: string;
  enabled: boolean;
  installedAt: number;
}

export const getInstalledPlugins = (): PluginStorageEntry[] => {
  try {
    const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setInstalledPlugins = (plugins: PluginStorageEntry[]): void => {
  localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(plugins));
};

export const markPluginInstalled = (id: string): void => {
  const plugins = getInstalledPlugins();
  if (!plugins.some((p) => p.id === id)) {
    plugins.push({ id, enabled: true, installedAt: Date.now() });
    setInstalledPlugins(plugins);
  }
};

export const markPluginRemoved = (id: string): void => {
  setInstalledPlugins(getInstalledPlugins().filter((p) => p.id !== id));
  clearPluginGlobalData(id);
};

export const isPluginEnabled = (id: string): boolean => {
  return getInstalledPlugins().find((p) => p.id === id)?.enabled ?? false;
};

export const setPluginEnabled = (id: string, enabled: boolean): void => {
  const plugins = getInstalledPlugins();
  const entry = plugins.find((p) => p.id === id);
  if (entry) {
    entry.enabled = enabled;
    setInstalledPlugins(plugins);
  }
};

export const getPluginGlobalData = <T = unknown>(pluginId: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(`${PLUGIN_GLOBAL_PREFIX}${pluginId}:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setPluginGlobalData = <T = unknown>(pluginId: string, key: string, value: T): void => {
  localStorage.setItem(`${PLUGIN_GLOBAL_PREFIX}${pluginId}:${key}`, JSON.stringify(value));
};

export const clearPluginGlobalData = (pluginId: string): void => {
  const prefix = `${PLUGIN_GLOBAL_PREFIX}${pluginId}:`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

export const getPluginProjectData = <T = unknown>(pluginId: string, projectId: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(`${PLUGIN_PROJECT_PREFIX}${pluginId}:${projectId}:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setPluginProjectData = <T = unknown>(pluginId: string, projectId: string, key: string, value: T): void => {
  localStorage.setItem(`${PLUGIN_PROJECT_PREFIX}${pluginId}:${projectId}:${key}`, JSON.stringify(value));
};
