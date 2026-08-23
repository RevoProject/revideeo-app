/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export { pluginRegistry, PluginRegistry, type PluginRegistrySnapshot } from './registry';
export type { RegisteredPlugin } from './types';
export { PLUGIN_API_VERSION, type PluginManifest, type PluginDefinition, type PluginInstance, type PluginContext, type PluginState, type PluginPermission } from './types';
export { validateManifest, type ManifestValidationResult } from './manifest';
export { PluginEventBus } from './eventBus';
export {
  getInstalledPlugins,
  markPluginInstalled,
  markPluginRemoved,
  isPluginEnabled,
  setPluginEnabled,
  type PluginStorageEntry,
} from './pluginStorage';
export type {
  PluginUIAPI,
  PluginProjectAPI,
  PluginTimelineAPI,
  PluginClipsAPI,
  PluginEffectsAPI,
  PluginTransitionsAPI,
  PluginExportAPI,
  PluginAssetsAPI,
  PluginRendererAPI,
  PluginJuicerAPI,
  PluginStorageAPI,
  PluginEventAPI,
  PanelRegistration,
  TabRegistration,
  ToolRegistration,
  ToolRenderProps,
  ContextMenuRegistration,
  ContextMenuItemDef,
  ContextMenuActionContext,
  HeaderButtonRegistration,
  FloatingButtonRegistration,
  BottomBarRegistration,
  SettingsSectionRegistration,
  PropertySectionRegistration,
  PropertySectionRenderProps,
  DialogOptions,
  DialogAction,
  EffectDefinition,
  FilterDefinition,
  TransitionDefinition,
  ExportFormatDefinition,
  ExportRenderConfig,
  GlobalAsset,
  JuicerExtension,
} from './types';
