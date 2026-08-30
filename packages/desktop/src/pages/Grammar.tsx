import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface ConjunctionEntry {
  pattern: string;
  example?: string;
}

interface RelationshipType {
  name: string;
  description: string;
  entries: ConjunctionEntry[];
}

const grammarData: RelationshipType[] = [
  {
    name: '转折关系',
    description: '后一个分句与前一个分句的意思相反或相对，或部分相反。前一个分句提出一种情况，后一个分句不是顺着前一个分句意思说下去，而是转到相反的意思上去，这种关系叫转折关系',
    entries: [
      { pattern: '虽然……但是……' },
      { pattern: '尽管……还是……' },
      { pattern: '……却……' },
      { pattern: '……然而……' },
      { pattern: '……但是……' },
      { pattern: '虽然……却' },
      { pattern: '既然……也……' },
    ],
  },
  {
    name: '假设关系',
    description: '一个分句表示假设，另一个分句表示假设实现后的结果。前一个分句提出假设，后一个分保存说出假设实现后会有的结果，结果与假设一致，这种关系叫假设关系',
    entries: [
      { pattern: '如果……就……' },
      { pattern: '要是……那么……' },
      { pattern: '即便……也……' },
      { pattern: '即使……也……' },
      { pattern: '倘若……就……' },
      { pattern: '要是……就……' },
      { pattern: '倘若……便……' },
    ],
  },
  {
    name: '并列关系',
    description: '（各分名词关系是平行并列的，几个分句分别叙述或描写几件事情，几种情况，或同一事物的几个方面，这种关系叫并列关系',
    entries: [
      { pattern: '一边……一边……' },
      { pattern: '一会儿……一会儿……' },
      { pattern: '既……又……' },
      { pattern: '又……又……' },
      { pattern: '一面……一面……' },
      { pattern: '有……有……' },
    ],
  },
  {
    name: '递进关系',
    description: '分句间是进一层的关系，后一个分句的意思比前一个分句更进一层，这种关系叫递进关系',
    entries: [
      { pattern: '不但……而且……' },
      { pattern: '不光……也……' },
      { pattern: '不仅……还……' },
      { pattern: '不但不……反而……' },
    ],
  },
  {
    name: '选择关系',
    description: '几个分句分别说出几件事情，表示选择其中一件，这种关系叫选择关系',
    entries: [
      { pattern: '或者……或者……' },
      { pattern: '是……还是……' },
      { pattern: '要么……要么……' },
      { pattern: '与其……不如……' },
      { pattern: '宁可……也不……' },
    ],
  },
  {
    name: '因果关系',
    description: '分句间是原因与结果的关系，一个分句提出原因，一个分名说明结果，这种关系叫做因果关系',
    entries: [
      { pattern: '因为……所以……' },
      { pattern: '由于……因此……' },
      { pattern: '之所以……是因为……' },
      { pattern: '既然……就……' },
    ],
  },
  {
    name: '条件关系',
    description: '一个分句说明条件，另一个分句表示在这一个条件下产生的结果',
    entries: [
      { pattern: '只要……就……' },
      { pattern: '只有……才……' },
      { pattern: '无论……都……' },
      { pattern: '不管……总……' },
      { pattern: '除非……才……' },
    ],
  },
  {
    name: '承接关系',
    description: '各分句表示连续发生的事情或是动作，分句有先后顺序',
    entries: [
      { pattern: '首先……然后……' },
      { pattern: '先……接着……' },
      { pattern: '一……就……' },
      { pattern: '于是……' },
    ],
  },
];

export default function Grammar() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = Array.from(new Set(grammarData.map((g) => g.name))).sort();

  const filtered = grammarData.filter((g) => {
    if (selectedCategory && g.name !== selectedCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.entries.some((e) => e.pattern.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('grammar.title', '常规关联词表格')}</h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t(
          'grammar.description',
          '关联词一般分转折关系、假设关系、条件关系等。把两个或两个以上在意义上有密切联系的句子组合在一起，叫复句，也叫关联句。复句通常用一些关联词语来连接。',
        )}
      </p>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="px-3 py-2 text-sm border dark:border-gray-700 rounded-lg w-72 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-sm border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">{t('common.allTags', '全部分类')}</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">{t('common.noData')}</p>
        ) : (
          <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">{t('grammar.relationship', '关系类型')}</th>
                <th className="px-4 py-2 text-left">{t('grammar.description', '说明')}</th>
                <th className="px-4 py-2 text-left">{t('grammar.conjunctions', '关联词')}</th>
                <th className="px-4 py-2 text-left">{t('grammar.example', '示例')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((group) => (
                <tr key={group.name} className="border-t dark:border-gray-700">
                  <td className="px-4 py-3 font-semibold align-top">{group.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 align-top max-w-[280px]">
                    {group.description}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {group.entries.map((entry, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded whitespace-nowrap"
                        >
                          {entry.pattern}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">
                    {group.entries[0]?.example ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
