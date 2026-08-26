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
    const hasPermission = (perm: string) => {
      const plugin = this.plugins.get(pluginId);
      return plugin?.manifest.permissions.includes(perm as never) ?? false;
    };

    const ui: PluginUIAPI = {
      registerPanel: (options: PanelRegistration) => {
        if (!hasPermission('ui:panels')) return;
        this.snapshot.panels.push(options);
        this.bus.emit('ui:panels-changed');
      },
      registerTab: (options: TabRegistration) => {
        if (!hasPermission('ui:tabs')) return;
        this.snapshot.tabs.push(options);
        this.bus.emit('ui:tabs-changed');
      },
      registerTool: (options: ToolRegistration) => {
        if (!hasPermission('ui:tools')) return;
        this.snapshot.tools.push(options);
        this.bus.emit('ui:tools-changed');
      },
      registerContextMenuItems: (options: ContextMenuRegistration) => {
        if (!hasPermission('ui:context-menus')) return;
        this.snapshot.contextMenus.push(options);
        this.bus.emit('ui:context-menus-changed');
      },
      registerHeaderButton: (options: HeaderButtonRegistration) => {
        if (!hasPermission('ui:header')) return;
        this.snapshot.headerButtons.push(options);
        this.bus.emit('ui:header-changed');
      },
      registerFloatingButton: (options: import('./types').FloatingButtonRegistration) => {
        if (!hasPermission('ui:header')) return;
        this.snapshot.floatingButtons.push(options);
        this.bus.emit('ui:floating-buttons-changed');
      },
      registerBottomBar: (options: import('./types').BottomBarRegistration) => {
        if (!hasPermission('ui:header')) return;
        this.snapshot.bottomBar.push(options);
        this.bus.emit('ui:bottom-bar-changed');
      },
      registerSettingsSection: (options: SettingsSectionRegistration) => {
        if (!hasPermission('ui:settings')) return;
        this.snapshot.settingsSections.push(options);
        this.bus.emit('ui:settings-changed');
      },
      registerPropertySection: (options: PropertySectionRegistration) => {
        if (!hasPermission('ui:panels')) return;
        this.snapshot.propertySections.push(options);
        this.bus.emit('ui:property-sections-changed');
      },
      showDialog: (options: DialogOptions) => {
        this.snapshot.dialogQueue.push(options);
        this.bus.emit('ui:dialog', options);
      },
    };

    const project: PluginProjectAPI = {
      getName: () => this.projectContext?.getName() ?? '',
      getConfig: () => this.projectContext?.getConfig() ?? { resolutionLabel: '720p', orientation: '16:9', fps: 30 },
      getTrackCount: () => this.projectContext?.getTrackCount() ?? 0,
      getTrackSettings: () => this.projectContext?.getTrackSettings() ?? [],
      isDirty: () => this.projectContext?.isDirty() ?? false,
      markDirty: () => this.projectContext?.markDirty(),
    };

    const timeline: PluginTimelineAPI = {
      getCurrentFrame: () => this.projectContext?.getCurrentFrame() ?? 0,
      seekTo: (frame: number) => this.projectContext?.seekTo(frame),
      getTotalFrames: () => this.projectContext?.getTotalFrames() ?? 0,
      addMarker: (frame: number) => this.projectContext?.addMarker(frame),
      removeMarker: (id: string) => this.projectContext?.removeMarker(id),
      getMarkers: () => this.projectContext?.getMarkers() ?? [],
    };

    const clips: PluginClipsAPI = {
      getAll: () => this.projectContext?.getAllClips() ?? [],
      getById: (id: string) => (this.projectContext?.getAllClips() ?? []).find((c) => c.id === id) ?? null,
      getSelected: () => {
        const all = this.projectContext?.getAllClips() ?? [];
        const selected = this.projectContext?.getSelectedClipIds() ?? [];
        return all.filter((c) => selected.includes(c.id));
      },
      add: (clip) => this.projectContext?.addClip(clip) ?? '',
      update: (id, patch) => this.projectContext?.updateClip(id, patch),
      remove: (id) => this.projectContext?.removeClip(id),
      duplicate: (id) => {
        const clip = (this.projectContext?.getAllClips() ?? []).find((c) => c.id === id);
        if (!clip) return null;
        return this.projectContext?.addClip({ ...clip, offsetInTimeline: clip.offsetInTimeline + clip.durationInFrames, transitionIn: 'none' }) ?? null;
      },
      split: (id, frame) => {
        const clip = (this.projectContext?.getAllClips() ?? []).find((c) => c.id === id);
        if (!clip) return null;
        if (frame <= clip.offsetInTimeline || frame >= clip.offsetInTimeline + clip.durationInFrames) return null;
        const cutLength = frame - clip.offsetInTimeline;
        this.projectContext?.updateClip(id, { durationInFrames: cutLength });
        return this.projectContext?.addClip({
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
        this.snapshot.effects.push(effect);
        this.bus.emit('effects:changed');
      },
      registerFilter: (filter: FilterDefinition) => {
        if (!hasPermission('effects:register')) return;
        this.snapshot.filters.push(filter);
        this.bus.emit('effects:changed');
      },
      getEffects: () => this.snapshot.effects,
      getFilters: () => this.snapshot.filters,
    };

    const transitions: PluginTransitionsAPI = {
      registerTransition: (transition: TransitionDefinition) => {
        if (!hasPermission('transitions:register')) return;
        this.snapshot.transitions.push(transition);
        this.bus.emit('transitions:changed');
      },
      getTransitions: () => this.snapshot.transitions,
    };

    const exportApi: PluginExportAPI = {
      registerFormat: (format: ExportFormatDefinition) => {
        if (!hasPermission('export:register')) return;
        this.snapshot.exportFormats.push(format);
        this.bus.emit('export:formats-changed');
      },
      getFormats: () => this.snapshot.exportFormats,
    };

    const assets: PluginAssetsAPI = {
      getGlobalAssets: () => this.snapshot.globalAssets,
      addGlobalAsset: (asset: GlobalAsset) => {
        if (!hasPermission('assets:write')) return;
        const exists = this.snapshot.globalAssets.some((a) => a.id === asset.id);
        if (!exists) this.snapshot.globalAssets.push(asset);
        this.bus.emit('assets:changed');
      },
      removeGlobalAsset: (id: string) => {
        if (!hasPermission('assets:write')) return;
        this.snapshot.globalAssets = this.snapshot.globalAssets.filter((a) => a.id !== id);
        this.bus.emit('assets:changed');
      },
    };

    const renderer: PluginRendererAPI = {
      getAvailableServers: () => [],
      setRenderQuality: () => {},
    };

    const juicer: PluginJuicerAPI = {
      registerJuicerExtension: (extension: JuicerExtension) => {
        if (!hasPermission('juicer:read')) return;
        this.snapshot.juicerExtensions.push(extension);
        this.bus.emit('juicer:changed');
      },
      getJuicerExtensions: () => this.snapshot.juicerExtensions,
      registerPromptTemplate: (template) => {
        if (!hasPermission('juicer:read')) return;
        this.snapshot.juicerPromptTemplates.push(template);
        this.bus.emit('juicer:changed');
      },
      getPromptTemplates: () => this.snapshot.juicerPromptTemplates,
    };

    const storage: PluginStorageAPI = {
      getProjectData: <T = unknown>(key: string) => {
        if (!hasPermission('storage:project')) return null;
        return getPluginProjectData<T>(pluginId, this.projectId, key);
      },
      setProjectData: <T = unknown>(key: string, value: T) => {
        if (!hasPermission('storage:project')) return;
        setPluginProjectData<T>(pluginId, this.projectId, key, value);
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
      on: (event, handler) => this.eventBus.on(event, handler),
      off: (event, handler) => this.eventBus.off(event, handler),
      emit: (event, ...args) => this.eventBus.emit(event, ...args),
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
      const provider = this.projectContext?.getFrameProvider() ?? null;
      if (provider) {
        frame = createFrameContext(provider, {
          getCurrentFrame: () => this.projectContext?.getCurrentFrame() ?? 0,
          getTotalFrames: () => this.projectContext?.getTotalFrames() ?? 0,
          getFps: () => this.projectContext?.getConfig().fps ?? 30,
          getWidth: () => {
            const cfg = this.projectContext?.getConfig();
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
            const cfg = this.projectContext?.getConfig();
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
          getAllClips: () => this.projectContext?.getAllClips() ?? [],
          getHiddenTracks: () => {
            const settings = this.projectContext?.getTrackSettings() ?? [];
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
    return {
      on: (event, handler) => this.eventBus.on(event, handler),
      off: (event, handler) => this.eventBus.off(event, handler),
      emit: (event, ...args) => this.eventBus.emit(event, ...args),
    };
  }

  getBus(): PluginEventBus {
    return this.bus;
  }
}

export const pluginRegistry = new PluginRegistry();
