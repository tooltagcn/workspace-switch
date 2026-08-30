import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useMcpStore, type McpServer } from '../stores/mcpStore.js';
import { useAgentStore } from '../stores/agentStore.js';
import { api } from '../lib/ipc.js';
import ApplyToAgentDialog from './components/ApplyToAgentDialog.js';
import type { ApplyResource } from './components/ApplyToAgentDialog.js';
import UnapplyFromAgentDialog from './components/UnapplyFromAgentDialog.js';
import BulkActionBar from '../components/BulkActionBar.js';
import McpDebugPanel from '../components/McpDebugPanel.js';

function McpDetail({ mcp, onClose, onApply, onDebug }: { mcp: McpServer; onClose: () => void; onApply: () => void; onDebug: () => void }) {
  const { t } = useTranslation();
  const appliedAgents = mcp.applied?.agents ?? [];

  const statusColor: Record<string, string> = {
    untested: 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300',
    passed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    config_changed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-96 min-w-0 shrink-0 max-h-[80vh] flex flex-col sticky top-6 self-start">
      <div className="flex justify-between items-start gap-2 mb-4">
        <h3 className="text-lg font-semibold break-all">{mcp.name}</h3>
        <button onClick={onClose} className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
      </div>
      <div className="flex-1 overflow-auto space-y-3">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.testStatus')}</span>
          <div className="mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColor[mcp.testStatus] ?? statusColor.untested}`}>
              {t(`mcp.statusLabels.${mcp.testStatus}` as any)}
            </span>
          </div>
          {mcp.testStatus === 'failed' && mcp.testError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 break-all">{mcp.testError}</p>
          )}
          {mcp.testedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(mcp.testedAt).toLocaleString()}</p>
          )}
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.transport')}</span>
          <p className="text-sm mt-1">
            {mcp.transport ? t(`mcp.transportTypes.${mcp.transport}` as any) : '-'}
          </p>
        </div>
        {mcp.command && (
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.command')}</span>
            <p className="text-sm font-mono mt-1 break-all">{mcp.command} {mcp.args.join(' ')}</p>
          </div>
        )}
        {mcp.url && (
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.url')}</span>
            <p className="text-sm font-mono mt-1 break-all">{mcp.url}</p>
          </div>
        )}
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.description')}</span>
          <p className="text-sm mt-1 break-all">{mcp.description ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.appliedTo')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {appliedAgents.length === 0 ? (
              <span className="text-sm text-gray-400 dark:text-gray-500">{t('mcp.notApplied')}</span>
            ) : (
              appliedAgents.map((agentName) => (
                <span key={agentName} className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">{agentName}</span>
              ))
            )}
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.env')}</span>
          <p className="text-sm mt-1">{Object.keys(mcp.env).length > 0 ? `${Object.keys(mcp.env).length} vars` : '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.tags')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {mcp.tags.length === 0 ? (
              <span className="text-sm text-gray-400 dark:text-gray-500">{t('common.none')}</span>
            ) : (
              mcp.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{tag}</span>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t dark:border-gray-700">
        <button
          onClick={onDebug}
          className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
        >
          {t('mcp.debug')}
        </button>
        <button
          onClick={onApply}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
        >
          {t('skill.apply')}
        </button>
      </div>
    </div>
  );
}

function McpAddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { createMcp, mcps } = useMcpStore();
  const [form, setForm] = useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'sse' | 'http',
    command: '',
    url: '',
    args: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (patch.name !== undefined) setError(null);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    const trimmed = form.name.trim();
    if (mcps.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(t('mcp.errors.duplicateName', { name: trimmed }));
      return;
    }
    try {
      await createMcp({
        name: trimmed,
        transport: form.transport,
        command: form.transport === 'stdio' ? form.command : null,
        url: form.transport !== 'stdio' ? form.url : null,
        args: form.args ? form.args.split(' ').filter(Boolean) : [],
        description: form.description || null,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? t('mcp.errors.createFailed', { message: e.message })
          : t('mcp.errors.createFailed', { message: String(e) }),
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('mcp.addMcp')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{error}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.transport')}</label>
            <select
              value={form.transport}
              onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value as any }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="stdio">stdio</option>
              <option value="sse">sse</option>
              <option value="http">http</option>
            </select>
          </div>
          {form.transport === 'stdio' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.command')}</label>
                <input
                  type="text"
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  placeholder="npx, node, python..."
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.args')}</label>
                <input
                  type="text"
                  value={form.args}
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                  placeholder="arg1 arg2 arg3"
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.url')}</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="http://localhost:3000"
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={!form.name}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function McpEditDialog({ mcp, onClose }: { mcp: McpServer; onClose: () => void }) {
  const { t } = useTranslation();
  const { updateMcp, mcps } = useMcpStore();
  const [form, setForm] = useState({
    name: mcp.name,
    transport: mcp.transport ?? 'stdio',
    command: mcp.command ?? '',
    url: mcp.url ?? '',
    args: mcp.args.join(' '),
    description: mcp.description ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (patch.name !== undefined) setError(null);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    const trimmed = form.name.trim();
    if (
      trimmed.toLowerCase() !== mcp.name.toLowerCase() &&
      mcps.some((m) => m.id !== mcp.id && m.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(t('mcp.errors.duplicateName', { name: trimmed }));
      return;
    }
    try {
      await updateMcp(mcp.id, {
        name: trimmed,
        transport: form.transport,
        command: form.transport === 'stdio' ? form.command : null,
        url: form.transport !== 'stdio' ? form.url : null,
        args: form.args ? form.args.split(' ').filter(Boolean) : [],
        description: form.description || null,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? t('mcp.errors.updateFailed', { message: e.message })
          : t('mcp.errors.updateFailed', { message: String(e) }),
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('mcp.editMcp')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{error}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.transport')}</label>
            <select
              value={form.transport}
              onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value as any }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="stdio">stdio</option>
              <option value="sse">sse</option>
              <option value="http">http</option>
            </select>
          </div>
          {form.transport === 'stdio' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.command')}</label>
                <input
                  type="text"
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.args')}</label>
                <input
                  type="text"
                  value={form.args}
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('mcp.url')}</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={!form.name}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function McpReverseScanWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { fetchMcps } = useMcpStore();
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await api.scanMcps();
      setResults(result.mcps ?? []);
      if ((result.mcps ?? []).length > 0) {
        setStep(2);
      }
    } catch {
      // scan failed
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport = results.filter((_, i) => selectedIds.has(String(i)));
      await api.importScannedMcps(toImport);
      await fetchMcps();
      setImportDone(true);
    } catch {
      // import failed
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (idx: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.reverseScan.title')}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded ${step >= s ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Ready to scan enabled agent configurations.</p>
              <button
                onClick={runScan}
                disabled={scanning}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {scanning ? t('mcp.reverseScan.scanning') : t('common.next')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              {results.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">{t('mcp.reverseScan.noResults')}</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r: any, i: number) => {
                    const classColor = r.classification === 'new' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : r.classification === 'conflict' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300';
                    const classLabel = r.classification === 'new' ? t('skill.reverseScan.newFound') : r.classification === 'conflict' ? t('skill.reverseScan.conflict') : t('skill.reverseScan.syncedHidden');
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(i))}
                          onChange={() => toggleSelect(String(i))}
                          disabled={r.classification === 'synced'}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{r.agentName} - {r.schema?.transport ?? 'stdio'}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${classColor}`}>{classLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              {importDone ? (
                <div className="text-center py-8">
                  <div className="text-green-600 dark:text-green-400 text-lg font-medium">{t('mcp.reverseScan.importComplete')}</div>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-4">{selectedIds.size} items selected for import</p>
                  <button
                    onClick={handleImport}
                    disabled={importing || selectedIds.size === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {importing ? t('mcp.reverseScan.importing') : t('mcp.reverseScan.importSelected')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          {step === 2 && (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function McpDoctorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { fetchMcps } = useMcpStore();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  useEffect(() => {
    api.checkMcpConsistency().then((r) => {
      setResult(r);
      setChecking(false);
    });
  }, []);

  const handleFixAll = async () => {
    setFixing(true);
    try {
      const r = await api.fixMcpConsistency();
      setFixResult(r);
      await fetchMcps();
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.doctor.title')}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">&#x2715;</button>
        </div>

        {checking ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : fixResult ? (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="text-center py-6">
              <div className="text-green-600 dark:text-green-400 text-lg font-medium">{t('mcp.doctor.fixComplete')}</div>
            </div>
            {fixResult.synced.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">{t('mcp.doctor.synced', { count: fixResult.synced.length })}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">{fixResult.synced.join(', ')}</p>
              </div>
            )}
            {fixResult.deleted.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{t('mcp.doctor.deleted', { count: fixResult.deleted.length })}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fixResult.deleted.join(', ')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('mcp.doctor.summary', { dirCount: result.directoryCount, dbCount: result.databaseCount })}
            </p>

            {result.consistent ? (
              <div className="text-center py-8">
                <div className="text-green-600 dark:text-green-400 text-lg font-medium">{t('mcp.doctor.consistent')}</div>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm">{t('common.name')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.status')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item: any, i: number) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-3 py-2 text-sm font-medium">{item.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.location === 'directory' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300'
                          }`}>
                            {item.location === 'directory' ? t('mcp.doctor.locationDir') : t('mcp.doctor.locationDb')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.action === 'sync' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {item.action === 'sync' ? t('mcp.doctor.actionSync') : t('mcp.doctor.actionDelete')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={handleFixAll}
                  disabled={fixing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {fixing ? t('mcp.doctor.fixing') : t('mcp.doctor.fixAll')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function McpTagManager({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { mcps, fetchMcps, addTag, removeTag } = useMcpStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchTag = async () => {
    if (!newTag) return;
    for (const id of selectedIds) {
      await addTag(id, newTag);
    }
    await fetchMcps();
    setNewTag('');
    setSelectedIds(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.tagManager.title')}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <span className="text-sm">{t('mcp.tagManager.selectedMcps', { count: selectedIds.size })}</span>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t('mcp.tagManager.addTag')}
              className="flex-1 px-2 py-1 text-sm border dark:border-gray-700 rounded"
            />
            <button
              onClick={handleBatchTag}
              disabled={!newTag}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {t('mcp.tagManager.batchTag')}
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === mcps.length && mcps.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(mcps.map((m) => m.id)));
                      else setSelectedIds(new Set());
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left">{t('mcp.name')}</th>
                <th className="px-3 py-2 text-left">{t('mcp.tags')}</th>
              </tr>
            </thead>
            <tbody>
              {mcps.map((mcp) => (
                <tr key={mcp.id} className="border-t dark:border-gray-700">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(mcp.id)}
                      onChange={() => toggleSelect(mcp.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">{mcp.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {mcp.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {tag}
                          <button
                            onClick={() => removeTag(mcp.id, tag)}
                            className="hover:text-red-600"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Mcps() {
  const { t } = useTranslation();
  const { mcps, loading, fetchMcps, deleteMcp, testMcp, testingMcpIds, batchTesting, batchProgress, startBatchTest, syncMcp } = useMcpStore();
  const { agents, fetchAgents } = useAgentStore();
  const [selectedMcp, setSelectedMcp] = useState<McpServer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null);
  const [showReverseScan, setShowReverseScan] = useState(false);
  const [showDoctor, setShowDoctor] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [debugMcp, setDebugMcp] = useState<McpServer | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'tag' | 'apply' | 'unapply' | 'delete' | null>(null);
  const [bulkApplyResources, setBulkApplyResources] = useState<ApplyResource[] | null>(null);
  const [bulkUnapplyResources, setBulkUnapplyResources] = useState<ApplyResource[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const allTags = Array.from(new Set(mcps.flatMap((m) => m.tags))).sort((a, b) => a.localeCompare(b));

  const filteredMcps = mcps.filter((m) => {
    if (selectedTag && !m.tags.includes(selectedTag)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q)
      || (m.description ?? '').toLowerCase().includes(q)
      || m.tags.some((tag) => tag.toLowerCase().includes(q))
      || (m.command ?? '').toLowerCase().includes(q)
      || (m.applied?.agents ?? []).some((a) => a.toLowerCase().includes(q));
  });

  const statusColor: Record<string, string> = {
    untested: 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300',
    passed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    config_changed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  };

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBulkAll = () => {
    if (bulkSelected.size === filteredMcps.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filteredMcps.map((m) => m.id)));
    }
  };

  const handleBulkAction = (action: 'tag' | 'apply' | 'unapply' | 'delete') => {
    setBulkAction(action);
    const selected = mcps.filter((m) => bulkSelected.has(m.id));
    const mapped = selected.map((m) => ({ id: m.id, name: m.name }));
    if (action === 'apply') {
      setBulkApplyResources(mapped);
    } else if (action === 'unapply') {
      setBulkUnapplyResources(mapped);
    } else {
      setShowBulkConfirm(true);
    }
  };

  const confirmBulkAction = async () => {
    if (!bulkAction) return;
    if (bulkAction === 'delete') {
      for (const id of bulkSelected) {
        await deleteMcp(id);
      }
    } else if (bulkAction === 'tag') {
      const tag = prompt('Enter tag name:');
      if (tag) {
        for (const id of bulkSelected) {
          await api.addMcpTag(id, tag);
        }
      }
    }
    await fetchMcps();
    setBulkSelected(new Set());
    setShowBulkConfirm(false);
    setBulkAction(null);
  };

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    fetchMcps({ agentId: selectedAgentId || undefined });
  }, [fetchMcps, selectedAgentId]);

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('mcp.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => startBatchTest()}
            disabled={batchTesting || mcps.length === 0}
            className="px-4 py-2 border dark:border-gray-700 border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {batchTesting ? t('mcp.batchTesting') : t('mcp.batchTest')}
          </button>
          <button
            onClick={() => setShowDoctor(true)}
            className="px-4 py-2 border dark:border-gray-700 border-yellow-500 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-50"
          >
            {t('mcp.doctor.button')}
          </button>
          <button
            onClick={() => setShowReverseScan(true)}
            className="px-4 py-2 border dark:border-gray-700 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50"
          >
            {t('dashboard.reverseScan')}
          </button>
          <button
            onClick={() => setShowTagManager(true)}
            className="px-4 py-2 border dark:border-gray-700 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('mcp.tagManager.title')}
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('mcp.addMcp')}
          </button>
        </div>
      </div>

      {batchTesting && batchProgress && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('mcp.batchTesting')} - {batchProgress.currentMcpName}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {batchProgress.completed}/{batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${batchProgress.total > 0 ? (batchProgress.completed / batchProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1 text-xs text-blue-600 dark:text-blue-400">
            <span>{t('mcp.batchPassed')}: {batchProgress.passed}</span>
            <span>{t('mcp.batchFailed')}: {batchProgress.failed}</span>
          </div>
        </div>
      )}
      {!batchTesting && batchProgress && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {t('mcp.batchComplete')}
          </span>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400">{t('mcp.batchPassed')}: {batchProgress.passed}</span>
            <span className="text-red-600 dark:text-red-400">{t('mcp.batchFailed')}: {batchProgress.failed}</span>
            <span className="text-gray-600 dark:text-gray-300">{t('mcp.batchTest')}: {batchProgress.total}</span>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="w-full max-w-sm px-3 py-1.5 text-sm border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-1.5 text-sm border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">{t('common.allTags')}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="px-3 py-1.5 text-sm border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">{t('common.allAgents')}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 overflow-x-auto">
          {filteredMcps.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">{t('common.noData')}</p>
          ) : (
            <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === filteredMcps.length && filteredMcps.length > 0}
                      onChange={toggleBulkAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-left">{t('mcp.name')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.transport')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.testStatus')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.appliedTo')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.tags')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.command')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.env')}</th>
                  <th className="px-4 py-2 text-left w-56">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMcps.map((mcp) => (
                  <tr
                    key={mcp.id}
                    className={`border-t dark:border-gray-700 cursor-pointer hover:bg-gray-50 ${selectedMcp?.id === mcp.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    onClick={() => setSelectedMcp(mcp)}
                  >
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(mcp.id)}
                        onChange={() => toggleBulk(mcp.id)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{mcp.name}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded">
                        {mcp.transport ?? 'stdio'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColor[mcp.testStatus] ?? statusColor.untested}`}>
                        {t(`mcp.statusLabels.${mcp.testStatus}` as any)}
                      </span>
                      {mcp.testStatus === 'failed' && mcp.testError && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1 break-all max-w-xs truncate" title={mcp.testError}>{mcp.testError}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {mcp.applied && mcp.applied.agents.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {mcp.applied.agents.slice(0, 3).map((agentName) => (
                            <span key={agentName} className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                              {agentName}
                            </span>
                          ))}
                          {mcp.applied.agents.length > 3 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">+{mcp.applied.agents.length - 3}</span>
                          )}
                          {mcp.applied.outOfSync && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                syncMcp(mcp.id);
                              }}
                              className="text-xs px-2 py-0.5 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              title={t('mcp.syncTooltip')}
                            >
                              {t('mcp.sync')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {mcp.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{tag}</span>
                        ))}
                        {mcp.tags.length > 3 && <span className="text-xs text-gray-400 dark:text-gray-500">+{mcp.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={mcp.command ?? mcp.url ?? ''}>
                      {mcp.command ?? mcp.url ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {Object.keys(mcp.env).length > 0 ? `${Object.keys(mcp.env).length} vars` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); testMcp(mcp.id); }}
                          disabled={testingMcpIds.has(mcp.id)}
                          className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          {testingMcpIds.has(mcp.id) ? t('mcp.testing') : t('mcp.test')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDebugMcp(mcp); }}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 whitespace-nowrap"
                        >
                          {t('mcp.debug')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingMcp(mcp); }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 whitespace-nowrap"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(t('mcp.deleteConfirm'))) {
                              await deleteMcp(mcp.id);
                              if (selectedMcp?.id === mcp.id) setSelectedMcp(null);
                            }
                          }}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 whitespace-nowrap"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedMcp && (
          <McpDetail
            mcp={selectedMcp}
            onClose={() => setSelectedMcp(null)}
            onApply={() => setShowApplyDialog(true)}
            onDebug={() => setDebugMcp(selectedMcp)}
          />
        )}
      </div>

      {showAddDialog && <McpAddDialog onClose={() => setShowAddDialog(false)} />}
      {editingMcp && <McpEditDialog mcp={editingMcp} onClose={() => setEditingMcp(null)} />}
      {showTagManager && <McpTagManager onClose={() => setShowTagManager(false)} />}
      {showReverseScan && <McpReverseScanWizard onClose={() => setShowReverseScan(false)} />}
      {showDoctor && <McpDoctorDialog onClose={() => setShowDoctor(false)} />}
      {debugMcp && (
        <McpDebugPanel
          mcp={debugMcp}
          onClose={() => setDebugMcp(null)}
          onTestComplete={() => fetchMcps()}
        />
      )}
      {showApplyDialog && selectedMcp && (
        <ApplyToAgentDialog
          resourceType="mcp"
          resources={[{ id: selectedMcp.id, name: selectedMcp.name }]}
          onClose={() => {
            setShowApplyDialog(false);
            fetchMcps();
          }}
        />
      )}

      {bulkApplyResources && (
        <ApplyToAgentDialog
          resourceType="mcp"
          resources={bulkApplyResources}
          onClose={() => {
            setBulkApplyResources(null);
            setBulkAction(null);
            setBulkSelected(new Set());
            fetchMcps();
          }}
        />
      )}

      {bulkUnapplyResources && (
        <UnapplyFromAgentDialog
          resourceType="mcp"
          resources={bulkUnapplyResources}
          onClose={() => {
            setBulkUnapplyResources(null);
            setBulkAction(null);
            setBulkSelected(new Set());
            fetchMcps();
          }}
        />
      )}

      <BulkActionBar
        selectedCount={bulkSelected.size}
        onTag={() => handleBulkAction('tag')}
        onApply={() => handleBulkAction('apply')}
        onUnapply={() => handleBulkAction('unapply')}
        onDelete={() => handleBulkAction('delete')}
      />

      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">{t('bulk.confirmAction')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              {bulkAction === 'delete'
                ? t('bulk.confirmDelete', { count: bulkSelected.size })
                : `${bulkAction} ${bulkSelected.size} items?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmBulkAction}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
