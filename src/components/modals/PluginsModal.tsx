import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Puzzle, Power, Search, X, Server, Download, Check, Loader2, Shield, AlertTriangle, Upload } from 'lucide-react';
import { pluginRegistry, type RegisteredPlugin } from '../../api';
import { RENDER_SERVER_BASE_URL } from '../../export/renderServerConfig';
import { useRenderServersStatus, type RenderServerOption } from '../../export/useRenderServersStatus';
import { showAlert } from '../shared/showAlert';
import { useTranslation } from '../../i18n';

type SidebarTab = 'marketplace' | 'installed' | 'disabled' | 'server';

interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'app' | 'server-plugin' | 'juicer-extension' | 'motion' | 'template';
  permissions: string[];
  tested?: boolean;
  dependencies?: { type: string; id: string; version: string; required: boolean }[];
}

const MARKETPLACE_PLUGINS: MarketplacePlugin[] = [
  { id: 'auto-captions', name: 'Auto Captions', version: '1.2.0', description: 'Automatyczne generowanie napisów za pomocą Whisper AI.', author: 'ReVideeo', type: 'app', permissions: ['clips:write', 'ui:panels'], tested: false, dependencies: [{ type: 'server-plugin', id: 'whisper-runtime', version: '^1.0.0', required: true }] },
  { id: 'whisper-runtime', name: 'Whisper Runtime', version: '1.0.0', description: 'Serwerowy silnik Whisper do transkrypcji audio. Wymaga GPU/CPU.', author: 'ReVideeo', type: 'server-plugin', permissions: ['renderer:read'], tested: false },
  { id: 'smart-transitions', name: 'Smart Transitions', version: '1.1.0', description: 'AI-powered transitions between clips. Auto-detects scene changes.', author: 'ReVideeo', type: 'app', permissions: ['transitions:register', 'clips:read'], tested: false },
  { id: 'bg-remover', name: 'AI Background Removal', version: '1.0.0', description: 'Usuwanie tła z materiałów wideo za pomocą AI.', author: 'Community', type: 'app', permissions: ['effects:register', 'clips:read', 'clips:write'], tested: false, dependencies: [{ type: 'server-plugin', id: 'gpu-runtime', version: '^1.0.0', required: true }] },
  { id: 'gpu-runtime', name: 'GPU Runtime', version: '1.0.0', description: 'Serwerowy runtime GPU do przetwarzania obrazu AI.', author: 'ReVideeo', type: 'server-plugin', permissions: ['renderer:read'], tested: false },
  { id: 'music-sync', name: 'Music Sync', version: '1.0.0', description: 'Automatyczna synchronizacja montażu z muzyką.', author: 'Community', type: 'juicer-extension', permissions: ['juicer:read', 'timeline:write'], tested: false },
];

const sidebarItems: { id: SidebarTab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'marketplace', labelKey: 'plugins.marketplace', icon: <Package size={16} /> },
  { id: 'installed', labelKey: 'plugins.installed', icon: <Puzzle size={16} /> },
  { id: 'disabled', labelKey: 'plugins.disabled', icon: <Power size={16} /> },
  { id: 'server', labelKey: 'plugins.server', icon: <Server size={16} /> },
];

const typeLabels: Record<string, string> = {
  'app': 'App Plugin',
  'server-plugin': 'Server Plugin',
  'juicer-extension': 'Juicer',
};

const typeColors: Record<string, string> = {
  'app': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'server-plugin': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'juicer-extension': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const marketplaceTypeFilters = [
  { key: 'app', label: 'App Plugin', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30', activeColor: 'bg-blue-600 text-white' },
  { key: 'server-plugin', label: 'Server Plugin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30', activeColor: 'bg-purple-600 text-white' },
  { key: 'juicer-extension', label: 'Juicer', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30', activeColor: 'bg-amber-600 text-white' },
];

interface ServerPluginEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  status: string;
  installedAt: number;
}

export const PluginsModal = ({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<SidebarTab>('marketplace');
  const [plugins, setPlugins] = useState<RegisteredPlugin[]>(pluginRegistry.getAllPlugins());
  const [serverPlugins, setServerPlugins] = useState<ServerPluginEntry[]>([]);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<Record<string, 'pending' | 'rejected' | 'ready'>>({});
  const [showInstallConfirm, setShowInstallConfirm] = useState<MarketplacePlugin | null>(null);
  const [marketplaceTypeFilter, setMarketplaceTypeFilter] = useState<string | null>(null);
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderServerCandidates: RenderServerOption[] = [
    { url: RENDER_SERVER_BASE_URL, label: RENDER_SERVER_BASE_URL.replace(/^https?:\/\//, '') },
  ];
  const { available: spaceRenderServers } = useRenderServersStatus(renderServerCandidates, 5000, true, 'server-plugins');

  const fetchServerPlugins = useCallback(async () => {
    try {
      const res = await fetch(`${RENDER_SERVER_BASE_URL}/api/plugins`);
      if (res.ok) {
        const data = await res.json();
        setServerPlugins(data.plugins ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (spaceRenderServers.length === 0) {
      setServerPlugins([]);
      return;
    }
    void fetchServerPlugins();
    const interval = setInterval(fetchServerPlugins, 10000);
    return () => clearInterval(interval);
  }, [fetchServerPlugins, spaceRenderServers]);

  const refreshPlugins = () => setPlugins(pluginRegistry.getAllPlugins());

  const togglePlugin = async (id: string) => {
    await pluginRegistry.togglePlugin(id);
    refreshPlugins();
  };

  const handleInstallAppPlugin = (plugin: MarketplacePlugin) => {
    setShowInstallConfirm(plugin);
  };

  const confirmInstall = async (plugin: MarketplacePlugin) => {
    setShowInstallConfirm(null);
    setInstallingPlugin(plugin.id);

    const serverDepIds: string[] = [];

    if (plugin.type === 'server-plugin' && spaceRenderServers.length > 0) {
      try {
        const res = await fetch(`${RENDER_SERVER_BASE_URL}/api/plugin-install-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pluginId: plugin.id, pluginVersion: plugin.version, source: 'marketplace', permissions: plugin.permissions, description: plugin.description }),
        });
        if (res.ok) {
          const data = await res.json();
          serverDepIds.push(data.requestId);
        }
      } catch { /* ignore */ }
    } else {
      for (const dep of plugin.dependencies ?? []) {
        if (dep.type === 'server-plugin' && spaceRenderServers.length > 0) {
          try {
            const res = await fetch(`${RENDER_SERVER_BASE_URL}/api/plugin-install-requests`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pluginId: dep.id, pluginVersion: dep.version, source: 'marketplace', permissions: ['renderer:read'], description: dep.id }),
            });
            if (res.ok) {
              const data = await res.json();
              serverDepIds.push(data.requestId);
            }
          } catch { /* ignore */ }
        }
      }
    }

    if (serverDepIds.length > 0) {
      setInstallStatus((prev) => ({ ...prev, [plugin.id]: 'pending' }));
      const pollInterval = 2000;
      const maxPolls = 60;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));
        try {
          const statuses = await Promise.all(
            serverDepIds.map(async (id) => {
              const res = await fetch(`${RENDER_SERVER_BASE_URL}/api/plugin-install-requests/${id}`);
              if (!res.ok) return { status: 'unknown' };
              return res.json();
            })
          );
          const allDone = statuses.every((s: { status: string }) => s.status === 'ready' || s.status === 'rejected' || s.status === 'error' || s.status === 'unknown');
          if (allDone) {
            const rejected = statuses.some((s: { status: string }) => s.status === 'rejected' || s.status === 'error');
            setInstallStatus((prev) => ({ ...prev, [plugin.id]: rejected ? 'rejected' : 'ready' }));
            if (rejected) {
              showAlert(t('plugins.rejected'), t('plugins.rejectedDesc'), 'error');
            }
            break;
          }
        } catch { /* ignore */ }
      }
    } else {
      setInstallStatus((prev) => ({ ...prev, [plugin.id]: 'ready' }));
    }

    setInstallingPlugin(null);
    refreshPlugins();
    fetchServerPlugins();
  };

  const handleRemoveServerPlugin = async (id: string) => {
    try {
      await fetch(`${RENDER_SERVER_BASE_URL}/api/plugins/${id}`, { method: 'DELETE' });
      fetchServerPlugins();
    } catch { /* ignore */ }
  };

  const handleLoadPluginFile = () => fileInputRef.current?.click();

  const handlePluginFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const manifest = JSON.parse(text);
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entry) {
        showAlert(t('plugins.invalidFile'), t('plugins.invalidFileDesc'), 'error');
        return;
      }
      showAlert(t('plugins.loaded'), t('plugins.loadedDesc', { name: manifest.name, version: manifest.version }), 'success');
      refreshPlugins();
    } catch {
      showAlert(t('plugins.error'), t('plugins.loadError'), 'error');
    }
  };

  const filteredInstalled = plugins.filter((p) => {
    if (search && !p.manifest.name.toLowerCase().includes(search.toLowerCase()) && !p.manifest.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'installed' && p.state !== 'active') return false;
    if (activeTab === 'disabled' && p.state === 'active') return false;
    return true;
  });

  const filteredMarketplace = MARKETPLACE_PLUGINS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (marketplaceTypeFilter && p.type !== marketplaceTypeFilter) return false;
    if (p.type === 'app' && plugins.some((rp) => rp.manifest.id === p.id)) return false;
    if (p.type === 'server-plugin' && serverPlugins.some((sp) => sp.id === p.id)) return false;
    if (p.type === 'juicer-extension' && plugins.some((rp) => rp.manifest.id === p.id)) return false;
    if (p.dependencies?.some((dep) => {
      if (dep.type === 'server-plugin') return serverPlugins.some((sp) => sp.id === dep.id);
      return plugins.some((rp) => rp.manifest.id === dep.id);
    })) return false;
    return true;
  });

  const renderInstalledTab = () => (
    <>
      <div className="border-b border-[#2c2d33] p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('plugins.searchInstalled')}
            className="w-full rounded-lg border border-[#2c2d33] bg-[#202124] py-2.5 pl-9 pr-3 text-xs text-gray-200 outline-none placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleLoadPluginFile}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-[11px] font-semibold text-gray-400 hover:border-blue-500/50 hover:bg-[#2a2b30] hover:text-gray-200 transition-colors"
        >
          <Upload size={13} /> {t('plugins.loadFile')}
        </button>
        <input ref={fileInputRef} type="file" accept=".reviplug,.json" className="hidden" onChange={handlePluginFileSelected} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {filteredInstalled.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202124]">
              <Puzzle size={24} className="text-gray-600" />
            </div>
            <p className="text-xs text-gray-500">
              {search ? t('plugins.noResults') : t('plugins.noInstalled')}
            </p>
            <p className="max-w-[260px] text-[10px] text-gray-600">
              {t('plugins.noInstalledDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredInstalled.map((plugin) => (
              <div
                key={plugin.manifest.id}
                className="flex flex-col gap-3 rounded-xl border border-[#2c2d33] bg-[#202124] p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2a2b30]">
                      <Puzzle size={16} className="text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-gray-200">{plugin.manifest.name}</div>
                      <div className="text-[10px] text-gray-500">v{plugin.manifest.version}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => void togglePlugin(plugin.manifest.id)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                      plugin.state === 'active'
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-[#2a2b30] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {plugin.state === 'active' ? t('plugins.enabled') : t('plugins.disabledLabel')}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">{plugin.manifest.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{plugin.manifest.author}</span>
                  {plugin.manifest.permissions.some((perm: string) => perm.startsWith('renderer:') || perm.startsWith('juicer:')) && (
                    <span className="flex items-center gap-0.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300">
                      <Server size={8} /> {t('plugins.serverBadge')}
                    </span>
                  )}
                  {plugin.manifest.permissions.length > 0 && (
                    <span className="rounded bg-[#2a2b30] px-1.5 py-0.5 text-[9px] text-gray-500">
                      {plugin.manifest.permissions.length} perm.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-0 sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden sm:h-[600px] sm:w-[750px] sm:rounded-xl sm:border sm:border-[#2c2d33] bg-[#18191c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2c2d33] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Puzzle size={18} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white sm:text-base">{t('plugins.title')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#2c2d33] p-2 sm:w-44 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r sm:p-3">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSearch(''); }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:gap-2.5 sm:py-2.5 ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-[#202124] hover:text-gray-200'
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 ${
                  activeTab === item.id ? 'bg-blue-500/30' : 'bg-[#202124]'
                }`}>
                  {item.icon}
                </div>
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {activeTab === 'marketplace' && (
              <>
                <div className="border-b border-[#2c2d33] p-4">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('plugins.searchMarketplace')}
                      className="w-full rounded-lg border border-[#2c2d33] bg-[#202124] py-2.5 pl-9 pr-3 text-xs text-gray-200 outline-none placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {marketplaceTypeFilters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setMarketplaceTypeFilter(marketplaceTypeFilter === f.key ? null : f.key)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          marketplaceTypeFilter === f.key
                            ? f.activeColor
                            : f.color
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredMarketplace.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202124]">
                        <Package size={24} className="text-gray-600" />
                      </div>
                      <p className="text-xs text-gray-500">{t('plugins.noResults')}</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filteredMarketplace.map((plugin) => {
                        const installed = plugins.some((p) => p.manifest.id === plugin.id) || serverPlugins.some((sp) => sp.id === plugin.id);
                        const status = installStatus[plugin.id];
                        const isInstalling = installingPlugin === plugin.id || status === 'pending';
                        const isRejected = status === 'rejected';
                        const hasServerDeps = plugin.dependencies?.some((d) => d.type === 'server-plugin') || plugin.type === 'server-plugin';
                        return (
                          <div key={plugin.id} className="flex flex-col gap-3 rounded-xl border border-[#2c2d33] bg-[#202124] p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2a2b30]">
                                  {plugin.type === 'server-plugin' ? <Server size={16} className="text-purple-400" /> : <Puzzle size={16} className="text-blue-400" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-bold text-gray-200">{plugin.name}</div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-500">v{plugin.version}</span>
                                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${typeColors[plugin.type]}`}>
                                      {typeLabels[plugin.type]}
                                    </span>
                                    {plugin.tested === false && (
                                      <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                                        {t('plugins.untested')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-500">{plugin.description}</p>
                            {plugin.dependencies && plugin.dependencies.length > 0 && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-gray-500">{t('plugins.requirements')}</span>
                                {plugin.dependencies.map((dep) => (
                                  <div key={dep.id} className="flex items-center gap-1.5 text-[10px]">
                                    {dep.type === 'server-plugin' && <Server size={9} className="text-purple-400" />}
                                    <span className="text-gray-400">{dep.id}</span>
                                    <span className="text-gray-600">{dep.version}</span>
                                    {dep.required && <span className="text-amber-400">{t('plugins.required')}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600">{plugin.author}</span>
                              {hasServerDeps && (
                                <span className="flex items-center gap-0.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300">
                                   <Server size={8} /> {plugin.type === 'server-plugin' ? t('plugins.needsServerApproval') : t('plugins.needsServer')}
                                </span>
                              )}
                            </div>
                            {isRejected && (
                              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] text-red-300">
                                <AlertTriangle size={11} /> {t('plugins.serverRejected')}
                              </div>
                            )}
                            <button
                              onClick={() => installed ? togglePlugin(plugin.id) : handleInstallAppPlugin(plugin)}
                              disabled={isInstalling}
                              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                                isRejected
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                  : isInstalling
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : installed
                                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                      : 'bg-blue-600 text-white hover:bg-blue-500'
                              }`}
                            >
                              {isRejected ? <><X size={12} /> {t('plugins.rejected')}</> : isInstalling ? <><Loader2 size={12} className="animate-spin" /> {t('plugins.pending')}</> : installed ? <><Check size={12} /> {t('plugins.installedLabel')}</> : <><Download size={12} /> {t('plugins.install')}</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'server' && (
              <>
                <div className="border-b border-[#2c2d33] p-4">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('plugins.searchServer')}
                      className="w-full rounded-lg border border-[#2c2d33] bg-[#202124] py-2.5 pl-9 pr-3 text-xs text-gray-200 outline-none placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {spaceRenderServers.length === 0 && (
                    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                      <div className="flex items-center gap-2"><AlertTriangle size={14} /> {t('plugins.serverUnavailable')}</div>
                      <p className="mt-1 text-[10px] text-amber-300/70">{t('plugins.serverUnavailableDesc')}</p>
                    </div>
                  )}
                  {serverPlugins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202124]">
                        <Server size={24} className="text-gray-600" />
                      </div>
                      <p className="text-xs text-gray-500">{t('plugins.noServerPlugins')}</p>
                      <p className="max-w-[260px] text-[10px] text-gray-600">
                        {t('plugins.noServerPluginsDesc')}
                      </p>
                    </div>
                  ) : (
                    serverPlugins.map((sp) => (
                      <div key={sp.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2c2d33] bg-[#202124] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20">
                            <Server size={16} className="text-purple-400" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-200">{sp.name}</div>
                            <div className="text-[10px] text-gray-500">v{sp.version} · {sp.status}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => void handleRemoveServerPlugin(sp.id)}
                          className="rounded-md px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20"
                        >
                          {t('plugins.remove')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {(activeTab === 'installed' || activeTab === 'disabled') && renderInstalledTab()}
          </div>
        </div>

        {showInstallConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-xl border border-[#2c2d33] bg-[#18191c] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{t('plugins.installTitle')} {showInstallConfirm.name}</h3>
                <button onClick={() => setShowInstallConfirm(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="flex flex-col gap-2 text-xs text-gray-400">
                <p>{t('plugins.requiredComponents')}</p>
                <div className="flex flex-col gap-1.5 rounded-lg bg-[#202124] p-3">
                  {showInstallConfirm.type === 'server-plugin' ? (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-gray-200">{showInstallConfirm.name}</span>
                      <span className="ml-auto text-[10px] text-purple-400">Server Plugin</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check size={12} className="text-green-400" />
                      <span className="text-gray-200">{showInstallConfirm.name}</span>
                      <span className="ml-auto text-[10px] text-gray-500">App Plugin</span>
                    </div>
                  )}
                  {showInstallConfirm.dependencies?.map((dep) => (
                    <div key={dep.id} className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-gray-200">{dep.id}</span>
                      <span className="ml-auto text-[10px] text-purple-400">Server Plugin</span>
                    </div>
                  ))}
                </div>
                {(showInstallConfirm.type === 'server-plugin' || showInstallConfirm.dependencies?.some((d) => d.type === 'server-plugin')) && (
                  <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 text-[10px] text-purple-200">
                    <Shield size={12} />
                    {showInstallConfirm.type === 'server-plugin'
                      ? t('plugins.installConfirmServer')
                      : t('plugins.installConfirmDeps')}
                  </div>
                )}
                <p className="text-[10px] text-gray-500">{t('plugins.permissions')} {showInstallConfirm.permissions.join(', ')}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowInstallConfirm(null)} className="rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30]">{t('juicer.cancel')}</button>
                <button onClick={() => void confirmInstall(showInstallConfirm)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">{t('plugins.continue')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
