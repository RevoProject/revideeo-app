/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Mic, MicOff, Paperclip, ArrowUp, Loader2, ChevronDown, Settings2,
  Zap, Film, Check, Scissors, Type, Sparkles, Shuffle, Undo2,
  Brain, Cpu, Music, Wand2, RotateCcw, Trash2, Clock, HardDrive,
  FolderOpen, ChevronRight, CircleAlert,
} from 'lucide-react';
import type { StoredClip, TrackSettings } from '../../types';
import { showAlert } from '../shared/showAlert';
import { showConfirm } from '../shared/showConfirm';
import { aiProviderRegistry } from '../../ai';
import { executeOperations, type JuicerOperation } from '../../juicer/stepExecutor';
import { validateOperations } from '../../juicer/validator';
import { useTranslation } from '../../i18n';

export interface JuicerSnapshot {
  clips: StoredClip[];
  trackCount: number;
  trackSettings: TrackSettings[];
  newAssets?: { sourceId: string; name: string; blob: Blob; durationInFrames: number }[];
  timestamp: number;
  description: string;
}

export type JuicerPhase = 'idle' | 'analyzing' | 'plan' | 'executing' | 'done';

interface JuicerProps {
  onClose: () => void;
  clips: StoredClip[];
  trackCount: number;
  trackSettings: TrackSettings[];
  onApplySnapshot: (snapshot: JuicerSnapshot) => void;
  onUndoSnapshot: () => void;
  hasSnapshot: boolean;
  pluginPickerFields?: { id: string; label: string; placeholder: string }[];
  projectId?: string;
  assetNames?: string[];
  projectConfig?: { resolutionLabel: string; orientation: string; fps: number };
  assetCount?: number;
}

interface PromptHistoryEntry {
  id: string;
  text: string;
  pickerValues: Record<string, string>;
  timestamp: number;
  scope: 'global' | 'project';
}

interface PlanChange {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  excluded: boolean;
}

const HISTORY_GLOBAL_KEY = 'revideeo:juicer:history';

const loadHistory = (scope: 'global' | 'project', projectId?: string): PromptHistoryEntry[] => {
  try {
    if (scope === 'project' && projectId) {
      const raw = localStorage.getItem(`revideeo:juicer:history:${projectId}`);
      return raw ? JSON.parse(raw) : [];
    }
    const raw = localStorage.getItem(HISTORY_GLOBAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveHistoryGlobal = (entries: PromptHistoryEntry[]) => {
  localStorage.setItem(HISTORY_GLOBAL_KEY, JSON.stringify(entries.slice(0, 50)));
};

const saveHistoryProject = (projectId: string, entries: PromptHistoryEntry[]) => {
  localStorage.setItem(`revideeo:juicer:history:${projectId}`, JSON.stringify(entries.slice(0, 50)));
};

const getQuickActions = (t: (key: string) => string) => [
  { icon: <Zap size={18} className="text-amber-400" />, label: t('juicer.quick.short'), desc: t('juicer.quick.shortDesc'), prompt: t('juicer.quick.shortPrompt') },
  { icon: <Film size={18} className="text-blue-400" />, label: t('juicer.quick.long'), desc: t('juicer.quick.longDesc'), prompt: t('juicer.quick.longPrompt') },
  { icon: <Music size={18} className="text-pink-400" />, label: t('juicer.quick.music'), desc: t('juicer.quick.musicDesc'), prompt: t('juicer.quick.musicPrompt') },
  { icon: <Type size={18} className="text-green-400" />, label: t('juicer.quick.presentation'), desc: t('juicer.quick.presentationDesc'), prompt: t('juicer.quick.presentationPrompt') },
];

const getPluginTemplates = (t: (key: string) => string) => [
  { id: 'creator', label: t('juicer.creator'), placeholder: t('juicer.creatorPlaceholder') },
  { id: 'style', label: t('juicer.style'), placeholder: t('juicer.stylePlaceholder') },
  { id: 'audience', label: t('juicer.audience'), placeholder: t('juicer.audiencePlaceholder') },
];

const defaultChanges: PlanChange[] = [
  { id: 'silence', icon: <Scissors size={12} className="text-gray-400" />, title: 'Usuń ciszę', description: 'Wykryto 3 fragmenty ciszy (łącznie 4.1s). Zostaną usunięte.', excluded: false },
  { id: 'select', icon: <Film size={12} className="text-gray-400" />, title: 'Wybierz najlepsze fragmenty', description: 'Przeanalizowano 12.4s materiału. Wybrano 6 segmentów.', excluded: false },
  { id: 'captions', icon: <Type size={12} className="text-gray-400" />, title: 'Dodaj captions', description: '24 napisów. Styl: bold, 48px, biały z cieniem.', excluded: false },
  { id: 'animations', icon: <Sparkles size={12} className="text-gray-400" />, title: 'Dodaj animacje wejścia', description: '7 klipów: zoom 1.1→1.0 + slide. Czas: 0.5s każdy.', excluded: false },
  { id: 'transitions', icon: <Shuffle size={12} className="text-gray-400" />, title: 'Dodaj przejścia', description: '3 przejścia: cross-zoom (15 kl.), fade (10 kl.), wipe (12 kl.).', excluded: false },
];

const analyzeResults = [
  { icon: <Check size={14} className="text-green-400" />, text: '4 materiały' },
  { icon: <Check size={14} className="text-green-400" />, text: '3 ścieżki' },
  { icon: <Check size={14} className="text-green-400" />, text: '12.4 s materiału' },
];

const capabilitiesList = [
  { icon: <Check size={14} className="text-green-400" />, text: 'Auto Cut' },
  { icon: <Type size={14} className="text-green-400" />, text: 'Captions' },
  { icon: <Shuffle size={14} className="text-green-400" />, text: 'Transitions' },
  { icon: <Sparkles size={14} className="text-green-400" />, text: 'Animations' },
  { icon: <Music size={14} className="text-green-400" />, text: 'Audio' },
];

export const JuicerModal = ({
  onClose, clips, trackCount, trackSettings, onApplySnapshot, onUndoSnapshot, hasSnapshot,
  pluginPickerFields = [], projectId, assetNames = [], projectConfig, assetCount = 0,
}: JuicerProps) => {
  const { t, lang } = useTranslation();
  const quickActions = getQuickActions(t);
  const pluginTemplates = getPluginTemplates(t);
  const [phase, setPhase] = useState<JuicerPhase>('idle');
  const [input, setInput] = useState('');
  const [model, setModel] = useState(() => {
    const all = aiProviderRegistry.getEnabledProviders();
    const servers = all.filter((p) => p.id.startsWith('server-'));
    if (servers.length > 0) return servers[0].id;
    const local = all.find((p) => p.id === 'local');
    return local ? local.id : 'local';
  });
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [executedSteps, setExecutedSteps] = useState<{ icon: React.ReactNode; text: string }[]>([]);
  const [_currentStep, setCurrentStep] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number; file?: File }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const [changes, setChanges] = useState<PlanChange[]>(defaultChanges);
  const [aiProgress, setAiProgress] = useState<{ step: string; progress: number } | null>(null);
  const [aiThinking, setAiThinking] = useState(0);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [history, setHistory] = useState<PromptHistoryEntry[]>(() => loadHistory('global'));
  const [historyTab, setHistoryTab] = useState<'all' | 'project'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [saveToProject, setSaveToProject] = useState(false);
  const [pickerValues, setPickerValues] = useState<Record<string, string>>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const [useProjectFiles, setUseProjectFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planStepsRef = useRef<JuicerOperation[]>([]);

  const allEnabled = aiProviderRegistry.getEnabledProviders();
  const serverProviders = allEnabled.filter((p) => p.id.startsWith('server-'));
  const hasServer = serverProviders.length > 0;
  const localProvider = allEnabled.find((p) => p.id === 'local');
  const availableProviders = hasServer
    ? serverProviders
    : localProvider
      ? [localProvider]
      : [];
  const dedupedProviders = availableProviders.filter((p, _i, arr) => {
    if (p.type === 'gemini' && arr.some((q) => q.type === 'gemini' && q.id !== p.id)) {
      return !p.id.startsWith('server-') ? false : true;
    }
    return true;
  });
  const currentProvider = aiProviderRegistry.getProvider(model);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
        if (phase !== 'idle') {
          e.preventDefault();
          showAlert('Uwaga', 'Nie odświeżaj strony podczas pracy AI. Możesz utracić dane.', 'error');
        }
      }
      if ((e.key === 'Escape') && phase !== 'idle' && phase !== 'done') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'idle' && phase !== 'done') {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'analyzing' && !aiProgress) {
      const msgs = [
        t('juicer.analyzing'),
        t('juicer.readingStructure'),
        t('juicer.checkingClips'),
        t('juicer.analyzingTransitions'),
        t('juicer.preparingContext'),
        t('juicer.thinkingPlan'),
        t('juicer.comparingEdits'),
        t('juicer.optimizingSteps'),
      ];
      setAiThinking(0);
      const interval = setInterval(() => setAiThinking((p) => (p + 1) % msgs.length), 2000);
      return () => clearInterval(interval);
    }
  }, [phase, aiProgress]);

  useEffect(() => () => {
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    if (executeTimerRef.current) clearTimeout(executeTimerRef.current);
    recognitionRef.current?.abort();
  }, []);

  const toggleRecording = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showAlert('Niedostępne', 'Użyj Chrome lub Edge.', 'info'); return; }
    const r = new SR();
    r.lang = lang === 'pl' ? 'pl-PL' : lang === 'de' ? 'de-DE' : 'en-US'; r.interimResults = true; r.continuous = true;
    r.onresult = (e: SpeechRecognitionEvent) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
    r.onerror = () => setIsRecording(false);
    r.onend = () => setIsRecording(false);
    recognitionRef.current = r; r.start(); setIsRecording(true);
  };

  const ALLOWED_MIME_PREFIXES = ['video/', 'audio/', 'image/', 'text/'];
  const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'txt', 'srt', 'vtt', 'json']);

  const isAllowedFile = (file: File) => {
    if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ALLOWED_EXTENSIONS.has(ext);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).filter(isAllowedFile);
    const rejected = Array.from(files).length - allowed.length;
    if (rejected > 0) {
      showAlert('Odrzucono pliki', `Pominięto ${rejected} plików. Dozwolone: wideo, audio, zdjęcia, tekst.`, 'error');
    }
    setAttachedFiles((prev) => [...prev, ...allowed.map((f) => ({ name: f.name, size: f.size, file: f }))]);
  };

  const readFileContent = async (file: File): Promise<string> => {
    if (file.size > 1024 * 1024) return `[plik ${file.name} — ${(file.size / 1024 / 1024).toFixed(1)} MB, za duży na analizę tekstu]`;
    if (file.type.startsWith('text/') || file.name.endsWith('.srt') || file.name.endsWith('.vtt') || file.name.endsWith('.json')) {
      return await file.text();
    }
    return `[${file.type || 'binarny'}: ${file.name}, ${(file.size / 1024).toFixed(0)} KB]`;
  };

  const isDemo = input.trim().toUpperCase() === 'DEMO_PROMPT';

  const addToHistory = useCallback((text: string, scope: 'global' | 'project', pv: Record<string, string>) => {
    if (!text) return;
    const entry: PromptHistoryEntry = { id: `${Date.now()}`, text, pickerValues: { ...pv }, timestamp: Date.now(), scope };
    setHistory((prev) => {
      const filtered = [...prev, entry].filter((h) => h.text !== text).slice(0, 50);
      const globalEntries = filtered.filter((h) => h.scope === 'global');
      saveHistoryGlobal(globalEntries);
      if (projectId) {
        const projectEntries = filtered.filter((h) => h.scope === 'project');
        saveHistoryProject(projectId, projectEntries);
      }
      return filtered;
    });
  }, [projectId]);

  const buildFullPrompt = useCallback(() => {
    let base = input.trim();
    for (const tpl of pluginTemplates) {
      const val = pickerValues[tpl.id];
      if (val) base += ` ${tpl.label}: ${val}.`;
    }
    if (useProjectFiles && assetNames.length > 0) {
      base += ` Użyj materiałów z projektu: ${assetNames.join(', ')}.`;
    }
    return base;
  }, [input, pickerValues, useProjectFiles, assetNames]);

  const handleExecute = async () => {
    if (!input.trim() && !isDemo) return;
    const fullPrompt = buildFullPrompt();
    addToHistory(input.trim(), saveToProject && projectId ? 'project' : 'global', pickerValues);
    setProviderError(null);
    setAiProgress(null);
    setValidationErrors([]);
    setClarificationQuestion(null);
    setPhase('analyzing');

    if (!isDemo && currentProvider) {
      currentProvider.onProgress = (event) => setAiProgress(event);
      try {
        const clipsContext = clips.map((c) => ({ sourceId: c.sourceId, name: assetNames[clips.indexOf(c)] ?? c.sourceId, durationInFrames: c.durationInFrames }));
        const attachmentsContext = attachedFiles.map((f) => f.name);
        const fileContents: string[] = [];
        for (const f of attachedFiles) {
          if (f.file) {
            const content = await readFileContent(f.file);
            if (!content.startsWith('[')) fileContents.push(`--- ${f.name} ---\n${content}\n---`);
          }
        }
        const enrichedPrompt = fullPrompt
          + (clipsContext.length > 0 ? `\nMateriały w projekcie: ${clipsContext.map((c) => `${c.name} (${(c.durationInFrames / (projectConfig?.fps ?? 30)).toFixed(1)}s)`).join(', ')}` : '')
          + (attachmentsContext.length > 0 ? `\nZałączone pliki: ${attachmentsContext.join(', ')}` : '')
          + (fileContents.length > 0 ? `\n\nZawartość załączonych plików:\n${fileContents.join('\n')}` : '')
          + (assetCount > 0 && clipsContext.length === 0 ? `\nW projekcie jest ${assetCount} plików multimedialnych (brak na osi czasu)` : '');
        const planResult = await currentProvider.generatePlan({
          prompt: enrichedPrompt,
          context: {
            clips: clipsContext,
            trackCount,
            fps: projectConfig?.fps ?? 30,
            resolution: projectConfig?.resolutionLabel ?? '720p',
            orientation: projectConfig?.orientation ?? '16:9',
          },
          attachments: attachedFiles.map((f, i) => ({
            attachmentId: `att_${String(i).padStart(3, '0')}`,
            name: f.name,
            mimeType: f.file?.type,
            kind: f.file?.type.startsWith('video/') ? 'video' : f.file?.type.startsWith('audio/') ? 'audio' : f.file?.type.startsWith('image/') ? 'image' : 'other',
            metadata: { size: f.size },
          })),
          scope: saveToProject ? 'project' : 'global',
        });
        currentProvider.onProgress = null;
        if (planResult.status === 'clarification_required') {
          setClarificationQuestion(planResult.question ?? 'Potrzebuję więcej informacji.');
          setAiProgress(null);
          setPhase('plan');
          return;
        }
        setClarificationQuestion(null);
        const mappedChanges: PlanChange[] = planResult.steps.map((step) => ({
          id: step.id,
          icon: <Check size={12} className="text-gray-400" />,
          title: step.title,
          description: step.description,
          excluded: !step.required,
        }));
        planStepsRef.current = planResult.steps.map((s) => ({ id: s.id, type: s.type, title: s.title, description: s.description, params: s.params ?? {}, required: s.required }));
        setChanges(mappedChanges.length > 0 ? mappedChanges : defaultChanges);
        setAiProgress(null);
      } catch (err) {
        currentProvider.onProgress = null;
        setProviderError(err instanceof Error ? err.message : 'Unknown error');
        setChanges([]);
        setAiProgress(null);
      }
    } else {
      setChanges(defaultChanges);
    }
    setPhase('plan');
  };

  const handleApplyPlan = async () => {
    const activeIds = new Set(changes.filter((c) => !c.excluded).map((c) => c.id));
    const activeSteps = planStepsRef.current.filter((s) => activeIds.has(s.id));
    setPhase('executing');
    setExecutedSteps([]);
    setCurrentStep(0);

    if (isDemo || activeSteps.length === 0) {
      const demoSteps = [
        { icon: <Scissors size={14} className="text-green-400" />, text: 'Przeanalizowano materiały' },
        { icon: <Film size={14} className="text-green-400" />, text: 'Wybrano najlepsze fragmenty' },
        { icon: <Sparkles size={14} className="text-green-400" />, text: 'Dodano animacje' },
        { icon: <Shuffle size={14} className="text-green-400" />, text: 'Dodano przejścia' },
      ];
      let idx = 0;
      const run = () => {
        if (idx < demoSteps.length) {
          setExecutedSteps((prev) => [...prev, demoSteps[idx]]);
          idx++;
          executeTimerRef.current = setTimeout(run, 500);
        } else {
          executeTimerRef.current = setTimeout(() => {
            onApplySnapshot({ clips: [...clips], trackCount, trackSettings: [...trackSettings], timestamp: Date.now(), description: isDemo ? 'DEMO' : (input || 'Juicer') });
            setPhase('done');
          }, 300);
        }
      };
      run();
      return;
    }

    const attachmentNames: Record<string, string> = {};
    const attachmentKinds: Record<string, string> = {};
    for (let i = 0; i < attachedFiles.length; i++) {
      const f = attachedFiles[i];
      const attId = `att_${String(i).padStart(3, '0')}`;
      const kind = f.file?.type.startsWith('video/') ? 'video' : f.file?.type.startsWith('audio/') ? 'audio' : f.file?.type.startsWith('image/') ? 'image' : 'video';
      attachmentNames[attId] = f.name;
      attachmentKinds[attId] = kind;
      attachmentNames[f.name] = f.name;
      attachmentKinds[f.name] = kind;
    }
    const ctx = { clips: clips.map((c) => ({ ...c })), trackCount, trackSettings: trackSettings.map((t) => ({ ...t })), fps: projectConfig?.fps ?? 30, attachmentNames, attachmentKinds };
    const validation = validateOperations(activeSteps, ctx);
    if (!validation.valid) {
      setValidationErrors(validation.errors.map((e) => `[${e.type}] ${e.message}`));
      setPhase('plan');
      return;
    }
    setValidationErrors([]);
    const result = await executeOperations(
      validation.cleanedOperations,
      ctx,
      (index, stepResult) => {
        setExecutedSteps((prev) => [...prev, { icon: <Check size={14} className="text-green-400" />, text: stepResult.message }]);
        setCurrentStep(index + 1);
      },
    );

    const newAssets = attachedFiles
      .filter((f) => f.file)
      .map((f, i) => ({
        sourceId: `att_${String(i).padStart(3, '0')}`,
        name: f.name,
        blob: f.file!,
        durationInFrames: 90,
      }));

    onApplySnapshot({ clips: result.clips, trackCount: result.trackCount, trackSettings: result.trackSettings, newAssets, timestamp: Date.now(), description: input || 'Juicer' });
    setPhase('done');
  };

  const handleUndoAll = () => {
    onUndoSnapshot(); setPhase('idle'); setInput(''); setExecutedSteps([]); setAttachedFiles([]); setShowChanges(false);
  };

  const removeChange = async (id: string) => {
    if (!await showConfirm({ title: t('juicer.removeChange'), message: t('juicer.removeChangeConfirm'), confirmLabel: t('common.yes'), cancelLabel: t('common.no') })) return;
    setChanges((prev) => prev.map((c) => c.id === id ? { ...c, excluded: true } : c));
  };

  const restoreChange = (id: string) => {
    setChanges((prev) => prev.map((c) => c.id === id ? { ...c, excluded: false } : c));
  };

  const deleteHistoryEntry = async (id: string) => {
    if (!await showConfirm({ title: t('juicer.removeFromHistory'), message: t('juicer.removeFromHistoryConfirm'), confirmLabel: t('juicer.remove'), cancelLabel: t('juicer.cancel'), danger: true })) return;
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    if (historyTab === 'project' && projectId) {
      saveHistoryProject(projectId, next);
    } else {
      saveHistoryGlobal(next);
    }
  };

  const filteredHistory = history.filter((h) => historyTab === 'all' || h.scope === 'project');
  const activeChanges = changes.filter((c) => !c.excluded);

  useEffect(() => {
    const all = [...loadHistory('global')];
    if (projectId) all.push(...loadHistory('project', projectId));
    all.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(all.slice(0, 50));
  }, [projectId]);

  const thinkingMsgs = [t('juicer.analyzing'), t('juicer.readingStructure'), t('juicer.checkingClips'), t('juicer.analyzingTransitions'), t('juicer.preparingContext'), t('juicer.thinkingPlan'), t('juicer.comparingEdits'), t('juicer.optimizingSteps')];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-[620px] max-h-[85vh] flex-col overflow-hidden rounded-xl border border-[#2c2d33] bg-[#18191c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2c2d33] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🍹</span>
            <div>
              <h2 className="text-sm font-bold text-white">JUICER{phase === 'plan' && ' — PLAN'}{phase === 'done' && ' — GOTOWE'} <span className="ml-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/30">Beta</span></h2>
              {phase === 'idle' && <p className="text-[10px] text-gray-500">AI assistant for your project</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'idle' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[#2c2d33] bg-[#202124] p-4">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('juicer.placeholder')} rows={3}
                  className="w-full resize-none bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-500" />
                {attachedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {attachedFiles.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-md bg-[#2a2b30] px-2 py-1 text-[10px] text-gray-400">
                        <Paperclip size={10} />{f.name}
                        <button onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="ml-0.5 text-gray-500 hover:text-gray-300"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {isDemo && <p className="mt-2 text-[10px] text-blue-400">{t('juicer.demoMode')}</p>}
                <div className="mt-2 flex items-center gap-2 border-t border-[#2c2d33] pt-3">
                  <button onClick={toggleRecording}
                    className={`rounded-lg p-2 transition-colors ${isRecording ? 'bg-red-600/20 text-red-400 animate-pulse' : 'text-gray-500 hover:bg-[#2a2b30] hover:text-gray-300'}`}
                    title={isRecording ? t('juicer.stop') : t('juicer.microphone')}>
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2 text-gray-500 hover:bg-[#2a2b30] hover:text-gray-300" title={t('juicer.attach')}><Paperclip size={16} /></button>
                  <button onClick={() => showAlert(t('juicer.comingSoon'), t('juicer.comingSoonDesc'), 'info')}
                    className="rounded-lg p-2 text-gray-500 hover:bg-[#2a2b30] hover:text-gray-300" title={t('juicer.upload')}><ArrowUp size={16} /></button>
                  {assetCount > 0 && (
                    <button onClick={() => setUseProjectFiles(!useProjectFiles)}
                      className={`rounded-lg p-2 transition-colors ${useProjectFiles ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:bg-[#2a2b30] hover:text-gray-300'}`}
                      title={`Użyj plików projektu (${assetCount})`}>
                      <FolderOpen size={16} />
                    </button>
                  )}
                    <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,image/*,.txt,.srt,.vtt,.json" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
                </div>
              </div>

              <button onClick={() => setShowAdditional(!showAdditional)}
                className="flex items-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs text-gray-400 hover:bg-[#2a2b30] transition-colors">
                <Settings2 size={14} /> {t('juicer.additionalOptions')}
                {pluginPickerFields.length > 0 && (
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">+{pluginPickerFields.length}</span>
                )}
                <ChevronDown size={12} className={`ml-auto transition-transform ${showAdditional ? 'rotate-180' : ''}`} />
              </button>
              {showAdditional && (
                <div className="flex flex-col gap-2 rounded-xl border border-[#2c2d33] bg-[#141517] p-3">
                  {pluginTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2">
                      <span className="shrink-0 text-[10px] text-gray-500 w-20">{tpl.label}</span>
                      <input value={pickerValues[tpl.id] ?? ''} onChange={(e) => setPickerValues((p) => ({ ...p, [tpl.id]: e.target.value }))}
                        placeholder={tpl.placeholder} className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-600" />
                    </div>
                  ))}
                  {pluginPickerFields.length > 0 && (
                    <>
                      <div className="border-t border-[#2c2d33] pt-2">
                        <p className="mb-1 text-[9px] font-bold tracking-wider text-purple-400">{t('tools.pluginsTitle')}</p>
                      </div>
                      {pluginPickerFields.map((tpl) => (
                        <div key={tpl.id} className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-[#202124] px-3 py-2">
                          <span className="shrink-0 text-[10px] text-purple-400 w-20">{tpl.label}</span>
                          <input value={pickerValues[tpl.id] ?? ''} onChange={(e) => setPickerValues((p) => ({ ...p, [tpl.id]: e.target.value }))}
                            placeholder={tpl.placeholder} className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-600" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {quickActions.map((a) => (
                  <button key={a.label} onClick={() => setInput(a.prompt)}
                    className="flex flex-col items-start gap-1.5 rounded-xl border border-[#2c2d33] bg-[#202124] p-4 text-left transition-colors hover:border-blue-500/50 hover:bg-[#2a2b30]">
                    {a.icon}<span className="text-xs font-bold text-gray-200">{a.label}</span><span className="text-[10px] text-gray-500">{a.desc}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs text-gray-400 hover:bg-[#2a2b30] transition-colors">
                <Clock size={14} /> {t('juicer.history')} <ChevronRight size={12} className={`ml-auto transition-transform ${showHistory ? 'rotate-90' : ''}`} />
              </button>
              {showHistory && (
                <div className="flex flex-col gap-2 rounded-xl border border-[#2c2d33] bg-[#141517] p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistoryTab('all')} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${historyTab === 'all' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-[#202124]'}`}>
                      <HardDrive size={10} className="mr-1 inline" />{t('juicer.historyAll')}
                    </button>
                    <button onClick={() => setHistoryTab('project')} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${historyTab === 'project' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-[#202124]'}`}>
                      <FolderOpen size={10} className="mr-1 inline" />{t('juicer.historyProject')}
                    </button>
                    {projectId && (
                      <label className="ml-auto flex items-center gap-1.5 text-[9px] text-gray-500 cursor-pointer select-none">
                        <input type="checkbox" checked={saveToProject} onChange={(e) => setSaveToProject(e.target.checked)}
                          className="h-3 w-3 rounded border-gray-600 bg-[#202124] accent-blue-500" />
                        {t('juicer.saveToProject')}
                      </label>
                    )}
                  </div>
                  {filteredHistory.length === 0 ? (
                    <p className="py-3 text-center text-[10px] text-gray-600">{t('juicer.noHistory')}</p>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {filteredHistory.map((h) => {
                        const d = new Date(h.timestamp);
                        const dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(-2)}`;
                        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                        const displayText = h.text.length > 125 ? h.text.slice(0, 125) + '...' : h.text;
                        const pickerSummary = h.pickerValues && Object.keys(h.pickerValues).length > 0
                          ? Object.values(h.pickerValues).filter(Boolean).join(', ')
                          : '';

  return (
                          <div key={h.id} className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-[#202124] group">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setInput(h.text); if (h.pickerValues) setPickerValues(h.pickerValues); setShowHistory(false); }}
                                className="min-w-0 flex-1 text-left text-[11px] text-gray-400 hover:text-gray-200">
                                <span className="truncate block">{displayText}</span>
                                {pickerSummary && <span className="block truncate text-[9px] text-purple-400/70">{pickerSummary}</span>}
                              </button>
                              <span className="shrink-0 text-[9px] text-gray-600">{dateStr} {timeStr}</span>
                              <button onClick={() => void deleteHistoryEntry(h.id)} className="shrink-0 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {hasSnapshot && (
                <button onClick={handleUndoAll} className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
                  <Undo2 size={14} /> {t('juicer.undoJuicer')}
                </button>
              )}
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="flex flex-col gap-5 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-300"><Loader2 size={16} className="animate-spin text-blue-400" />{aiProgress?.step ?? (isDemo ? thinkingMsgs[aiThinking] : thinkingMsgs[aiThinking])}</div>
              {aiProgress && (
                <div className="flex flex-col gap-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#202124]">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${aiProgress.progress}%` }} />
                  </div>
                  <span className="text-right text-[10px] text-gray-500">{aiProgress.progress}%</span>
                </div>
              )}
              {providerError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                  <CircleAlert size={14} /> {providerError}
                </div>
              )}
              {!aiProgress && (
                <div className="flex flex-col gap-2">{analyzeResults.map((item, i) => <div key={i} className="flex items-center gap-2 text-xs text-gray-400">{item.icon}{item.text}</div>)}</div>
              )}
              {!aiProgress && (
                <div className="border-t border-[#2c2d33] pt-4">
                  <p className="mb-2 text-xs text-gray-500">{t('juicer.capabilitiesTitle')}</p>
                  <div className="flex flex-col gap-1.5">{capabilitiesList.map((cap, i) => <div key={i} className="flex items-center gap-2 text-xs text-gray-400">{cap.icon}{cap.text}</div>)}</div>
                </div>
              )}
              <div className="flex justify-center pt-2"><div className="flex gap-1.5"><div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" /><div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" /><div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" /></div></div>
            </div>
          )}

          {phase === 'plan' && (
            <div className="flex flex-col gap-5">
              {providerError && (
                <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                    <CircleAlert size={13} /> {t('juicer.aiError')}
                  </div>
                  <p className="text-[11px] text-red-400/80">{providerError}</p>
                </div>
              )}
              {validationErrors.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                    <CircleAlert size={13} /> {t('juicer.operationsRejected')} ({validationErrors.length})
                  </div>
                  {validationErrors.map((err, i) => (
                    <div key={i} className="text-[11px] text-red-400/80">{err}</div>
                  ))}
                  <p className="text-[10px] text-red-500/60 mt-1">{t('juicer.aiRejectedOps')}</p>
                </div>
              )}

              {clarificationQuestion ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <CircleAlert size={14} /> {t('juicer.aiNeedsInfo')}
                  </div>
                  <p className="text-sm text-gray-200">{clarificationQuestion}</p>
                  <p className="text-[10px] text-gray-500">{t('juicer.clarifyPrompt')}</p>
                </div>
              ) : (
              <>
              <p className="text-xs text-gray-300">Przygotowałem plan ({activeChanges.length} zmian):</p>
              <div className="rounded-xl border border-[#2c2d33] bg-[#202124] p-4">
                <p className="mb-2 text-[10px] font-bold tracking-wider text-gray-500">TIMELINE</p>
                <div className="flex flex-col gap-1.5">
                  {activeChanges.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-xs text-gray-400">{step.icon}{step.title}</div>
                  ))}
                </div>
              </div>
              {showChanges && (
                <div className="rounded-xl border border-[#2c2d33] bg-[#141517] p-4">
                  <p className="mb-3 text-[10px] font-bold tracking-wider text-gray-500">SZCZEGÓŁOWE ZMIANY</p>
                  <div className="flex flex-col gap-2 text-[11px]">
                    {changes.map((ch) => (
                      <div key={ch.id} className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${ch.excluded ? 'opacity-40' : 'hover:bg-[#202124]'}`}>
                        <span className="mt-0.5 shrink-0">{ch.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-gray-300">{ch.title}</span>
                          <p className="text-gray-500">{ch.description}</p>
                        </div>
                        {ch.excluded ? (
                          <button onClick={() => restoreChange(ch.id)} className="shrink-0 rounded p-1 text-[10px] text-blue-400 hover:bg-[#202124]">{t('juicer.restore')}</button>
                        ) : (
                          <button onClick={() => void removeChange(ch.id)} className="shrink-0 rounded p-1 text-gray-600 hover:text-red-400 hover:bg-[#202124]"><X size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setPhase('idle'); setChanges(defaultChanges); setClarificationQuestion(null); setProviderError(null); }} className="rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors">
                  {clarificationQuestion || providerError ? t('juicer.back') : t('juicer.cancel')}
                </button>
                {!clarificationQuestion && !providerError && (
                  <>
                    <button onClick={() => setShowChanges(!showChanges)} className="rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors">{showChanges ? t('juicer.hide') : t('juicer.showChanges')}</button>
                    <button onClick={() => void handleApplyPlan()} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1.5"><Check size={14} /> {t('juicer.apply')}</button>
                  </>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {phase === 'executing' && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-300"><Loader2 size={16} className="animate-spin text-blue-400" />{t('juicer.executing')}</div>
              <div className="flex flex-col gap-2">
                {executedSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400"><Check size={14} className="text-green-400" />{step.text ?? '...'}</div>
                ))}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-gray-300">{t('juicer.finished')}</p>
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex flex-col gap-1.5">
                  {executedSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300"><Check size={14} className="text-green-400" />{step.text ?? '...'}</div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500">{t('juicer.changesEditable')}</p>
              <div className="flex justify-between">
                <button onClick={handleUndoAll} className="flex items-center gap-1.5 rounded-lg bg-[#202124] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors"><RotateCcw size={14} /> {t('juicer.back')}</button>
                <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors">{t('juicer.close')}</button>
              </div>
            </div>
          )}
        </div>

        {phase === 'idle' && (
          <div className="flex items-center justify-between border-t border-[#2c2d33] px-5 py-3">
            <div className="relative">
              <button onClick={() => { setShowModelPicker(!showModelPicker); setShowSettings(false); }}
                className="flex items-center gap-1.5 rounded-lg bg-[#202124] px-3 py-1.5 text-[11px] text-gray-400 hover:bg-[#2a2b30] transition-colors">
                {currentProvider?.type === 'gemini' ? <><Brain size={12} className="text-purple-400" /> {currentProvider.name}</> : currentProvider?.type === 'local' ? <><Cpu size={12} /> Local AI</> : currentProvider ? <><Cpu size={12} /> {currentProvider.name}</> : <><Cpu size={12} /> Local AI</>}
                <ChevronDown size={12} />
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded-lg border border-[#3a3d45] bg-[#1F222A] shadow-xl">
                  {dedupedProviders.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-gray-500">{t('juicer.noProviders')}</div>
                  ) : (
                    dedupedProviders.map((p) => (
                      <button key={p.id} onClick={() => { setModel(p.id); setShowModelPicker(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${model === p.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#2a2d34]'}`}>
                        {p.type === 'local' ? <Cpu size={13} /> : p.type === 'gemini' ? <Brain size={13} className="text-purple-400" /> : <Cpu size={13} />}
                        {p.type === 'local' ? 'Local AI' : p.name}
                        {p.getConfig().enabled && <span className="ml-auto text-[9px] text-green-400">{(p as { profileName?: string }).profileName ?? ''}</span>}
                      </button>
                    ))
                  )}
                  {providerError && (
                    <div className="flex items-center gap-1.5 border-t border-[#2c2d33] px-3 py-2 text-[10px] text-red-400">
                      <CircleAlert size={10} /> {providerError}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => { setShowSettings(!showSettings); setShowModelPicker(false); }} className="rounded-lg p-2 text-gray-500 hover:bg-[#202124] hover:text-gray-300 transition-colors" title={t('juicer.settings')}><Settings2 size={16} /></button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 z-10 mb-2 w-56 overflow-hidden rounded-lg border border-[#3a3d45] bg-[#1F222A] shadow-xl">
                    <div className="border-b border-[#2c2d33] px-3 py-2 text-[10px] font-bold tracking-wider text-gray-500">{t('juicer.settings')}</div>
                    {[{ l: t('juicer.captionLang'), v: t('juicer.captionLangValue') }, { l: t('juicer.animationStyle'), v: t('juicer.animationStyleValue') }, { l: t('juicer.transitions'), v: 'Auto' }, { l: t('juicer.bgMusic'), v: t('juicer.bgMusicValue') }].map((o) => (
                      <div key={o.l} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#2a2d34]"><span className="text-gray-400">{o.l}</span><span className="text-gray-200">{o.v}</span></div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => void handleExecute()} disabled={!input.trim() && !isDemo}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed ${(input.trim() || isDemo) ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-[#202124] text-gray-600 disabled:opacity-40'}`}>
                <Wand2 size={14} /> {t('juicer.execute')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
