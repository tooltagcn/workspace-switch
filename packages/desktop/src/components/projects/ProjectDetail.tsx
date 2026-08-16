import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';
import ProjectAgentToggle from './ProjectAgentToggle.js';
import ProjectSkillList from './ProjectSkillList.js';

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { selectedProject, renameProject } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  if (!selectedProject) return null;

  const startRename = () => {
    setEditName(selectedProject.name);
    setEditing(true);
  };

  const saveRename = async () => {
    if (editName.trim() && editName !== selectedProject.name) {
      await renameProject(selectedProject.id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                className="px-3 py-1 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={saveRename} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">{t('common.save')}</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded">{t('common.cancel')}</button>
            </div>
          ) : (
            <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
          )}
          {!editing && (
            <button onClick={startRename} className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded">{t('project.rename')}</button>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{selectedProject.path}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ProjectAgentToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ProjectSkillList />
      </div>
    </div>
  );
}
