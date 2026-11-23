import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Download,
  FileImage,
  HardDriveDownload,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import { ActivityLog, ArchiveRecord, PageId } from '../types/archive';
import {
  exportBackupLedgerCSV,
  exportRecordsAsCSV,
  exportRecordsAsJSON,
} from '../services/exportService';

interface OverviewPageProps {
  records: ArchiveRecord[];
  activities: ActivityLog[];
  onNavigate: (page: PageId, typeFilter?: string) => void;
  onResetDemo: () => void;
}

const CHART_COLORS = [
  '#08172c',
  '#0f294a',
  '#1e4980',
  '#285fa3',
  '#3b82f6',
  '#0ea5e9',
  '#64748b',
];

export function OverviewPage({
  records,
  activities,
  onNavigate,
  onResetDemo,
}: OverviewPageProps) {
  const totalRecords = records.length;
  const totalImageFiles = records.reduce(
    (acc, r) =>
      acc +
      r.files.filter(
        (f) => f.mimeType.startsWith('image/') || f.format.includes('image')
      ).length,
    0
  );
  const digitizedCount = records.filter(
    (r) => r.status !== 'Mới tiếp nhận' || r.files.length > 0
  ).length;
  const inspectedCount = records.filter(
    (r) =>
      r.status === 'Đã kiểm tra' ||
      r.status === 'Đã sao lưu' ||
      Boolean(r.latestQualityCheck?.humanConfirmed)
  ).length;
  const backedUpCount = records.filter(
    (r) =>
      r.backup.status === 'Đã sao lưu đầy đủ' && r.backup.humanConfirmed
  ).length;

  const preservationCompletion =
    totalRecords > 0 ? Math.round((backedUpCount / totalRecords) * 100) : 0;

  const unbackedRecords = records.filter(
    (r) => r.backup.status !== 'Đã sao lưu đầy đủ' || !r.backup.humanConfirmed
  );
  const unverifiedOriginals = records.filter(
    (r) => !r.backup.originalLocationVerified
  );
  const unauthorizedRecords = records.filter(
    (r) => r.rightsConsent.publicationStatus === 'Chưa được cấp quyền'
  );

  // Thống kê theo loại tư liệu
  const typeMap = new Map<string, number>();
  for (const rec of records) {
    const t = rec.dublinCore.type || 'Khác';
    typeMap.set(t, (typeMap.get(t) || 0) + 1);
  }
  const typeBreakdown = Array.from(typeMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  // Tính toán SVG Donut segments
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativeFraction = 0;
  const donutSegments = typeBreakdown.map(([docType, count], idx) => {
    const fraction = totalRecords > 0 ? count / totalRecords : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeFraction * circumference;
    cumulativeFraction += fraction;
    return {
      docType,
      count,
      sharePct: totalRecords > 0 ? Math.round(fraction * 100) : 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const kpis = [
    {
      label: 'Tổng số tư liệu',
      value: totalRecords,
      sub: 'Hồ sơ chuẩn Dublin Core',
      icon: Database,
      target: 'repository' as PageId,
    },
    {
      label: 'Tổng số tệp hình ảnh',
      value: totalImageFiles,
      sub: 'Tách biệt gốc & hiển thị',
      icon: FileImage,
      target: 'file-management' as PageId,
    },
    {
      label: 'Tư liệu đã số hoá',
      value: digitizedCount,
      sub: `${totalRecords > 0 ? Math.round((digitizedCount / totalRecords) * 100) : 0}% tổng kho`,
      icon: ScanLine,
      target: 'digitization' as PageId,
    },
    {
      label: 'Tư liệu đã kiểm tra',
      value: inspectedCount,
      sub: 'Có xác nhận của cán bộ',
      icon: CheckCircle2,
      target: 'quality-check' as PageId,
    },
    {
      label: 'Tư liệu đã sao lưu',
      value: backedUpCount,
      sub: 'Đủ 2 bản sao & xác nhận',
      icon: HardDriveDownload,
      target: 'backup' as PageId,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modern Navy Hero Executive Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 text-white p-6 sm:p-7 shadow-navy border border-navy-700/60">
        <div
          className="absolute inset-0 archival-grid-bg pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-medium text-blue-200/90">
              Hệ thống quản lý &amp; bảo quản tư liệu tổ chức · Phi thương mại
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Tổng quan tiến độ số hoá và an toàn bảo tồn
            </h2>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Quản trị đồng bộ từ tiếp nhận bản gốc, chuẩn hoá tệp SHA-256, kiểm định chất lượng với Gemini AI đến xác minh sao lưu 3-2-1 và quyền công bố.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-4 shadow-inner">
              <div>
                <div className="text-[11px] text-blue-200">
                  Tỷ lệ sao lưu hoàn chỉnh
                </div>
                <div className="font-display text-2xl font-bold tabular-nums text-white">
                  {preservationCompletion}%
                </div>
              </div>
              <div className="w-16 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-blue-300 rounded-full transition-all duration-300"
                  style={{ width: `${preservationCompletion}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('repository')}
              className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-navy-900 bg-white hover:bg-navy-50 rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              <span>Mở kho tư liệu</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Export Quick Bar inside Hero Footer */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/12 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportRecordsAsJSON(records)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-100 bg-white/10 hover:bg-white/18 border border-white/15 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportRecordsAsCSV(records)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-100 bg-white/10 hover:bg-white/18 border border-white/15 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportBackupLedgerCSV(records)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-100 bg-white/10 hover:bg-white/18 border border-white/15 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất danh sách sao lưu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200/85 hover:text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </section>

      {/* 5 Modern KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => onNavigate(kpi.target)}
              className="group text-left bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-navy-600/35 hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">
                  {kpi.label}
                </span>
                <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-900 group-hover:bg-navy-900 group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-xs">
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 font-display text-3xl font-bold text-navy-900 tabular-nums tracking-tight">
                {kpi.value}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between gap-1">
                <span className="truncate">{kpi.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-navy-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Warnings Bar if any archival risk exists */}
      {(unbackedRecords.length > 0 ||
        unverifiedOriginals.length > 0 ||
        unauthorizedRecords.length > 0) && (
        <div className="bg-orange-50/90 border border-orange-200 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-950 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Cảnh báo an toàn bảo quản &amp; pháp lý cần xử lý</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-orange-950">
            <button
              type="button"
              onClick={() => onNavigate('backup')}
              className="text-left p-4 bg-white border border-orange-200/80 rounded-xl shadow-xs hover:border-orange-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-orange-900 tabular-nums">
                {unbackedRecords.length} tư liệu chưa sao lưu đầy đủ
              </div>
              <div className="text-slate-600 mt-1 leading-relaxed">
                Cần bổ sung đủ 2 vị trí sao lưu độc lập và xác nhận thực tế.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('backup')}
              className="text-left p-4 bg-white border border-orange-200/80 rounded-xl shadow-xs hover:border-orange-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-orange-900 tabular-nums">
                {unverifiedOriginals.length} bản gốc chưa xác minh vị trí
              </div>
              <div className="text-slate-600 mt-1 leading-relaxed">
                Không tự ghi nhận vị trí lưu bản gốc nếu chưa kiểm tra thực địa.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('rights')}
              className="text-left p-4 bg-white border border-orange-200/80 rounded-xl shadow-xs hover:border-orange-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold text-orange-900 tabular-nums">
                {unauthorizedRecords.length} tư liệu chưa được cấp quyền công bố
              </div>
              <div className="text-slate-600 mt-1 leading-relaxed">
                Đang tự động ẩn bản xem trước trên toàn hệ thống.
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Donut + Bar Chart & Timeline Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart by Document Type */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="font-display text-base font-bold text-navy-900">
                Thống kê cơ cấu theo loại tư liệu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhấp vào từng loại để lọc nhanh trong Kho tư liệu số
              </p>
            </div>
            <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4" />
            </span>
          </div>

          {typeBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Chưa có dữ liệu tư liệu trong kho.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Interactive SVG Donut */}
              <div className="sm:col-span-5 flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg
                    viewBox="0 0 140 140"
                    className="w-full h-full -rotate-90"
                    aria-label="Biểu đồ tỷ lệ loại tư liệu"
                  >
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="18"
                    />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.docType}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => onNavigate('repository', seg.docType)}
                      >
                        <title>
                          {seg.docType}: {seg.count} ({seg.sharePct}%)
                        </title>
                      </circle>
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="font-display text-2xl font-bold text-navy-900 tabular-nums">
                      {totalRecords}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      bản ghi
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Segmented Bars */}
              <div className="sm:col-span-7 space-y-3.5">
                {donutSegments.map((seg) => (
                  <button
                    key={seg.docType}
                    type="button"
                    onClick={() => onNavigate('repository', seg.docType)}
                    className="w-full text-left group focus-visible:outline-none"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: seg.color }}
                          aria-hidden="true"
                        />
                        <span>{seg.docType}</span>
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {seg.count} · {seg.sharePct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(seg.sharePct, 4)}%`,
                          backgroundColor: seg.color,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Timeline Activity Feed */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card flex flex-col">
          <div className="pb-4 mb-4 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-navy-900">
              Hoạt động gần đây
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhật ký số hoá, kiểm tra, sao lưu và cập nhật quyền
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Chưa có hoạt động nào được ghi nhận.
            </div>
          ) : (
            <ol className="relative space-y-4 flex-1 overflow-y-auto max-h-80 pr-1 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-navy-100">
              {activities.slice(0, 10).map((act) => (
                <li key={act.id} className="relative pl-6">
                  <span
                    className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-navy-800 shadow-xs"
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      {act.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                      {new Date(act.timestamp).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {act.detail}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
