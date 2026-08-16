import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../lib/ipc.js';
import { useMcpStore, type McpServer } from '../stores/mcpStore.js';

interface McpToolInfo {
  id: string;
  name: string;
  description: string | null;
  inputSchema: string | null;
}

interface McpPromptInfo {
  id: string;
  name: string;
  description: string | null;
}

function generateDefaultFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    const type = prop.type as string | undefined;
    switch (type) {
      case 'string': result[key] = ''; break;
      case 'number': case 'integer': result[key] = 0; break;
      case 'boolean': result[key] = false; break;
      case 'object': result[key] = {}; break;
      case 'array': result[key] = []; break;
      default: result[key] = null;
    }
  }
  return result;
}

export default function McpDebugPanel({ mcp, onClose, onTestComplete }: { mcp: McpServer; onClose: () => void; onTestComplete: () => void }) {
  const { t } = useTranslation();
  const { testMcp, testingMcpIds } = useMcpStore();
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [prompts, setPrompts] = useState<McpPromptInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<McpToolInfo | null>(null);
  const [paramJson, setParamJson] = useState('');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [retesting, setRetesting] = useState(false);

  const isTesting = testingMcpIds.has(mcp.id);

  useEffect(() => {
    api.getMcpTools(mcp.id).then(setTools).catch(() => {});
    api.getMcpPrompts(mcp.id).then(setPrompts).catch(() => {});
  }, [mcp.id]);

  const handleSelectTool = (tool: McpToolInfo) => {
    setSelectedTool(tool);
    setCallResult(null);
    setCallError(null);
    try {
      const schema = tool.inputSchema ? JSON.parse(tool.inputSchema) : {};
      const defaults = generateDefaultFromSchema(schema);
      setParamJson(JSON.stringify(defaults, null, 2));
    } catch {
      setParamJson('{}');
    }
  };

  const handleCallTool = async () => {
    if (!selectedTool) return;
    setCalling(true);
    setCallResult(null);
    setCallError(null);
    try {
      const args = JSON.parse(paramJson);
      const result = await api.callMcpTool(mcp.id, selectedTool.name, args);
      setCallResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setCallError(err instanceof Error ? err.message : String(err));
    } finally {
      setCalling(false);
    }
  };

  const handleRetest = async () => {
    setRetesting(true);
    try {
      await testMcp(mcp.id);
      api.getMcpTools(mcp.id).then(setTools).catch(() => {});
      api.getMcpPrompts(mcp.id).then(setPrompts).catch(() => {});
      onTestComplete();
    } finally {
      setRetesting(false);
    }
  };

  const statusLabel: Record<string, string> = {
    untested: t('mcp.statusLabels.untested'),
    passed: t('mcp.statusLabels.passed'),
    failed: t('mcp.statusLabels.failed'),
    config_changed: t('mcp.statusLabels.config_changed'),
  };

  const statusColor: Record<string, string> = {
    untested: 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300',
    passed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    config_changed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  };

  const canCallTools = mcp.testStatus === 'passed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[900px] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('mcp.debugPanel.title')} - {mcp.name}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded ${statusColor[mcp.testStatus] ?? statusColor.untested}`}>
            {statusLabel[mcp.testStatus] ?? statusLabel.untested}
          </span>
          <button
            onClick={handleRetest}
            disabled={retesting || isTesting}
            className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {(retesting || isTesting) ? t('mcp.testing') : t('mcp.debugPanel.retest')}
          </button>
          {mcp.testStatus === 'failed' && mcp.testError && (
            <span className="text-xs text-red-500 dark:text-red-400 break-all">{mcp.testError}</span>
          )}
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-48 flex flex-col overflow-auto border-r dark:border-gray-700 pr-3">
            <h4 className="text-sm font-semibold mb-2">{t('mcp.tools')} ({tools.length})</h4>
            {tools.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('mcp.noTools')}</p>
            ) : (
              <div className="space-y-1">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool)}
                    className={`w-full text-left text-xs p-2 rounded truncate ${selectedTool?.id === tool.id ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-100'}`}
                    title={tool.description ?? tool.name}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            )}

            <h4 className="text-sm font-semibold mb-2 mt-4">{t('mcp.prompts')} ({prompts.length})</h4>
            {prompts.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('mcp.noPrompts')}</p>
            ) : (
              <div className="space-y-1">
                {prompts.map((p) => (
                  <div key={p.id} className="text-xs p-2 text-gray-600 dark:text-gray-300 truncate" title={p.description ?? p.name}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-auto">
            {!canCallTools ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">{t('mcp.debugPanel.cannotCall')}</p>
                  {mcp.testStatus === 'failed' && mcp.testError && (
                    <div className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded max-w-md break-all">
                      {mcp.testError}
                    </div>
                  )}
                </div>
              </div>
            ) : !selectedTool ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                {t('mcp.debugPanel.selectTool')}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{selectedTool.name}</h4>
                  {selectedTool.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedTool.description}</p>
                  )}
                </div>

                {selectedTool.inputSchema && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('mcp.debugPanel.inputSchema')}</span>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(JSON.parse(selectedTool.inputSchema), null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('mcp.debugPanel.parameters')}</label>
                  <textarea
                    value={paramJson}
                    onChange={(e) => setParamJson(e.target.value)}
                    className="w-full h-32 mt-1 text-xs font-mono p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  onClick={handleCallTool}
                  disabled={calling}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {calling ? t('mcp.debugPanel.calling') : t('mcp.debugPanel.execute')}
                </button>

                {callError && (
                  <div>
                    <span className="text-xs text-red-500 dark:text-red-400 font-medium">{t('mcp.debugPanel.error')}</span>
                    <pre className="text-xs bg-red-50 dark:bg-red-900/30 p-2 rounded mt-1 text-red-700 dark:text-red-300 overflow-auto max-h-40 break-all whitespace-pre-wrap">
                      {callError}
                    </pre>
                  </div>
                )}

                {callResult && (
                  <div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('mcp.debugPanel.result')}</span>
                    <pre className="text-xs bg-green-50 dark:bg-green-900/30 p-2 rounded mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                      {callResult}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
