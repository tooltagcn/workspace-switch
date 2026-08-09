import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';

export default function ProjectAgentToggle() {
  const { t } = useTranslation();
  const { selectedProject, toggleAgent, projectSkills } = useProjectStore();
  const [showAll, setShowAll] = useState(false);

  if (!selectedProject) return null;

  const visibleAgents = showAll ? selectedProject.agents : selectedProject.agents.slice(0, 3);
  const hasMore = selectedProject.agents.length > 3;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('project.agents')}</h3>
      <div className="space-y-2">
        {visibleAgents.map((agent) => {
          const appliedCount = projectSkills.filter((s) =>
            s.appliedAgents.includes(agent.agentName),
          ).length;

          return (
            <div
              key={agent.agentId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-sm">{agent.agentName}</span>
                <span className="ml-2 text-xs text-gray-400">{agent.configDirName}</span>
                {appliedCount > 0 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {appliedCount} {appliedCount !== 1 ? t('project.skillCountPlural', { count: appliedCount }) : t('project.skillCount', { count: appliedCount })}
                  </span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agent.enabled}
                  onChange={async () => {
                    if (agent.enabled && appliedCount > 0) {
                      if (!confirm(t('project.disableConfirm', { agent: agent.agentName, count: appliedCount }))) {
                        return;
                      }
                    }
                    await toggleAgent(selectedProject.id, agent.agentId, !agent.enabled);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          );
        })}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            {showAll ? t('project.showLess') : t('project.showMore', { count: selectedProject.agents.length - 3 })}
          </button>
        )}
      </div>
    </div>
  );
}
