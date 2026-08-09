import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore.js';
import ProjectList from '../components/projects/ProjectList.js';
import ProjectDetail from '../components/projects/ProjectDetail.js';
import ProjectAddDialog from '../components/projects/ProjectAddDialog.js';

export default function Projects() {
  const { t } = useTranslation();
  const { selectedProject, fetchProjects, clearSelection } = useProjectStore();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('project.title')}</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {t('project.addProject')}
        </button>
      </div>

      {selectedProject ? (
        <div className="space-y-6">
          <button
            onClick={clearSelection}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; {t('project.backToList')}
          </button>
          <ProjectDetail />
        </div>
      ) : (
        <ProjectList />
      )}

      <ProjectAddDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
