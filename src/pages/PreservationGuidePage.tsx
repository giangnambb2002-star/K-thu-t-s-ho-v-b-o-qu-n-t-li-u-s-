import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckSquare,
  Printer,
  Square,
} from 'lucide-react';
import { PRESERVATION_GUIDES } from '../data/preservationGuides';

export function PreservationGuidePage() {
  const [activeId, setActiveId] = useState<string>(PRESERVATION_GUIDES[0].id);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const activeGuide =
    PRESERVATION_GUIDES.find((g) => g.id === activeId) ||
    PRESERVATION_GUIDES[0];

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">
            Sổ tay quy chuẩn nghiệp vụ bảo quản &amp; số hoá tư liệu
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tài liệu hướng dẫn thực hành chuẩn cho cán bộ số hoá, nghiên cứu viên và đơn vị lưu trữ.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-xl transition-colors whitespace-nowrap self-start"
        >
          <Printer className="w-4 h-4" />
          <span>In tài liệu hướng dẫn</span>
        </button>
      </div>

      {/* 2-Column Interactive Handbook */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left TOC */}
        <aside className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-card space-y-1.5">
          {PRESERVATION_GUIDES.map((guide) => {
            const isSelected = guide.id === activeGuide.id;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => setActiveId(guide.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-gradient-to-r from-navy-900 to-navy-800 text-white shadow-navy'
                    : 'text-slate-700 hover:bg-navy-50/70'
                }`}
              >
                <span
                  className={`font-mono text-xs font-bold mt-0.5 shrink-0 ${
                    isSelected ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {guide.order}.
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{guide.title}</div>
                  <div
                    className={`text-xs mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-blue-100/80' : 'text-slate-500'
                    }`}
                  >
                    {guide.standardRef}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Detailed Protocol */}
        <article className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-navy-700">
              <BookOpen className="w-4 h-4" />
              <span>
                Mục {activeGuide.order} · {activeGuide.standardRef}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-navy-900 mt-1.5">
              {activeGuide.title}
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {activeGuide.summary}
            </p>
          </div>

          {/* Operational Steps */}
          <section>
            <h4 className="font-display text-sm font-bold text-navy-900 mb-3">
              Quy trình thực hiện từng bước
            </h4>
            <ol className="space-y-2.5">
              {activeGuide.steps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-navy-50/45 border border-navy-100/80 rounded-xl text-sm text-slate-800 leading-relaxed"
                >
                  <span className="font-mono text-xs font-bold text-navy-900 bg-white border border-navy-100 rounded-lg px-2 py-0.5 shrink-0 mt-0.5 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Critical Prohibited / Warning Rules */}
          <section className="p-4 bg-orange-50/90 border border-orange-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-orange-900">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Những điều tuyệt đối tránh</span>
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm text-orange-950 list-disc pl-5">
              {activeGuide.criticalRules.map((rule, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rule}
                </li>
              ))}
            </ul>
          </section>

          {/* Interactive Operational Checklist */}
          <section>
            <h4 className="font-display text-sm font-bold text-navy-900 mb-3">
              Bảng kiểm thực hành tại hiện trường
            </h4>
            <div className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-xl overflow-hidden">
              {activeGuide.checklist.map((item, idx) => {
                const key = `${activeGuide.id}-${idx}`;
                const checked = Boolean(checkedItems[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCheck(key)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-navy-50/40 transition-colors"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        checked
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
