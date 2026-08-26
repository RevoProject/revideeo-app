/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { ReactNode } from 'react';
import type { StoredClip, TransitionType } from '../types';
import type { FrameAPI } from '@revideeo/core/frame';

export const PLUGIN_API_VERSION = 1;

export type PluginState = 'installed' | 'loaded' | 'active' | 'inactive' | 'error';

export type PluginPermission =
  | 'project:read'
  | 'project:write'
  | 'timeline:read'
  | 'timeline:write'
  | 'clips:read'
  | 'clips:write'
  | 'assets:read'
  | 'assets:write'
  | 'effects:register'
  | 'transitions:register'
  | 'export:register'
  | 'ui:panels'
  | 'ui:tabs'
  | 'ui:tools'
  | 'ui:context-menus'
  | 'ui:settings'
  | 'ui:header'
  | 'renderer:read'
  | 'juicer:read'
  | 'storage:project'
  | 'storage:global'
  | 'frame:read';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  minApiVersion?: number;
  permissions: PluginPermission[];
  entry: string;
  i18n?: Record<string, PluginTranslations>;
}

export interface PluginTranslations {
  [key: string]: string;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export interface PluginInstance {
  manifest: PluginManifest;
  state: PluginState;
  context: PluginContext | null;
  error?: string;
}

export interface PluginContext {
  ui: PluginUIAPI;
  project: PluginProjectAPI;
  timeline: PluginTimelineAPI;
  clips: PluginClipsAPI;
  effects: PluginEffectsAPI;
  transitions: PluginTransitionsAPI;
  export: PluginExportAPI;
  assets: PluginAssetsAPI;
  renderer: PluginRendererAPI;
  juicer: PluginJuicerAPI;
  storage: PluginStorageAPI;
  events: PluginEventAPI;
  i18n: PluginI18nAPI;
  capabilities: import('../capabilities').ReVideeoCapabilities;
  frame?: FrameAPI;
}

export interface PluginI18nAPI {
  registerTranslations(lang: string, translations: Record<string, string>): void;
  t(key: string, vars?: Record<string, string>): string;
  getLang(): string;
  getAvailableLangs(): string[];
}

export interface PluginUIAPI {
  registerPanel(options: PanelRegistration): void;
  registerTab(options: TabRegistration): void;
  registerTool(options: ToolRegistration): void;
  registerContextMenuItems(options: ContextMenuRegistration): void;
  registerHeaderButton(options: HeaderButtonRegistration): void;
  registerFloatingButton(options: FloatingButtonRegistration): void;
  registerBottomBar(options: BottomBarRegistration): void;
  registerSettingsSection(options: SettingsSectionRegistration): void;
  registerPropertySection(options: PropertySectionRegistration): void;
  showDialog(options: DialogOptions): void;
}

export interface PanelRegistration {
  id: string;
  label: string;
  icon?: string;
  position?: 'left' | 'right';
  priority?: number;
  render: () => ReactNode;
}

export interface TabRegistration {
  id: string;
  label: string;
  icon?: string;
  position?: 'media' | 'right';
  priority?: number;
  render: () => ReactNode;
}

export interface ToolRegistration {
  id: string;
  label: string;
  icon?: string;
  priority?: number;
  render: (props: ToolRenderProps) => ReactNode;
}

export interface ToolRenderProps {
  activeClip: StoredClip | null;
  clipIndex: number;
  totalFrames: number;
  fps: number;
  asset?: { name: string };
  onUpdateClip: (id: string, patch: Partial<StoredClip>) => void;
  onClose: () => void;
}

export interface ContextMenuRegistration {
  id: string;
  target: 'clip' | 'asset' | 'track' | 'empty' | 'transition';
  items: ContextMenuItemDef[];
  separator?: boolean;
  priority?: number;
}

export interface ContextMenuItemDef {
  label: string;
  icon?: string;
  danger?: boolean;
  action: (context: ContextMenuActionContext) => void;
}

export interface ContextMenuActionContext {
  clipId?: string;
  sourceId?: string;
  trackIndex?: number;
}

export interface HeaderButtonRegistration {
  id: string;
  label: string;
  icon?: string;
  position?: 'before-export' | 'after-export' | 'end';
  priority?: number;
  onClick: () => void;
}

export interface FloatingButtonRegistration {
  id: string;
  label: string;
  icon?: string;
  position?: 'top-left' | 'top-right';
  priority?: number;
  onClick: () => void;
}

export interface BottomBarRegistration {
  id: string;
  label: string;
  icon?: string;
  priority?: number;
  onClick: () => void;
}

export interface SettingsSectionRegistration {
  id: string;
  label: string;
  icon?: string;
  priority?: number;
  render: () => ReactNode;
}

export interface PropertySectionRegistration {
  id: string;
  label: string;
  icon?: string;
  visible?: (clip: StoredClip) => boolean;
  priority?: number;
  render: (props: PropertySectionRenderProps) => ReactNode;
}

export interface PropertySectionRenderProps {
  clip: StoredClip;
  fps: number;
  onUpdateClip: (patch: Partial<StoredClip>) => void;
}

export interface DialogOptions {
  title: string;
  content: ReactNode;
  actions?: DialogAction[];
}

export interface DialogAction {
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  onClick: () => void;
}

export interface PluginProjectAPI {
  getName: () => string;
  getConfig: () => { resolutionLabel: string; orientation: string; fps: number };
  getTrackCount: () => number;
  getTrackSettings: () => { name: string; locked: boolean; muted: boolean; hidden: boolean }[];
  isDirty: () => void;
  markDirty: () => void;
}

export interface PluginTimelineAPI {
  getCurrentFrame: () => number;
  seekTo: (frame: number) => void;
  getTotalFrames: () => number;
  addMarker: (frame: number) => void;
  removeMarker: (id: string) => void;
  getMarkers: () => { id: string; frame: number }[];
}

export interface PluginClipsAPI {
  getAll: () => StoredClip[];
  getById: (id: string) => StoredClip | null;
  getSelected: () => StoredClip[];
  add: (clip: Omit<StoredClip, 'id'>) => string;
  update: (id: string, patch: Partial<StoredClip>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  split: (id: string, frame: number) => string | null;
}

export interface PluginEffectsAPI {
  registerEffect(effect: EffectDefinition): void;
  registerFilter(filter: FilterDefinition): void;
  getEffects: () => EffectDefinition[];
  getFilters: () => FilterDefinition[];
}

export interface EffectDefinition {
  id: string;
  name: string;
  icon?: string;
  apply: (clip: StoredClip, frame: number) => React.CSSProperties;
}

export interface FilterDefinition {
  id: string;
  name: string;
  icon?: string;
  cssFilter: string;
  defaultParams?: Record<string, number>;
  apply?: (clip: StoredClip, params: Record<string, number>) => React.CSSProperties;
}

export interface PluginTransitionsAPI {
  registerTransition(transition: TransitionDefinition): void;
  getTransitions: () => TransitionDefinition[];
}

export interface TransitionDefinition {
  type: TransitionType;
  label: string;
  icon?: string;
  apply?: (progress: number) => React.CSSProperties;
}

export interface PluginExportAPI {
  registerFormat(format: ExportFormatDefinition): void;
  getFormats: () => ExportFormatDefinition[];
}

export interface ExportFormatDefinition {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  render: (config: ExportRenderConfig) => Promise<Blob>;
}

export interface ExportRenderConfig {
  clips: StoredClip[];
  assets: { sourceId: string; blob: Blob }[];
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  serverUrl: string;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

export interface PluginAssetsAPI {
  getGlobalAssets: () => GlobalAsset[];
  addGlobalAsset: (asset: GlobalAsset) => void;
  removeGlobalAsset: (id: string) => void;
}

export interface GlobalAsset {
  id: string;
  name: string;
  category: string;
  blob: Blob;
  thumbnail?: string;
}

export interface PluginRendererAPI {
  getAvailableServers: () => { url: string; label: string }[];
  setRenderQuality: (quality: 'draft' | 'standard' | 'high') => void;
}

export interface PluginJuicerAPI {
  registerJuicerExtension(extension: JuicerExtension): void;
  getJuicerExtensions: () => JuicerExtension[];
  registerPromptTemplate(template: JuicerPromptTemplate): void;
  getPromptTemplates: () => JuicerPromptTemplate[];
}

export interface JuicerExtension {
  id: string;
  name: string;
  type: 'generator' | 'modifier';
  process?: (input: unknown) => unknown;
}

export interface JuicerPromptTemplate {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
  category?: string;
}

export interface PluginStorageAPI {
  getProjectData: <T = unknown>(key: string) => T | null;
  setProjectData: <T = unknown>(key: string, value: T) => void;
  getGlobalData: <T = unknown>(key: string) => T | null;
  setGlobalData: <T = unknown>(key: string, value: T) => void;
}

export interface PluginEventAPI {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

export interface RegisteredPlugin {
  manifest: PluginManifest;
  definition: PluginDefinition;
  state: PluginState;
  context: PluginContext | null;
  error?: string;
  registeredAt: number;
}
