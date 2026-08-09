import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import { api } from '../../lib/ipc.js';

export interface ApplyResource {
  id: string;
  name: string;
}

interface ApplyToAgentDialogProps {
  resourceType: 'skill' | 'mcp';
  resources: ApplyResource[];
  onClose: () => void;
}

interface ApplyResult {
  agentId: string;
  agentName: string;
  success: boolean;
  error: string | null;
}

type Step = 'selectAgents' | 'preview' | 'applying' | 'results';

export default function ApplyToAgentDialog({ resourceType, resources, onClose }: ApplyToAgentDialogProps) {
  const { t } = useTranslation();
  const { agents, templates, loading, error, fetchAgents, fetchTemplates } = useAgentStore();
  const [step, setStep] = useState<Step>('selectAgents');
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [appliedAgentIds, setAppliedAgentIds] = useState<Set<string>>(new Set());
  const [diffPreviews, setDiffPreviews] = useState<Map<string, string>>(new Map());
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAgents(), fetchTemplates()]);
      if (resources.length === 0) return;
      try {
        const fetchApplied = (id: string) =>
          resourceType === 'skill'
            ? api.getAppliedAgentsForSkill(id)
            : api.getAppliedAgentsForMcp(id);

        const allApplied = await Promise.all(resources.map((r) => fetchApplied(r.id)));
        const appliedSets = allApplied.map(
          (result: Array<{ agentId: string }>) => new Set(result.map((a) => a.agentId)),
        );

        const intersection = new Set<string>();
        for (const agentId of appliedSets[0]) {
          if (appliedSets.every((s) => s.has(agentId))) {
            intersection.add(agentId);
          }
        }

        setAppliedAgentIds(intersection);
        setSelectedAgentIds(new Set());
      } catch {
        // ignore
      }
    };
    init();
  }, [fetchAgents, fetchTemplates, resources, resourceType]);

  const toggleAgent = (id: string) => {
    if (appliedAgentIds.has(id)) return;
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const nonApplied = compatibleAgents.filter((a) => !appliedAgentIds.has(a.id));
    const allNonAppliedSelected = nonApplied.every((a) => selectedAgentIds.has(a.id));
    if (allNonAppliedSelected) {
      setSelectedAgentIds(new Set(appliedAgentIds));
    } else {
      setSelectedAgentIds(new Set(compatibleAgents.map((a) => a.id)));
    }
  };

  const loadDiffPreview = async () => {
    if (resourceType !== 'mcp' || selectedAgentIds.size === 0 || resources.length === 0) return;
    const previews = new Map<string, string>();
    for (const agentId of selectedAgentIds) {
      try {
        const preview = await api.previewMcpApply(resources[0].id, agentId);
        previews.set(agentId, preview.diff);
      } catch {
        // skip agents that don't support preview
      }
    }
    setDiffPreviews(previews);
  };

  const goToPreview = () => {
    setStep('preview');
    if (resourceType === 'mcp') {
      loadDiffPreview();
    }
  };

  const handleApply = async () => {
    setStep('applying');
    setProgress(0);
    const agentList = compatibleAgents.filter((a) => selectedAgentIds.has(a.id));
    const applyResults: ApplyResult[] = [];
    const totalSteps = agentList.length;

    for (let i = 0; i < agentList.length; i++) {
      const agent = agentList[i];
      let agentSuccess = true;
      let agentError: string | null = null;

      for (const resource of resources) {
        try {
          if (resourceType === 'skill') {
            await api.applySkill(resource.id, agent.id);
          } else {
            await api.applyMcp(resource.id, agent.id);
          }
        } catch (err) {
          agentSuccess = false;
          agentError = `${resource.name}: ${String(err)}`;
        }
      }

      applyResults.push({ agentId: agent.id, agentName: agent.name, success: agentSuccess, error: agentError });
      setProgress(((i + 1) / totalSteps) * 100);
    }

    setResults(applyResults);
    setStep('results');
  };

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const resourceLabel = resources.length === 1
    ? resources[0].name
    : `${resources.length} ${t('skill.title')}`;

  const compatibleAgents = agents.filter((a) => {
    const template = templates.find((t) => t.id === a.templateId || t.configDirName === a.configDirName);
    const mcpFile = a.mcpFile ?? template?.mcpFile ?? null;
    const mcpField = a.mcpField ?? template?.mcpField ?? null;
    const skillDir = a.skillDir ?? template?.skillDir ?? null;
    if (resourceType === 'mcp') {
      if (mcpFile && mcpField) return true;
      if (!template && !a.builtin) return true;
      return false;
    }
    if (skillDir) return true;
    if (!template && !a.builtin) return true;
    return false;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('apply.title')}: {resourceLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['selectAgents', 'preview', 'applying', 'results'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${
                step === s ? 'bg-blue-500' :
                (['selectAgents', 'preview', 'applying', 'results'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 'selectAgents' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{t('apply.selectAgents')}</h4>
                <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-800">
                  {(() => {
                    const nonApplied = compatibleAgents.filter((a) => !appliedAgentIds.has(a.id));
                    return nonApplied.every((a) => selectedAgentIds.has(a.id))
                      ? t('common.deselectAll')
                      : t('common.selectAll');
                  })()}
                </button>
              </div>
              {loading ? (
                <p className="text-gray-500 text-sm">{t('common.loading')}</p>
              ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
              ) : compatibleAgents.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {resourceType === 'mcp'
                    ? 'No agents with MCP support found'
                    : 'No agents with skill support found'}
                </p>
              ) : (
                <div className="space-y-2">
                  {compatibleAgents.map((agent) => {
                    const isApplied = appliedAgentIds.has(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                          isApplied ? 'border-green-300 bg-green-50 cursor-not-allowed' :
                          selectedAgentIds.has(agent.id) ? 'border-blue-300 bg-blue-50 cursor-pointer hover:bg-blue-100' : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.has(agent.id)}
                          onChange={() => toggleAgent(agent.id)}
                          disabled={isApplied}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{agent.configDirName}</div>
                        </div>
                        {isApplied ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{t('apply.alreadyApplied')}</span>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded ${agent.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {agent.enabled ? t('agent.status.active') : t('agent.status.inactive')}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h4 className="font-medium mb-3">{t('apply.diffPreview')}</h4>
              {resourceType === 'mcp' && diffPreviews.size > 0 ? (
                <div className="space-y-4">
                  {compatibleAgents.filter((a) => selectedAgentIds.has(a.id)).map((a) => {
                    const diff = diffPreviews.get(a.id);
                    if (!diff) return null;
                    return (
                      <div key={a.id}>
                        <h5 className="text-sm font-medium mb-1">{a.name}</h5>
                        <pre className="bg-gray-50 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap">
                          {diff}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {resourceType === 'skill'
                      ? `Will create symlink for "${resourceLabel}" in ${selectedAgentIds.size} agent(s)`
                      : `Will apply "${resourceLabel}" to ${selectedAgentIds.size} agent(s)`}
                  </p>
                  {resources.length > 1 && (
                    <ul className="text-sm text-gray-500 mb-2">
                      {resources.map((r) => (
                        <li key={r.id} className="py-0.5">- {r.name}</li>
                      ))}
                    </ul>
                  )}
                  <ul className="text-sm text-gray-500">
                    {compatibleAgents.filter((a) => selectedAgentIds.has(a.id)).map((a) => (
                      <li key={a.id} className="py-1">- {a.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'applying' && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-4">{t('apply.applying')}</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {step === 'results' && (
            <div>
              <h4 className="font-medium mb-3">{t('apply.resultSummary')}</h4>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{succeeded}</div>
                  <div className="text-xs text-green-700">{t('apply.succeeded')}</div>
                </div>
                {failed > 0 && (
                  <div className="flex-1 p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{failed}</div>
                    <div className="text-xs text-red-700">{t('apply.failed')}</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.agentId} className="flex items-center gap-2 p-2 border rounded text-sm">
                    <span className={r.success ? 'text-green-600' : 'text-red-600'}>
                      {r.success ? '✓' : '✗'}
                    </span>
                    <span className="font-medium">{r.agentName}</span>
                    {r.error && <span className="text-xs text-red-500 ml-auto truncate max-w-[200px]">{r.error}</span>}
                  </div>
                ))}
              </div>
              {failed > 0 && (
                <p className="text-xs text-gray-500 mt-3">{t('apply.skipFailed')}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          {step === 'selectAgents' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
              <button
                onClick={goToPreview}
                disabled={selectedAgentIds.size === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('selectAgents')} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.back')}</button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t('apply.confirmApply')}
              </button>
            </>
          )}
          {step === 'results' && (
            <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ml-auto">
              {t('common.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
