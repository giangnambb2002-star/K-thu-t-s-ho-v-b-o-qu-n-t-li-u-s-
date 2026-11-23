import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Lock,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ArchiveRecord, DocumentType, RecordStatus } from '../types/archive';
import { StatusText } from '../components/StatusText';
import {
  exportCatalogSheetHTML,
  exportRecordsAsCSV,
  exportRecordsAsJSON,
} from '../services/exportService';

const DOC_TYPES: Array<DocumentType | 'Tất cả'> = [
  'Tất cả',
  'Văn bản hành chính',
  'Bản thảo viết tay',
  'Ảnh tư liệu',
  'Bản đồ - Bản vẽ',
  'Ấn phẩm - Sách cổ',
  'Hồ sơ nghiên cứu',
  'Khác',
];

const STATUS_OPTIONS: Array<RecordStatus | 'Tất cả'> = [
  'Tất cả',
  'Mới tiếp nhận',
  'Đã số hoá',
  'Đã kiểm tra',
  'Cần chụp lại',
  'Đã sao lưu',
];

interface RepositoryPageProps {
  records: ArchiveRecord[];
  initialTypeFilter?: string;
  onAddNew: () => void;
  onViewDetail: (record: ArchiveRecord) => void;
  onEdit: (record: ArchiveRecord) => void;
  onDelete: (record: ArchiveRecord) => void;
}

export function RepositoryPage({
  records,
  initialTypeFilter = 'Tất cả',
  onAddNew,
  onViewDetail,
  onEdit,
  onDelete,
}: RepositoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);
  const [yearFilter, setYearFilter] = useState<string>('Tất cả');
  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [pageSize, setPageSize] = useState<number>(8);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      const m = r.dublinCore.date.match(/\d{4}/);
      if (m) years.add(m[0]);
    });
    return ['Tất cả', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      const matchesQuery =
        !q ||
        rec.dublinCore.title.toLowerCase().includes(q) ||
        rec.dublinCore.identifier.toLowerCase().includes(q) ||
        rec.dublinCore.subject.toLowerCase().includes(q);
      const matchesType =
        typeFilter === 'Tất cả' || rec.dublinCore.type === typeFilter;
      const matchesYear =
        yearFilter === 'Tất cả' || rec.dublinCore.date.includes(yearFilter);
      const matchesStatus =
        statusFilter === 'Tất cả' || rec.status === statusFilter;
      return matchesQuery && matchesType && matchesYear && matchesStatus;
    });
  }, [records, searchQuery, typeFilter, yearFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Search, Filters & Actions Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-navy-600/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên tư liệu hoặc mã định danh (VD: DA-BT-1978-001)..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-navy-50/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-navy-600 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportRecordsAsJSON(filteredRecords)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-navy-800 bg-white border border-slate-200 rounded-xl hover:bg-navy-50 hover:border-navy-200 transition-colors whitespace-nowrap shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportRecordsAsCSV(filteredRecords)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-navy-800 bg-white border border-slate-200 rounded-xl hover:bg-navy-50 hover:border-navy-200 transition-colors whitespace-nowrap shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 rounded-xl shadow-navy transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm bản ghi mới</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Lọc theo loại tư liệu
            </label>
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
              className="w-full px-3 py-2 text-sm bg-navy-50/40 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Lọc theo năm tư liệu
            </label>
            <select
              value={yearFilter}
              onChange={(e) => handleFilterChange(setYearFilter, e.target.value)}
              className="w-full px-3 py-2 text-sm bg-navy-50/40 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y === 'Tất cả' ? 'Tất cả các năm' : `Năm ${y}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Lọc theo trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(setStatusFilter, e.target.value)
              }
              className="w-full px-3 py-2 text-sm bg-navy-50/40 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-navy-800">
                <th className="py-3.5 px-4 whitespace-nowrap">Mã định danh</th>
                <th className="py-3.5 px-4">Nhan đề &amp; Mô tả Dublin Core</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Loại · Năm</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Quyền công bố</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Tệp tin
                </th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 px-4 text-center text-slate-500"
                  >
                    <p className="font-medium text-slate-700">
                      Không tìm thấy bản ghi tư liệu phù hợp
                    </p>
                    <p className="text-xs mt-1">
                      Hãy thay đổi điều kiện tìm kiếm hoặc tạo mới bản ghi tư liệu.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const isRestricted =
                    rec.rightsConsent.publicationStatus ===
                    'Chưa được cấp quyền';
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-navy-50/45 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-navy-900 whitespace-nowrap">
                        {rec.dublinCore.identifier}
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <button
                          type="button"
                          onClick={() => onViewDetail(rec)}
                          className="text-left font-medium text-slate-900 hover:text-navy-700 transition-colors line-clamp-1"
                        >
                          {rec.dublinCore.title}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          Lưu giữ: {rec.extended.currentCustodyLocation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <span>{rec.dublinCore.type}</span>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="tabular-nums font-mono">
                          {rec.dublinCore.date}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText value={rec.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusText
                            value={rec.rightsConsent.publicationStatus}
                          />
                          {isRestricted && (
                            <span
                              className="text-[11px] text-orange-700"
                              title="Đã ẩn bản xem trước vì chưa được cấp quyền"
                            >
                              (Ẩn ảnh)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {isRestricted ? (
                          <span className="inline-flex items-center gap-1 text-orange-700">
                            <Lock className="w-3 h-3" />
                            <span>{rec.files.length}</span>
                          </span>
                        ) : (
                          <span>{rec.files.length} tệp</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewDetail(rec)}
                            className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-navy-50 rounded-lg transition-colors"
                            title="Xem chi tiết 15+8 trường"
                            aria-label={`Xem chi tiết ${rec.dublinCore.identifier}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportCatalogSheetHTML(rec)}
                            className="p-1.5 text-slate-600 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                            title="Xuất phiếu mô tả tư liệu"
                            aria-label={`Xuất phiếu mô tả ${rec.dublinCore.identifier}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(rec)}
                            className="p-1.5 text-slate-600 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                            title="Chỉnh sửa bản ghi"
                            aria-label={`Sửa ${rec.dublinCore.identifier}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(rec)}
                            className="p-1.5 text-slate-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Xoá bản ghi"
                            aria-label={`Xoá ${rec.dublinCore.identifier}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-navy-50/45 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              Hiển thị{' '}
              <strong className="text-navy-900">
                {paginatedRecords.length}
              </strong>{' '}
              / <strong className="text-navy-900">{filteredRecords.length}</strong>{' '}
              bản ghi
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Số bản ghi mỗi trang"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-600/20"
            >
              <option value={5}>5 / trang</option>
              <option value={8}>8 / trang</option>
              <option value={15}>15 / trang</option>
              <option value={30}>30 / trang</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-navy-50 hover:text-navy-900 hover:border-navy-200/60 transition-colors disabled:opacity-45 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <span className="px-2.5 font-mono tabular-nums text-navy-900 font-medium">
              Trang {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-navy-50 hover:text-navy-900 hover:border-navy-200/60 transition-colors disabled:opacity-45 disabled:pointer-events-none"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
