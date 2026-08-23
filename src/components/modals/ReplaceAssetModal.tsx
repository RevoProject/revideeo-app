/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { FileUp, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const ReplaceAssetModal = ({ assetName, onReplace, onClose }: { assetName: string; onReplace: (file: File) => void; onClose: () => void }) => { const { t } = useTranslation(); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="w-[440px] rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">{t('replace.title')}</h2><p className="mt-1 max-w-[340px] truncate text-xs text-gray-500">{assetName}</p></div><button onClick={onClose} className="text-gray-500"><X size={18} /></button></div><label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#3a3f47] bg-[#202124] p-8 text-xs text-gray-400"><FileUp size={22} className="text-blue-400" />{t('replace.chooseNew')}<input type="file" accept="video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onReplace(file); }} /></label><button onClick={onClose} className="mt-4 w-full px-3 py-2 text-xs text-gray-400">{t('juicer.cancel')}</button></div></div>; };
