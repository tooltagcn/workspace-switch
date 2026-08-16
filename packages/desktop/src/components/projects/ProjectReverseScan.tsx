import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';

type ScanItem = {
  name: string;
  agentName: string;
  classification: 'new' | 'conflict' | 'synced';
  sourcePath: string;
  description?: string | null;
};

const classificationColor: Record<ScanItem['classification'], string> = {
  new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  conflict: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  synced: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export default function ProjectReverseScan() {
  const { t } = useTranslation();
  const { selectedProject, scanSkills, scanMcps, importScannedSkills, importScannedMcps, fetchAvailableSkills, fetchAvailableMcps } = useProjectStore();

  const [tab, setTab] = useState<'skill' | 'mcp'>('skill');
  const [items, setItems] = useState<ScanItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!selectedProject) return null;

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const scanned = tab === 'skill'
        ? await scanSkills(selectedProject.id)
        : await scanMcps(selectedProject.id);
      setItems(scanned as ScanItem[]);
    } catch (err) {
      setResult(String(err));
    } finally {
      setScanning(false);
    }
  };

  const runImport = async () => {
    const toImport = items.filter((i) => i.classification !== 'synced');
    if (toImport.length === 0) {
      setResult(t('project.reverseScan.allSynced'));
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      if (tab === 'skill') {
        await importScannedSkills(toImport);
      } else {
        await importScannedMcps(toImport);
      }
      await fetchAvailableSkills(selectedProject.id);
      await fetchAvailableMcps(selectedProject.id);
      setResult(t('project.reverseScan.imported', { count: toImport.length }));
      setItems([]);
    } catch (err) {
      setResult(String(err));
    } finally {
      setImporting(false);
    }
  };

  const toImportCount = items.filter((i) => i.classification !== 'synced').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{t('project.reverseScan.title')}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => { setTab('skill'); setItems([]); setResult(null); }}
            className={`px-3 py-1 text-sm rounded-lg ${tab === 'skill' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
          >
            {t('nav.skills')}
          </button>
          <button
            onClick={() => { setTab('mcp'); setItems([]); setResult(null); }}
            className={`px-3 py-1 text-sm rounded-lg ${tab === 'mcp' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
          >
            {t('nav.mcps')}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{t('project.reverseScan.hint')}</p>

      <div className="flex items-center gap-2">
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {scanning ? t('project.reverseScan.scanning') : t('project.reverseScan.scan')}
        </button>
        <button
          onClick={runImport}
          disabled={importing || toImportCount === 0}
          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          {importing ? t('project.reverseScan.importing') : t('project.reverseScan.import', { count: toImportCount })}
        </button>
      </div>

      {result && <div className="text-sm text-gray-600 dark:text-gray-300">{result}</div>}

      {items.length > 0 && (
        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <li key={`${item.name}-${item.agentName}`} className="flex items-center justify-between px-3 py-2 text-sm rounded bg-gray-50 dark:bg-gray-700/50">
              <div className="min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.agentName}{item.description ? ` — ${item.description}` : ''}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${classificationColor[item.classification]}`}>
                {item.classification}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
