import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';

export default function ProjectSkillList() {
  const { t } = useTranslation();
  const { selectedProject, projectSkills, availableSkills, fetchAvailableSkills, applySkill, unapplySkill } = useProjectStore();
  const [showApply, setShowApply] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (selectedProject) {
      fetchAvailableSkills(selectedProject.id, selectedAgentId || undefined);
    }
  }, [selectedProject, selectedAgentId, fetchAvailableSkills]);

  const filteredSkills = useMemo(() => {
    if (!search.trim()) return availableSkills;
    const q = search.toLowerCase();
    return availableSkills.filter((s: any) =>
      s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
    );
  }, [availableSkills, search]);

  if (!selectedProject) return null;

  const enabledAgents = selectedProject.agents.filter((a) => a.enabled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{t('project.skills')}</h3>
        <button
          onClick={() => { setShowApply(!showApply); setSearch(''); }}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {showApply ? t('common.cancel') : t('project.applySkill')}
        </button>
      </div>

      {showApply && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('project.agents')}</label>
            <select
              value={selectedAgentId}
              onChange={(e) => { setSelectedAgentId(e.target.value); setSearch(''); }}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('project.selectAgent')}</option>
              {enabledAgents.map((a) => (
                <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('project.availableSkills')}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('project.searchSkills')}
              className="w-full px-3 py-2 mb-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredSkills.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">{availableSkills.length === 0 ? t('project.allApplied') : t('common.noResults')}</div>
              ) : (
                filteredSkills.map((skill: any) => (
                  <button
                    key={skill.id}
                    disabled={!selectedAgentId}
                    onClick={async () => {
                      if (selectedAgentId) {
                        await applySkill(selectedProject.id, skill.id, selectedAgentId);
                        setShowApply(false);
                        setSelectedAgentId('');
                        setSearch('');
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {skill.name}
                    {skill.description && <span className="text-gray-400 dark:text-gray-500 ml-2">— {skill.description}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {projectSkills.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">{t('project.noSkills')}</div>
      ) : (
        <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('common.name')}</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('common.description')}</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('common.tags')}</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('project.appliedTo')}</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {projectSkills.map((skill) => (
              <tr key={skill.skillId} className="border-b dark:border-gray-700 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-sm">{skill.name}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{skill.description ?? '-'}</td>
                <td className="px-4 py-2 text-sm">
                  {skill.tags.length > 0 ? skill.tags.join(', ') : '-'}
                </td>
                <td className="px-4 py-2 text-sm">
                  {skill.appliedAgents.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {skill.appliedAgents.map((name) => (
                        <span key={name} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {name}
                          {skill.brokenAgents?.includes(name) && (
                            <span className="ml-1 text-red-500 dark:text-red-400" title={t('project.brokenSymlink')}>!</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-2 text-right">
                  {skill.appliedAgents.map((agentName) => {
                    const agent = selectedProject.agents.find((a) => a.agentName === agentName);
                    return (
                      <button
                        key={agentName}
                        onClick={() => {
                          if (agent) {
                            unapplySkill(selectedProject.id, skill.skillId, agent.agentId);
                          }
                        }}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 rounded ml-1"
                      >
                        ×{agentName}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
