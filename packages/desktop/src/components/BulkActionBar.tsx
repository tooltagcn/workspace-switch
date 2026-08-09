import { useTranslation } from 'react-i18next';

interface BulkActionBarProps {
  selectedCount: number;
  onTag: () => void;
  onApply: () => void;
  onUnapply: () => void;
  onDelete: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onTag,
  onApply,
  onUnapply,
  onDelete,
}: BulkActionBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
      <div className="px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {t('bulk.selected', { count: selectedCount })}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onTag}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            {t('bulk.tagSelected')}
          </button>
          <button
            onClick={onApply}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('bulk.applySelected')}
          </button>
          <button
            onClick={onUnapply}
            className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
          >
            {t('bulk.unapplySelected')}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            {t('bulk.deleteSelected')}
          </button>
        </div>
      </div>
    </div>
  );
}
