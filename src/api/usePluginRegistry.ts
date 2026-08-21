import { useEffect, useState } from 'react';
import { pluginRegistry, type PluginRegistrySnapshot } from './registry';

export const usePluginRegistry = (): PluginRegistrySnapshot => {
  const [snapshot, setSnapshot] = useState<PluginRegistrySnapshot>(() => pluginRegistry.getSnapshot());

  useEffect(() => {
    const bus = pluginRegistry.getBus();
    const update = () => setSnapshot(pluginRegistry.getSnapshot());
    const events = [
      'ui:panels-changed', 'ui:tabs-changed', 'ui:tools-changed',
      'ui:context-menus-changed', 'ui:header-changed',       'ui:floating-buttons-changed', 'ui:bottom-bar-changed',
      'ui:settings-changed', 'ui:property-sections-changed',
      'effects:changed', 'transitions:changed',
      'export:formats-changed', 'assets:changed', 'juicer:changed',
    ];
    events.forEach((event) => bus.on(event, update));
    return () => {
      events.forEach((event) => bus.off(event, update));
    };
  }, []);

  return snapshot;
};
