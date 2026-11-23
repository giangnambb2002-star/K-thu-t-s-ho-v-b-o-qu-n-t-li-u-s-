import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  HardDrive,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  ArchiveRecord,
  BackupCompletionStatus,
  BackupRecordInfo,
} from '../types/archive';
import { StatusText } from '../components/StatusText';
import {
  exportBackupLedgerCSV,
  exportBackupLedgerJSON,
} from '../services/exportService';

interface BackupManagementPageProps {
  records: ArchiveRecord[];
  onUpdateBackup: (recordId: string, backup: BackupRecordInfo) => Promise<void>;
}

export function BackupManagementPage({
  records,
  onUpdateBackup,
}: BackupManagementPageProps) {
  const [editingRecord, setEditingRecord] = useState<ArchiveRecord | null>(
    null
  );
  const [formState, setFormState] = useState<BackupRecordInfo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const unbackedCount = records.filter(
    (r) => r.backup.status !== 'Đã sao lưu đầy đủ' || !r.backup.humanConfirmed
  ).length;
  const unverifiedOriginalsCount = records.filter(
    (r) => !r.backup.originalLocationVerified
  ).length;

  const openEditor = (rec: ArchiveRecord) => {
    setEditingRecord(rec);
    setFormState({ ...rec.backup });
    setFormError(null);
  };

  const handleSaveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !formState) return;
    setFormError(null);

    // Nguyên tắc 8 & Trang 6: Không tự nhận bản gốc đang lưu tại đâu nếu chưa xác minh
    if (
      formState.originalLocationVerified &&
      (!formState.originalStorageLocation.trim() ||
        formState.originalStorageLocation
          .toLowerCase()
          .includes('chưa xác định'))
    ) {
      setFormError(
        'Không thể đánh dấu đã xác minh vị trí bản gốc khi trường vị trí vẫn trống hoặc ghi "Chưa xác định".'
      );
      return;
    }

    // Không giả lập trạng thái sao lưu thành công khi chưa có xác nhận thực tế
    if (formState.status === 'Đã sao lưu đầy đủ') {
      if (
        !formState.backupLocation1.trim() ||
        !formState.backupLocation2.trim() ||
        !formState.backupDate.trim() ||
        !formState.humanConfirmed ||
        !formState.confirmedBy.trim()
      ) {
        setFormError(
          'Không thể ghi nhận trạng thái "Đã sao lưu đầy đủ" khi thiếu: Vị trí sao lưu 1, Vị trí sao lưu 2, Ngày sao lưu, Họ tên người xác nhận và ô tích xác nhận thực tế.'
        );
        return;
      }
    }

    let computedStatus: BackupCompletionStatus = formState.status;
    if (!formState.humanConfirmed) {
      if (
        formState.backupLocation1.trim() ||
        formState.backupLocation2.trim()
      ) {
        computedStatus = 'Sao lưu một phần';
      } else {
        computedStatus = 'Chưa sao lưu';
      }
    }

    await onUpdateBackup(editingRecord.id, {
      ...formState,
      originalStorageLocation:
        formState.originalStorageLocation.trim() || 'Chưa xác định',
      status: computedStatus,
    });
    setEditingRecord(null);
    setFormState(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Exports */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">
            Theo dõi bản gốc &amp; Chiến lược sao lưu 3-2-1
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Hệ thống không tự giả lập trạng thái sao lưu hoàn tất hoặc vị trí bản gốc khi chưa có xác minh thực tế từ cán bộ phụ trách.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportBackupLedgerCSV(records)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-navy-50 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất danh sách sao lưu (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => exportBackupLedgerJSON(records)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-800 bg-navy-50 border border-navy-100 rounded-xl hover:bg-navy-100 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON sao lưu</span>
          </button>
        </div>
      </div>

      {/* Warning banner for unbacked / unverified items */}
      {(unbackedCount > 0 || unverifiedOriginalsCount > 0) && (
        <div className="bg-orange-50/90 border border-orange-200 rounded-2xl p-4 shadow-card flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-orange-950 space-y-1">
            <p className="font-semibold">
              Cảnh báo an toàn dữ liệu: Có{' '}
              <span className="tabular-nums">{unbackedCount}</span> tư liệu chưa hoàn tất sao lưu 2 bản và{' '}
              <span className="tabular-nums">{unverifiedOriginalsCount}</span> bản gốc chưa được xác minh vị trí lưu giữ thực địa.
            </p>
            <p className="text-xs text-orange-800">
              Hãy kiểm tra trực tiếp kho lưu giữ vật lý và 2 phương tiện sao lưu trước khi cập nhật xác nhận.
            </p>
          </div>
        </div>
      )}

      {/* Backup Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy-50/75 border-b border-slate-200 text-[11px] uppercase tracking-wider text-navy-800 font-semibold">
                <th className="py-3.5 px-4 whitespace-nowrap">Mã định danh</th>
                <th className="py-3.5 px-4">Vị trí lưu bản gốc</th>
                <th className="py-3.5 px-4">Vị trí sao lưu 1</th>
                <th className="py-3.5 px-4">Vị trí sao lưu 2</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngày sao lưu</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Cập nhật
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {records.map((rec) => {
                const bk = rec.backup;
                const needsWarning =
                  bk.status !== 'Đã sao lưu đầy đủ' || !bk.humanConfirmed;
                return (
                  <tr
                    key={rec.id}
                    className={
                      needsWarning
                        ? 'bg-orange-50/25 hover:bg-orange-50/50 transition-colors'
                        : 'hover:bg-navy-50/40 transition-colors'
                    }
                  >
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono font-semibold text-navy-900 whitespace-nowrap">
                        {rec.dublinCore.identifier}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate">
                        {rec.dublinCore.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[200px]">
                      <div className="text-slate-800">
                        {bk.originalStorageLocation}
                      </div>
                      <div className="mt-1">
                        {bk.originalLocationVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã xác minh thực tế</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-orange-700 font-medium">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Chưa xác minh vị trí</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[190px]">
                      {bk.backupLocation1 ? (
                        <span className="text-slate-700">
                          {bk.backupLocation1}
                        </span>
                      ) : (
                        <span className="text-orange-700 font-medium">
                          Chưa thiết lập
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[190px]">
                      {bk.backupLocation2 ? (
                        <span className="text-slate-700">
                          {bk.backupLocation2}
                        </span>
                      ) : (
                        <span className="text-orange-700 font-medium">
                          Chưa thiết lập
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {bk.backupDate || 'Chưa ghi nhận'}
                    </td>

                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <StatusText value={bk.status} />
                      {bk.humanConfirmed && bk.confirmedBy && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Xác nhận: {bk.confirmedBy}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditor(rec)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy-900 bg-white hover:bg-navy-50 border border-slate-200 rounded-xl transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Cập nhật</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Backup Modal */}
      {editingRecord && formState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-navy-950/20 overflow-hidden">
            <div className="px-5 py-4 bg-navy-50/75 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-navy-800" />
                <h3 className="font-display text-sm font-bold text-navy-900">
                  Cập nhật hồ sơ sao lưu · {editingRecord.dublinCore.identifier}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBackup} className="p-5 space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vị trí lưu bản gốc
                </label>
                <input
                  type="text"
                  value={formState.originalStorageLocation}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      originalStorageLocation: e.target.value,
                    })
                  }
                  placeholder="Ghi Chưa xác định nếu chưa kiểm chứng"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.originalLocationVerified}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        originalLocationVerified: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-navy-800"
                  />
                  <span>
                    Tôi xác nhận đã kiểm chứng thực địa vị trí lưu bản gốc trên
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vị trí sao lưu thứ nhất
                  </label>
                  <input
                    type="text"
                    value={formState.backupLocation1}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        backupLocation1: e.target.value,
                      })
                    }
                    placeholder="VD: NAS Phòng Tư liệu /Volume1"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vị trí sao lưu thứ hai
                  </label>
                  <input
                    type="text"
                    value={formState.backupLocation2}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        backupLocation2: e.target.value,
                      })
                    }
                    placeholder="VD: Ổ cứng ngoại tuyến LTO #02"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày thực hiện sao lưu
                  </label>
                  <input
                    type="date"
                    value={formState.backupDate}
                    onChange={(e) =>
                      setFormState({ ...formState, backupDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái hoàn thành
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        status: e.target.value as BackupCompletionStatus,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  >
                    <option value="Chưa sao lưu">Chưa sao lưu</option>
                    <option value="Sao lưu một phần">Sao lưu một phần</option>
                    <option value="Đã sao lưu đầy đủ">
                      Đã sao lưu đầy đủ
                    </option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-navy-50/55 border border-navy-100 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-medium text-navy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.humanConfirmed}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        humanConfirmed: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-navy-800"
                  />
                  <span>
                    Xác nhận thực tế đã kiểm tra mở tệp thành công tại các vị trí sao lưu
                  </span>
                </label>

                <input
                  type="text"
                  value={formState.confirmedBy}
                  onChange={(e) =>
                    setFormState({ ...formState, confirmedBy: e.target.value })
                  }
                  placeholder="Họ tên người xác nhận sao lưu"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú sao lưu
                </label>
                <input
                  type="text"
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState({ ...formState, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 rounded-xl shadow-navy transition-all"
                >
                  Lưu thông tin sao lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
