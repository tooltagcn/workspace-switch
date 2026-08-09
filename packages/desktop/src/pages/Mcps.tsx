import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useMcpStore, type McpServer } from '../stores/mcpStore.js';
import { api } from '../lib/ipc.js';
import ApplyToAgentDialog from './components/ApplyToAgentDialog.js';
import type { ApplyResource } from './components/ApplyToAgentDialog.js';
import UnapplyFromAgentDialog from './components/UnapplyFromAgentDialog.js';
import BulkActionBar from '../components/BulkActionBar.js';
import McpDebugPanel from '../components/McpDebugPanel.js';

function McpDetail({ mcp, onClose, onApply, onDebug }: { mcp: McpServer; onClose: () => void; onApply: () => void; onDebug: () => void }) {
  const { t } = useTranslation();
  const { testMcp, testingMcpIds } = useMcpStore();
  const [showEnv, setShowEnv] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [tools, setTools] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
  const isTesting = testingMcpIds.has(mcp.id);

  useEffect(() => {
    if (mcp.testStatus === 'passed') {
      api.getMcpTools(mcp.id).then(setTools).catch(() => {});
      api.getMcpPrompts(mcp.id).then(setPrompts).catch(() => {});
    }
  }, [mcp.id, mcp.testStatus]);

  const statusColor: Record<string, string> = {
    untested: 'bg-gray-100 text-gray-600',
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    config_changed: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-96 max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{mcp.name}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-500">{t('mcp.testStatus')}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColor[mcp.testStatus] ?? statusColor.untested}`}>
              {t(`mcp.statusLabels.${mcp.testStatus}` as any)}
            </span>
            <button
              onClick={() => testMcp(mcp.id)}
              disabled={isTesting}
              className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isTesting ? t('mcp.testing') : t('mcp.test')}
            </button>
          </div>
          {mcp.testStatus === 'failed' && mcp.testError && (
            <p className="text-xs text-red-500 mt-1 break-all">{mcp.testError}</p>
          )}
          {mcp.testedAt && (
            <p className="text-xs text-gray-400 mt-1">{new Date(mcp.testedAt).toLocaleString()}</p>
          )}
        </div>
        <div>
          <span className="text-sm text-gray-500">{t('mcp.transport')}</span>
          <p className="text-sm mt-1">
            {mcp.transport ? t(`mcp.transportTypes.${mcp.transport}` as any) : '-'}
          </p>
        </div>
        {mcp.command && (
          <div>
            <span className="text-sm text-gray-500">{t('mcp.command')}</span>
            <p className="text-sm font-mono mt-1">{mcp.command} {mcp.args.join(' ')}</p>
          </div>
        )}
        {mcp.url && (
          <div>
            <span className="text-sm text-gray-500">{t('mcp.url')}</span>
            <p className="text-sm font-mono mt-1">{mcp.url}</p>
          </div>
        )}
        <div>
          <span className="text-sm text-gray-500">{t('mcp.description')}</span>
          <p className="text-sm mt-1">{mcp.description ?? '-'}</p>
        </div>
        {Object.keys(mcp.env).length > 0 && (
          <div>
            <button
              onClick={() => setShowEnv(!showEnv)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('mcp.envVars')} ({Object.keys(mcp.env).length}) {showEnv ? '▾' : '▸'}
            </button>
            {showEnv && (
              <div className="mt-2 space-y-1">
                {Object.entries(mcp.env).map(([key, _val]) => (
                  <div key={key} className="flex justify-between text-xs font-mono">
                    <span className="text-gray-600">{key}</span>
                    <span className="text-gray-400">{t('mcp.masked')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {mcp.testStatus === 'passed' && (
          <>
            <div>
              <button
                onClick={() => setShowTools(!showTools)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t('mcp.tools')} ({tools.length}) {showTools ? '▾' : '▸'}
              </button>
              {showTools && (
                <div className="mt-2 space-y-1">
                  {tools.length === 0 ? (
                    <p className="text-xs text-gray-400">{t('mcp.noTools')}</p>
                  ) : (
                    tools.map((tool) => (
                      <div key={tool.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-mono font-medium text-gray-700">{tool.name}</div>
                        {tool.description && <div className="text-gray-500 mt-0.5">{tool.description}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t('mcp.prompts')} ({prompts.length}) {showPrompts ? '▾' : '▸'}
              </button>
              {showPrompts && (
                <div className="mt-2 space-y-1">
                  {prompts.length === 0 ? (
                    <p className="text-xs text-gray-400">{t('mcp.noPrompts')}</p>
                  ) : (
                    prompts.map((p) => (
                      <div key={p.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-mono font-medium text-gray-700">{p.name}</div>
                        {p.description && <div className="text-gray-500 mt-0.5">{p.description}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <div>
          <span className="text-sm text-gray-500">{t('common.tags')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {mcp.tags.length === 0 ? (
              <span className="text-sm text-gray-400">{t('common.none')}</span>
            ) : (
              mcp.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{tag}</span>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
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
    </div>
  );
}

function McpAddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { createMcp } = useMcpStore();
  const [form, setForm] = useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'sse' | 'http',
    command: '',
    url: '',
    args: '',
    description: '',
  });

  const handleSubmit = async () => {
    if (!form.name) return;
    try {
      await createMcp({
        name: form.name,
        transport: form.transport,
        command: form.transport === 'stdio' ? form.command : null,
        url: form.transport !== 'stdio' ? form.url : null,
        args: form.args ? form.args.split(' ').filter(Boolean) : [],
        description: form.description || null,
      });
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('mcp.addMcp')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.transport')}</label>
            <select
              value={form.transport}
              onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="stdio">stdio</option>
              <option value="sse">sse</option>
              <option value="http">http</option>
            </select>
          </div>
          {form.transport === 'stdio' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.command')}</label>
                <input
                  type="text"
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  placeholder="npx, node, python..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.args')}</label>
                <input
                  type="text"
                  value={form.args}
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                  placeholder="arg1 arg2 arg3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.url')}</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="http://localhost:3000"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
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
  const { updateMcp } = useMcpStore();
  const [form, setForm] = useState({
    name: mcp.name,
    transport: mcp.transport ?? 'stdio',
    command: mcp.command ?? '',
    url: mcp.url ?? '',
    args: mcp.args.join(' '),
    description: mcp.description ?? '',
  });

  const handleSubmit = async () => {
    try {
      await updateMcp(mcp.id, {
        name: form.name,
        transport: form.transport,
        command: form.transport === 'stdio' ? form.command : null,
        url: form.transport !== 'stdio' ? form.url : null,
        args: form.args ? form.args.split(' ').filter(Boolean) : [],
        description: form.description || null,
      });
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('mcp.editMcp')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.transport')}</label>
            <select
              value={form.transport}
              onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="stdio">stdio</option>
              <option value="sse">sse</option>
              <option value="http">http</option>
            </select>
          </div>
          {form.transport === 'stdio' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.command')}</label>
                <input
                  type="text"
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.args')}</label>
                <input
                  type="text"
                  value={form.args}
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('mcp.url')}</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
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
  const [mode, setMode] = useState<'agents' | 'home' | 'full'>('agents');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await api.scanMcps(mode);
      setResults(result.mcps ?? []);
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.reverseScan.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded ${step >= s ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              {(['agents', 'home', 'full'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${mode === m ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium">{t(`skill.reverseScan.mode${m.charAt(0).toUpperCase() + m.slice(1)}` as any)}</div>
                  <div className="text-sm text-gray-500">{t(`skill.reverseScan.mode${m.charAt(0).toUpperCase() + m.slice(1)}Desc` as any)}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              <p className="text-sm text-gray-600">Ready to scan for MCP server configurations.</p>
              <button
                onClick={runScan}
                disabled={scanning}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {scanning ? t('mcp.reverseScan.scanning') : t('common.next')}
              </button>
              {!scanning && results.length > 0 && (
                <button onClick={() => setStep(3)} className="ml-3 px-4 py-2 text-blue-600">
                  {t('common.next')}
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              {results.length === 0 ? (
                <p className="text-gray-500">{t('mcp.reverseScan.noResults')}</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r: any, i: number) => {
                    const classColor = r.classification === 'new' ? 'bg-green-100 text-green-700' : r.classification === 'conflict' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
                    const classLabel = r.classification === 'new' ? t('skill.reverseScan.newFound') : r.classification === 'conflict' ? t('skill.reverseScan.conflict') : t('skill.reverseScan.syncedHidden');
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(i))}
                          onChange={() => toggleSelect(String(i))}
                          disabled={r.classification === 'synced'}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.agentName} - {r.schema?.transport ?? 'stdio'}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${classColor}`}>{classLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`mcp.reverseScan.step${step}`)}</p>
              {importDone ? (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-medium">{t('mcp.reverseScan.importComplete')}</div>
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

        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          {step < 4 && results.length > 0 && (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.doctor.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#x2715;</button>
        </div>

        {checking ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : fixResult ? (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="text-center py-6">
              <div className="text-green-600 text-lg font-medium">{t('mcp.doctor.fixComplete')}</div>
            </div>
            {fixResult.synced.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">{t('mcp.doctor.synced', { count: fixResult.synced.length })}</p>
                <p className="text-xs text-green-600 mt-1">{fixResult.synced.join(', ')}</p>
              </div>
            )}
            {fixResult.deleted.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">{t('mcp.doctor.deleted', { count: fixResult.deleted.length })}</p>
                <p className="text-xs text-red-600 mt-1">{fixResult.deleted.join(', ')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            <p className="text-sm text-gray-500">
              {t('mcp.doctor.summary', { dirCount: result.directoryCount, dbCount: result.databaseCount })}
            </p>

            {result.consistent ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-medium">{t('mcp.doctor.consistent')}</div>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm">{t('common.name')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.status')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-sm font-medium">{item.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.location === 'directory' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.location === 'directory' ? t('mcp.doctor.locationDir') : t('mcp.doctor.locationDb')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.action === 'sync' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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

export default function Mcps() {
  const { t } = useTranslation();
  const { mcps, loading, fetchMcps, deleteMcp, testMcp, testingMcpIds, batchTesting, batchProgress, startBatchTest, syncMcp } = useMcpStore();
  const [selectedMcp, setSelectedMcp] = useState<McpServer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null);
  const [showReverseScan, setShowReverseScan] = useState(false);
  const [showDoctor, setShowDoctor] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [debugMcp, setDebugMcp] = useState<McpServer | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'tag' | 'apply' | 'unapply' | 'delete' | null>(null);
  const [bulkApplyResources, setBulkApplyResources] = useState<ApplyResource[] | null>(null);
  const [bulkUnapplyResources, setBulkUnapplyResources] = useState<ApplyResource[] | null>(null);

  const statusColor: Record<string, string> = {
    untested: 'bg-gray-100 text-gray-600',
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    config_changed: 'bg-yellow-100 text-yellow-700',
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
    if (bulkSelected.size === mcps.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(mcps.map((m) => m.id)));
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
    }
    await fetchMcps();
    setBulkSelected(new Set());
    setShowBulkConfirm(false);
    setBulkAction(null);
  };

  useEffect(() => {
    fetchMcps();
  }, [fetchMcps]);

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('mcp.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => startBatchTest()}
            disabled={batchTesting || mcps.length === 0}
            className="px-4 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {batchTesting ? t('mcp.batchTesting') : t('mcp.batchTest')}
          </button>
          <button
            onClick={() => setShowDoctor(true)}
            className="px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50"
          >
            {t('mcp.doctor.button')}
          </button>
          <button
            onClick={() => setShowReverseScan(true)}
            className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            {t('dashboard.reverseScan')}
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
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">
              {t('mcp.batchTesting')} - {batchProgress.currentMcpName}
            </span>
            <span className="text-sm text-blue-600">
              {batchProgress.completed}/{batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${batchProgress.total > 0 ? (batchProgress.completed / batchProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1 text-xs text-blue-600">
            <span>{t('mcp.batchPassed')}: {batchProgress.passed}</span>
            <span>{t('mcp.batchFailed')}: {batchProgress.failed}</span>
          </div>
        </div>
      )}
      {!batchTesting && batchProgress && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-green-700">
            {t('mcp.batchComplete')}
          </span>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">{t('mcp.batchPassed')}: {batchProgress.passed}</span>
            <span className="text-red-600">{t('mcp.batchFailed')}: {batchProgress.failed}</span>
            <span className="text-gray-600">{t('mcp.batchTest')}: {batchProgress.total}</span>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          {mcps.length === 0 ? (
            <p className="text-gray-600">{t('common.noData')}</p>
          ) : (
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === mcps.length && mcps.length > 0}
                      onChange={toggleBulkAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-left">{t('mcp.name')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.transport')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.testStatus')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.appliedTo')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.command')}</th>
                  <th className="px-4 py-2 text-left">{t('mcp.env')}</th>
                  <th className="px-4 py-2 text-left">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {mcps.map((mcp) => (
                  <tr
                    key={mcp.id}
                    className={`border-t cursor-pointer hover:bg-gray-50 ${selectedMcp?.id === mcp.id ? 'bg-blue-50' : ''}`}
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
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {mcp.transport ?? 'stdio'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColor[mcp.testStatus] ?? statusColor.untested}`}>
                        {t(`mcp.statusLabels.${mcp.testStatus}` as any)}
                      </span>
                      {mcp.testStatus === 'failed' && mcp.testError && (
                        <p className="text-xs text-red-500 mt-1 break-all max-w-xs truncate" title={mcp.testError}>{mcp.testError}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {mcp.applied ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">
                            {mcp.applied.agents.join(', ')}
                          </span>
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
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-600">
                      {mcp.command ?? mcp.url ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {Object.keys(mcp.env).length > 0 ? `${Object.keys(mcp.env).length} vars` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); testMcp(mcp.id); }}
                          disabled={testingMcpIds.has(mcp.id)}
                          className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {testingMcpIds.has(mcp.id) ? t('mcp.testing') : t('mcp.test')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDebugMcp(mcp); }}
                          className="text-sm text-purple-600 hover:text-purple-800"
                        >
                          {t('mcp.debug')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingMcp(mcp); }}
                          className="text-sm text-blue-600 hover:text-blue-800"
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
                          className="text-sm text-red-600 hover:text-red-800"
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
          onClose={() => setShowApplyDialog(false)}
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">{t('bulk.confirmAction')}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {bulkAction === 'delete'
                ? t('bulk.confirmDelete', { count: bulkSelected.size })
                : `${bulkAction} ${bulkSelected.size} items?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
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
