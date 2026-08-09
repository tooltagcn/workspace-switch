import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import { api } from '../../lib/ipc.js';
import type { ApplyResource } from './ApplyToAgentDialog.js';

interface UnapplyFromAgentDialogProps {
  resourceType: 'skill' | 'mcp';
  resources: ApplyResource[];
  onClose: () => void;
}

interface UnapplyResult {
  agentId: string;
  agentName: string;
  success: boolean;
  error: string | null;
}

type Step = 'selectAgents' | 'confirm' | 'applying' | 'results';

export default function UnapplyFromAgentDialog({ resourceType, resources, onClose }: UnapplyFromAgentDialogProps) {
  const { t } = useTranslation();
  const { agents, loading, error, fetchAgents } = useAgentStore();
  const [step, setStep] = useState<Step>('selectAgents');
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [appliedAgentsMap, setAppliedAgentsMap] = useState<Map<string, string[]>>(new Map());
  const [candidateAgents, setCandidateAgents] = useState<string[]>([]);
  const [results, setResults] = useState<UnapplyResult[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      await fetchAgents();
      if (resources.length === 0) return;
      try {
        const fetchApplied = (id: string) =>
          resourceType === 'skill'
            ? api.getAppliedAgentsForSkill(id)
            : api.getAppliedAgentsForMcp(id);

        const allApplied = await Promise.all(
          resources.map((r) => fetchApplied(r.id)),
        );

        const agentSkillMap = new Map<string, string[]>();
        const candidateSet = new Set<string>();

        for (let i = 0; i < resources.length; i++) {
          const applied = allApplied[i] as Array<{ agentId: string; agentName: string }>;
          for (const a of applied) {
            candidateSet.add(a.agentId);
            const existing = agentSkillMap.get(a.agentId) ?? [];
            existing.push(resources[i].name);
            agentSkillMap.set(a.agentId, existing);
          }
        }

        setAppliedAgentsMap(agentSkillMap);
        setCandidateAgents(Array.from(candidateSet));
      } catch {
        // ignore
      }
    };
    init();
  }, [fetchAgents, resources]);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedAgentIds.size === candidateAgents.length) {
      setSelectedAgentIds(new Set());
    } else {
      setSelectedAgentIds(new Set(candidateAgents));
    }
  };

  const handleUnapply = async () => {
    setStep('applying');
    setProgress(0);
    const agentList = agents.filter((a) => selectedAgentIds.has(a.id));
    const unapplyResults: UnapplyResult[] = [];
    const totalSteps = agentList.length;

    for (let i = 0; i < agentList.length; i++) {
      const agent = agentList[i];
      let agentSuccess = true;
      let agentError: string | null = null;

      for (const resource of resources) {
        try {
          if (resourceType === 'skill') {
            await api.unapplySkill(resource.id, agent.id);
          } else {
            await api.unapplyMcp(resource.id, agent.id);
          }
        } catch (err) {
          agentSuccess = false;
          agentError = `${resource.name}: ${String(err)}`;
        }
      }

      unapplyResults.push({ agentId: agent.id, agentName: agent.name, success: agentSuccess, error: agentError });
      if (totalSteps > 0) setProgress(((i + 1) / totalSteps) * 100);
    }

    setResults(unapplyResults);
    setStep('results');
  };

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const resourceLabel = resources.length === 1
    ? resources[0].name
    : `${resources.length} ${t('skill.title')}`;

  const visibleAgents = agents.filter((a) => candidateAgents.includes(a.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('unapply.title')}: {resourceLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['selectAgents', 'confirm', 'applying', 'results'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${
                step === s ? 'bg-orange-500' :
                (['selectAgents', 'confirm', 'applying', 'results'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 'selectAgents' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{t('unapply.selectAgents')}</h4>
                {visibleAgents.length > 0 && (
                  <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-800">
                    {selectedAgentIds.size === candidateAgents.length ? t('common.deselectAll') : t('common.selectAll')}
                  </button>
                )}
              </div>
              {loading ? (
                <p className="text-gray-500 text-sm">{t('common.loading')}</p>
              ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
              ) : visibleAgents.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('unapply.noAppliedAgents')}</p>
              ) : (
                <div className="space-y-2">
                  {visibleAgents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAgentIds.has(agent.id) ? 'border-orange-300 bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.has(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{agent.name}</div>
                        <div className="text-xs text-gray-500">
                          {(appliedAgentsMap.get(agent.id) ?? []).join(', ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h4 className="font-medium mb-3">{t('unapply.confirmTitle')}</h4>
              <p className="text-sm text-gray-600 mb-4">
                {t('unapply.confirmDesc', { agents: selectedAgentIds.size, resources: resources.length })}
              </p>
              <div className="space-y-1">
                {agents.filter((a) => selectedAgentIds.has(a.id)).map((a) => (
                  <div key={a.id} className="text-sm text-gray-500 flex justify-between">
                    <span>{a.name}</span>
                    <span className="text-xs text-gray-400">{(appliedAgentsMap.get(a.id) ?? []).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'applying' && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-4">{t('unapply.applying')}</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {step === 'results' && (
            <div>
              <h4 className="font-medium mb-3">{t('unapply.resultSummary')}</h4>
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
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          {step === 'selectAgents' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
              <button
                onClick={() => setStep('confirm')}
                disabled={selectedAgentIds.size === 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('selectAgents')} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.back')}</button>
              <button
                onClick={handleUnapply}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {t('unapply.confirmUnapply')}
              </button>
            </>
          )}
          {step === 'results' && (
            <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 ml-auto">
              {t('common.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
