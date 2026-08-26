/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type {
  PluginContext,
  PluginDefinition,
  PluginEventAPI,
  PluginEffectsAPI,
  PluginExportAPI,
  PluginAssetsAPI,
  PluginRendererAPI,
  PluginJuicerAPI,
  PluginStorageAPI,
  PluginTransitionsAPI,
  PluginClipsAPI,
  PluginProjectAPI,
  PluginTimelineAPI,
  PluginUIAPI,
  EffectDefinition,
  FilterDefinition,
  TransitionDefinition,
  ExportFormatDefinition,
  GlobalAsset,
  JuicerExtension,
  PanelRegistration,
  TabRegistration,
  ToolRegistration,
  ContextMenuRegistration,
  HeaderButtonRegistration,
  SettingsSectionRegistration,
  PropertySectionRegistration,
  DialogOptions,
  RegisteredPlugin,
} from './types';
import { PLUGIN_API_VERSION } from './types';
import { PluginEventBus } from './eventBus';
import {
  markPluginInstalled,
  markPluginRemoved,
  isPluginEnabled,
  setPluginEnabled,
  getPluginGlobalData,
  setPluginGlobalData,
  setPluginProjectData,
  getPluginProjectData,
} from './pluginStorage';
import { registerPluginTranslations, translatePluginKey, getPluginLang, getAvailablePluginLangs } from './pluginI18n';
import { getCapabilities } from '../capabilities';
import type { StoredClip } from '../types';
import type { FrameProvider, FrameAPI } from '@revideeo/core/frame';
import { createFrameContext } from '@revideeo/core/frame';

export type PluginRegistrySnapshot = {
  panels: PanelRegistration[];
  tabs: TabRegistration[];
  tools: ToolRegistration[];
  contextMenus: ContextMenuRegistration[];
  headerButtons: HeaderButtonRegistration[];
  floatingButtons: import('./types').FloatingButtonRegistration[];
  bottomBar: import('./types').BottomBarRegistration[];
  settingsSections: SettingsSectionRegistration[];
  propertySections: PropertySectionRegistration[];
  effects: EffectDefinition[];
  filters: FilterDefinition[];
  transitions: TransitionDefinition[];
  exportFormats: ExportFormatDefinition[];
  globalAssets: GlobalAsset[];
  juicerExtensions: JuicerExtension[];
  juicerPromptTemplates: import('./types').JuicerPromptTemplate[];
  dialogQueue: DialogOptions[];
};

export class PluginRegistry {
  private plugins = new Map<string, RegisteredPlugin>();
  private eventBus = new PluginEventBus();
  private bus = new PluginEventBus();

  private snapshot: PluginRegistrySnapshot = {
    panels: [],
    tabs: [],
    tools: [],
    contextMenus: [],
    headerButtons: [],
    floatingButtons: [],
    bottomBar: [],
    settingsSections: [],
    propertySections: [],
    effects: [],
    filters: [],
    transitions: [],
    exportFormats: [],
    globalAssets: [],
    juicerExtensions: [],
    juicerPromptTemplates: [],
    dialogQueue: [],
  };

  private projectContext: {
    getName: () => string;
    getConfig: () => { resolutionLabel: string; orientation: string; fps: number };
    getTrackCount: () => number;
    getTrackSettings: () => { name: string; locked: boolean; muted: boolean; hidden: boolean }[];
    isDirty: () => boolean;
    markDirty: () => void;
    getCurrentFrame: () => number;
    seekTo: (frame: number) => void;
    getTotalFrames: () => number;
    addMarker: (frame: number) => void;
    removeMarker: (id: string) => void;
    getMarkers: () => { id: string; frame: number }[];
    getAllClips: () => StoredClip[];
    getSelectedClipIds: () => string[];
    addClip: (clip: Omit<StoredClip, 'id'>) => string;
    updateClip: (id: string, patch: Partial<StoredClip>) => void;
    removeClip: (id: string) => void;
    getFrameProvider: () => FrameProvider | null;
  } | null = null;

  private projectId = '';

  setProjectContext(ctx: PluginRegistry['projectContext'], projectId: string): void {
    this.projectContext = ctx;
    this.projectId = projectId;
  }

  clearProjectContext(): void {
    this.projectContext = null;
    this.projectId = '';
  }

  getSnapshot(): PluginRegistrySnapshot {
    return { ...this.snapshot };
  }

  private buildContext(pluginId: string): PluginContext {
    const registry = this;
    const hasPermission = (perm: string) => {
      const plugin = registry.plugins.get(pluginId);
      return plugin?.manifest.permissions.includes(perm as never) ?? false;
    };

    const ui: PluginUIAPI = {
      registerPanel: (options: PanelRegistration) => {
        if (!hasPermission('ui:panels')) return;
        registry.snapshot.panels.push(options);
        registry.bus.emit('ui:panels-changed');
      },
      registerTab: (options: TabRegistration) => {
        if (!hasPermission('ui:tabs')) return;
        registry.snapshot.tabs.push(options);
        registry.bus.emit('ui:tabs-changed');
      },
      registerTool: (options: ToolRegistration) => {
        if (!hasPermission('ui:tools')) return;
        registry.snapshot.tools.push(options);
        registry.bus.emit('ui:tools-changed');
      },
      registerContextMenuItems: (options: ContextMenuRegistration) => {
        if (!hasPermission('ui:context-menus')) return;
        registry.snapshot.contextMenus.push(options);
        registry.bus.emit('ui:context-menus-changed');
      },
      registerHeaderButton: (options: HeaderButtonRegistration) => {
        if (!hasPermission('ui:header')) return;
        registry.snapshot.headerButtons.push(options);
        registry.bus.emit('ui:header-changed');
      },
      registerFloatingButton: (options: import('./types').FloatingButtonRegistration) => {
        if (!hasPermission('ui:header')) return;
        registry.snapshot.floatingButtons.push(options);
        registry.bus.emit('ui:floating-buttons-changed');
      },
      registerBottomBar: (options: import('./types').BottomBarRegistration) => {
        if (!hasPermission('ui:header')) return;
        registry.snapshot.bottomBar.push(options);
        registry.bus.emit('ui:bottom-bar-changed');
      },
      registerSettingsSection: (options: SettingsSectionRegistration) => {
        if (!hasPermission('ui:settings')) return;
        registry.snapshot.settingsSections.push(options);
        registry.bus.emit('ui:settings-changed');
      },
      registerPropertySection: (options: PropertySectionRegistration) => {
        if (!hasPermission('ui:panels')) return;
        registry.snapshot.propertySections.push(options);
        registry.bus.emit('ui:property-sections-changed');
      },
      showDialog: (options: DialogOptions) => {
        registry.snapshot.dialogQueue.push(options);
        registry.bus.emit('ui:dialog', options);
      },
    };

    const project: PluginProjectAPI = {
      getName: () => registry.projectContext?.getName() ?? '',
      getConfig: () => registry.projectContext?.getConfig() ?? { resolutionLabel: '720p', orientation: '16:9', fps: 30 },
      getTrackCount: () => registry.projectContext?.getTrackCount() ?? 0,
      getTrackSettings: () => registry.projectContext?.getTrackSettings() ?? [],
      isDirty: () => registry.projectContext?.isDirty() ?? false,
      markDirty: () => registry.projectContext?.markDirty(),
    };

    const timeline: PluginTimelineAPI = {
      getCurrentFrame: () => registry.projectContext?.getCurrentFrame() ?? 0,
      seekTo: (frame: number) => registry.projectContext?.seekTo(frame),
      getTotalFrames: () => registry.projectContext?.getTotalFrames() ?? 0,
      addMarker: (frame: number) => registry.projectContext?.addMarker(frame),
      removeMarker: (id: string) => registry.projectContext?.removeMarker(id),
      getMarkers: () => registry.projectContext?.getMarkers() ?? [],
    };

    const clips: PluginClipsAPI = {
      getAll: () => registry.projectContext?.getAllClips() ?? [],
      getById: (id: string) => (registry.projectContext?.getAllClips() ?? []).find((c) => c.id === id) ?? null,
      getSelected: () => {
        const all = registry.projectContext?.getAllClips() ?? [];
        const selected = registry.projectContext?.getSelectedClipIds() ?? [];
        return all.filter((c) => selected.includes(c.id));
      },
      add: (clip) => registry.projectContext?.addClip(clip) ?? '',
      update: (id, patch) => registry.projectContext?.updateClip(id, patch),
      remove: (id) => registry.projectContext?.removeClip(id),
      duplicate: (id) => {
        const clip = (registry.projectContext?.getAllClips() ?? []).find((c) => c.id === id);
        if (!clip) return null;
        return registry.projectContext?.addClip({ ...clip, offsetInTimeline: clip.offsetInTimeline + clip.durationInFrames, transitionIn: 'none' }) ?? null;
      },
      split: (id, frame) => {
        const clip = (registry.projectContext?.getAllClips() ?? []).find((c) => c.id === id);
        if (!clip) return null;
        if (frame <= clip.offsetInTimeline || frame >= clip.offsetInTimeline + clip.durationInFrames) return null;
        const cutLength = frame - clip.offsetInTimeline;
        registry.projectContext?.updateClip(id, { durationInFrames: cutLength });
        return registry.projectContext?.addClip({
          ...clip,
          startFrame: clip.startFrame + cutLength,
          offsetInTimeline: frame,
          durationInFrames: clip.durationInFrames - cutLength,
          transitionIn: 'none',
        }) ?? null;
      },
    };

    const effects: PluginEffectsAPI = {
      registerEffect: (effect: EffectDefinition) => {
        if (!hasPermission('effects:register')) return;
        registry.snapshot.effects.push(effect);
        registry.bus.emit('effects:changed');
      },
      registerFilter: (filter: FilterDefinition) => {
        if (!hasPermission('effects:register')) return;
        registry.snapshot.filters.push(filter);
        registry.bus.emit('effects:changed');
      },
      getEffects: () => registry.snapshot.effects,
      getFilters: () => registry.snapshot.filters,
    };

    const transitions: PluginTransitionsAPI = {
      registerTransition: (transition: TransitionDefinition) => {
        if (!hasPermission('transitions:register')) return;
        registry.snapshot.transitions.push(transition);
        registry.bus.emit('transitions:changed');
      },
      getTransitions: () => registry.snapshot.transitions,
    };

    const exportApi: PluginExportAPI = {
      registerFormat: (format: ExportFormatDefinition) => {
        if (!hasPermission('export:register')) return;
        registry.snapshot.exportFormats.push(format);
        registry.bus.emit('export:formats-changed');
      },
      getFormats: () => registry.snapshot.exportFormats,
    };

    const assets: PluginAssetsAPI = {
      getGlobalAssets: () => registry.snapshot.globalAssets,
      addGlobalAsset: (asset: GlobalAsset) => {
        if (!hasPermission('assets:write')) return;
        const exists = registry.snapshot.globalAssets.some((a) => a.id === asset.id);
        if (!exists) registry.snapshot.globalAssets.push(asset);
        registry.bus.emit('assets:changed');
      },
      removeGlobalAsset: (id: string) => {
        if (!hasPermission('assets:write')) return;
        registry.snapshot.globalAssets = registry.snapshot.globalAssets.filter((a) => a.id !== id);
        registry.bus.emit('assets:changed');
      },
    };

    const renderer: PluginRendererAPI = {
      getAvailableServers: () => [],
      setRenderQuality: () => {},
    };

    const juicer: PluginJuicerAPI = {
      registerJuicerExtension: (extension: JuicerExtension) => {
        if (!hasPermission('juicer:read')) return;
        registry.snapshot.juicerExtensions.push(extension);
        registry.bus.emit('juicer:changed');
      },
      getJuicerExtensions: () => registry.snapshot.juicerExtensions,
      registerPromptTemplate: (template) => {
        if (!hasPermission('juicer:read')) return;
        registry.snapshot.juicerPromptTemplates.push(template);
        registry.bus.emit('juicer:changed');
      },
      getPromptTemplates: () => registry.snapshot.juicerPromptTemplates,
    };

    const storage: PluginStorageAPI = {
      getProjectData: <T = unknown>(key: string) => {
        if (!hasPermission('storage:project')) return null;
        return getPluginProjectData<T>(pluginId, registry.projectId, key);
      },
      setProjectData: <T = unknown>(key: string, value: T) => {
        if (!hasPermission('storage:project')) return;
        setPluginProjectData<T>(pluginId, registry.projectId, key, value);
      },
      getGlobalData: <T = unknown>(key: string) => {
        if (!hasPermission('storage:global')) return null;
        return getPluginGlobalData<T>(pluginId, key);
      },
      setGlobalData: <T = unknown>(key: string, value: T) => {
        if (!hasPermission('storage:global')) return;
        setPluginGlobalData<T>(pluginId, key, value);
      },
    };

    const events: PluginEventAPI = {
      on: (event, handler) => registry.eventBus.on(event, handler),
      off: (event, handler) => registry.eventBus.off(event, handler),
      emit: (event, ...args) => registry.eventBus.emit(event, ...args),
    };

    const i18n = {
      registerTranslations: (lang: string, translations: Record<string, string>) => {
        registerPluginTranslations(pluginId, lang, translations);
      },
      t: (key: string, vars?: Record<string, string>) => {
        return translatePluginKey(`${pluginId}:${key}`, vars);
      },
      getLang: () => getPluginLang(),
      getAvailableLangs: () => getAvailablePluginLangs(),
    };

    let frame: FrameAPI | undefined;
    if (hasPermission('frame:read')) {
      const provider = registry.projectContext?.getFrameProvider() ?? null;
      if (provider) {
        frame = createFrameContext(provider, {
          getCurrentFrame: () => registry.projectContext?.getCurrentFrame() ?? 0,
          getTotalFrames: () => registry.projectContext?.getTotalFrames() ?? 0,
          getFps: () => registry.projectContext?.getConfig().fps ?? 30,
          getWidth: () => {
            const cfg = registry.projectContext?.getConfig();
            if (!cfg) return 1920;
            const res = cfg.resolutionLabel;
            const orient = cfg.orientation;
            if (orient === '9:16' || orient === 'portrait') {
              if (res === '4K') return 2160;
              if (res === '2K') return 1440;
              if (res === '1080p') return 1080;
              if (res === '720p') return 720;
              if (res === '480p') return 480;
              if (res === '360p') return 360;
              return 720;
            }
            if (res === '4K') return 3840;
            if (res === '2K') return 2560;
            if (res === '1080p') return 1920;
            if (res === '720p') return 1280;
            if (res === '480p') return 854;
            if (res === '360p') return 640;
            return 1280;
          },
          getHeight: () => {
            const cfg = registry.projectContext?.getConfig();
            if (!cfg) return 720;
            const res = cfg.resolutionLabel;
            const orient = cfg.orientation;
            if (orient === '9:16' || orient === 'portrait') {
              if (res === '4K') return 3840;
              if (res === '2K') return 2560;
              if (res === '1080p') return 1920;
              if (res === '720p') return 1280;
              if (res === '480p') return 854;
              if (res === '360p') return 640;
              return 1280;
            }
            if (res === '4K') return 2160;
            if (res === '2K') return 1440;
            if (res === '1080p') return 1080;
            if (res === '720p') return 720;
            if (res === '480p') return 480;
            if (res === '360p') return 360;
            return 720;
          },
          getAllClips: () => registry.projectContext?.getAllClips() ?? [],
          getHiddenTracks: () => {
            const settings = registry.projectContext?.getTrackSettings() ?? [];
            const hidden = new Set<number>();
            settings.forEach((s, i) => { if (s.hidden) hidden.add(i); });
            return hidden;
          },
        });
      }
    }

    return { ui, project, timeline, clips, effects, transitions, export: exportApi, assets, renderer, juicer, storage, events, i18n, capabilities: getCapabilities(), frame };
  }

  async registerPlugin(definition: PluginDefinition): Promise<boolean> {
    const { manifest } = definition;
    if (this.plugins.has(manifest.id)) {
      console.warn(`[PluginRegistry] Plugin "${manifest.id}" already registered`);
      return false;
    }
    if (manifest.minApiVersion && manifest.minApiVersion > PLUGIN_API_VERSION) {
      console.warn(`[PluginRegistry] Plugin "${manifest.id}" requires API v${manifest.minApiVersion}, current is v${PLUGIN_API_VERSION}`);
      return false;
    }
    if (!isPluginEnabled(manifest.id)) {
      markPluginInstalled(manifest.id);
    }
    const instance: RegisteredPlugin = {
      manifest,
      definition,
      state: 'installed',
      context: null,
      registeredAt: Date.now(),
    };
    this.plugins.set(manifest.id, instance);
    await this.activatePlugin(manifest.id);
    return true;
  }

  async activatePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.state === 'active') return false;
    try {
      const context = this.buildContext(id);
      await plugin.definition.activate(context);
      plugin.context = context;
      plugin.state = 'active';
      plugin.error = undefined;
      this.eventBus.emit('plugin:activated', id);
      return true;
    } catch (err) {
      plugin.state = 'error';
      plugin.error = String(err);
      console.error(`[PluginRegistry] Failed to activate "${id}":`, err);
      return false;
    }
  }

  async deactivatePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.state !== 'active') return false;
    try {
      await plugin.definition.deactivate?.();
      plugin.state = 'inactive';
      this.removePluginRegistrations(id);
      this.eventBus.emit('plugin:deactivated', id);
      return true;
    } catch (err) {
      plugin.state = 'error';
      plugin.error = String(err);
      console.error(`[PluginRegistry] Failed to deactivate "${id}":`, err);
      return false;
    }
  }

  async togglePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    if (plugin.state === 'active') {
      setPluginEnabled(id, false);
      return this.deactivatePlugin(id);
    } else {
      setPluginEnabled(id, true);
      return this.activatePlugin(id);
    }
  }

  async removePlugin(id: string): Promise<boolean> {
    await this.deactivatePlugin(id);
    this.plugins.delete(id);
    markPluginRemoved(id);
    this.eventBus.emit('plugin:removed', id);
    return true;
  }

  private removePluginRegistrations(_pluginId: string): void {
    this.snapshot.panels = this.snapshot.panels.filter((p) => !this.isOwnedByPlugin(p.id, _pluginId));
    this.snapshot.tabs = this.snapshot.tabs.filter((t) => !this.isOwnedByPlugin(t.id, _pluginId));
    this.snapshot.tools = this.snapshot.tools.filter((t) => !this.isOwnedByPlugin(t.id, _pluginId));
    this.snapshot.contextMenus = this.snapshot.contextMenus.filter((c) => !this.isOwnedByPlugin(c.id, _pluginId));
    this.snapshot.headerButtons = this.snapshot.headerButtons.filter((b) => !this.isOwnedByPlugin(b.id, _pluginId));
    this.snapshot.floatingButtons = this.snapshot.floatingButtons.filter((b) => !this.isOwnedByPlugin(b.id, _pluginId));
    this.snapshot.bottomBar = this.snapshot.bottomBar.filter((b) => !this.isOwnedByPlugin(b.id, _pluginId));
    this.snapshot.settingsSections = this.snapshot.settingsSections.filter((s) => !this.isOwnedByPlugin(s.id, _pluginId));
    this.snapshot.propertySections = this.snapshot.propertySections.filter((p) => !this.isOwnedByPlugin(p.id, _pluginId));
    this.snapshot.effects = this.snapshot.effects.filter((e) => !this.isOwnedByPlugin(e.id, _pluginId));
    this.snapshot.filters = this.snapshot.filters.filter((f) => !this.isOwnedByPlugin(f.id, _pluginId));
    this.snapshot.transitions = this.snapshot.transitions.filter((t) => !this.isOwnedByPlugin(t.type, _pluginId));
    this.snapshot.exportFormats = this.snapshot.exportFormats.filter((f) => !this.isOwnedByPlugin(f.id, _pluginId));
    this.snapshot.globalAssets = this.snapshot.globalAssets.filter((a) => !this.isOwnedByPlugin(a.id, _pluginId));
    this.snapshot.juicerExtensions = this.snapshot.juicerExtensions.filter((j) => !this.isOwnedByPlugin(j.id, _pluginId));
    this.snapshot.juicerPromptTemplates = this.snapshot.juicerPromptTemplates.filter((t) => !this.isOwnedByPlugin(t.id, _pluginId));
  }

  private isOwnedByPlugin(registrationId: string, pluginId: string): boolean {
    return registrationId.startsWith(`${pluginId}:`);
  }

  getAllPlugins(): RegisteredPlugin[] {
    return [...this.plugins.values()];
  }

  getActivePlugins(): RegisteredPlugin[] {
    return [...this.plugins.values()].filter((p) => p.state === 'active');
  }

  getPlugin(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }

  getEvents(): PluginEventAPI {
    const registry = this;
    return {
      on: (event, handler) => registry.eventBus.on(event, handler),
      off: (event, handler) => registry.eventBus.off(event, handler),
      emit: (event, ...args) => registry.eventBus.emit(event, ...args),
    };
  }

  getBus(): PluginEventBus {
    return this.bus;
  }
}

export const pluginRegistry = new PluginRegistry();
