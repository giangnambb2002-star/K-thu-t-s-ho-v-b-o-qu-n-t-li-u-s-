import { useState } from 'react';
import { Edit3, Lock, ShieldCheck, X } from 'lucide-react';
import {
  ArchiveRecord,
  PublicationStatus,
  RightsConsentInfo,
} from '../types/archive';
import { StatusText } from '../components/StatusText';

interface RightsAndSourcesPageProps {
  records: ArchiveRecord[];
  onUpdateRights: (
    recordId: string,
    rights: RightsConsentInfo
  ) => Promise<void>;
}

export function RightsAndSourcesPage({
  records,
  onUpdateRights,
}: RightsAndSourcesPageProps) {
  const [editingRecord, setEditingRecord] = useState<ArchiveRecord | null>(
    null
  );
  const [formState, setFormState] = useState<RightsConsentInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openEditor = (rec: ArchiveRecord) => {
    setEditingRecord(rec);
    setFormState({ ...rec.rightsConsent });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !formState) return;
    setErrorMsg(null);

    if (
      formState.publicationStatus === 'Được phép công bố' &&
      (!formState.authorizerName.trim() ||
        formState.authorizerName.toLowerCase().includes('chưa xác định') ||
        !formState.consentDate.trim() ||
        formState.consentDate.toLowerCase().includes('chưa xác định'))
    ) {
      setErrorMsg(
        'Để chuyển sang trạng thái "Được phép công bố", bắt buộc phải ghi rõ Người cho phép công bố và Ngày đồng ý cụ thể (không tự tạo dữ liệu).'
      );
      return;
    }

    await onUpdateRights(editingRecord.id, {
      providingOrganization:
        formState.providingOrganization.trim() || 'Chưa xác định',
      authorizerName: formState.authorizerName.trim() || 'Chưa xác định',
      authorizerRole: formState.authorizerRole.trim() || 'Chưa xác định',
      consentDate: formState.consentDate.trim() || 'Chưa xác định',
      allowedScope: formState.allowedScope.trim() || 'Chưa xác định',
      referenceSource: formState.referenceSource.trim() || 'Chưa xác định',
      restrictedPortions:
        formState.restrictedPortions.trim() || 'Chưa xác định',
      publicationStatus: formState.publicationStatus,
    });
    setEditingRecord(null);
    setFormState(null);
  };

  return (
    <div className="space-y-6">
      {/* Legal & Transparency Gate Banner */}
      <div className="bg-navy-50/90 border border-navy-100 rounded-2xl p-4 shadow-card flex items-start gap-3 text-xs sm:text-sm text-slate-800">
        <Lock className="w-5 h-5 text-navy-800 shrink-0 mt-0.5" />
        <div>
          <strong className="text-navy-900">
            Quản lý nguồn gốc &amp; quyền công bố tư liệu:
          </strong>{' '}
          Chỉ hiển thị hình ảnh tư liệu khi có văn bản/xác nhận đồng ý từ đơn vị hoặc cá nhân có thẩm quyền. Không tự tạo nguồn tư liệu hoặc tên người cho phép nếu chưa có căn cứ.
        </div>
      </div>

      {/* Rights Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy-50/75 border-b border-slate-200 text-[11px] uppercase tracking-wider text-navy-800 font-semibold">
                <th className="py-3.5 px-4 whitespace-nowrap">Mã định danh</th>
                <th className="py-3.5 px-4">Tổ chức cung cấp &amp; Nguồn</th>
                <th className="py-3.5 px-4">Người cho phép &amp; Vai trò</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngày đồng ý</th>
                <th className="py-3.5 px-4">Phạm vi sử dụng</th>
                <th className="py-3.5 px-4">Phần không công bố</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Cập nhật
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {records.map((rec) => {
                const rc = rec.rightsConsent;
                return (
                  <tr key={rec.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono font-semibold text-navy-900 whitespace-nowrap">
                        {rec.dublinCore.identifier}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-[160px] truncate">
                        {rec.dublinCore.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[200px]">
                      <div className="font-medium text-slate-800">
                        {rc.providingOrganization}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Nguồn: {rc.referenceSource}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[180px]">
                      <div
                        className={
                          rc.authorizerName
                            .toLowerCase()
                            .includes('chưa xác định')
                            ? 'text-orange-700 font-medium'
                            : 'text-slate-800 font-medium'
                        }
                      >
                        {rc.authorizerName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Vai trò: {rc.authorizerRole}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {rc.consentDate}
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[190px] text-slate-700">
                      {rc.allowedScope}
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-[190px] text-slate-700">
                      {rc.restrictedPortions}
                    </td>

                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <StatusText value={rc.publicationStatus} />
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

      {/* Edit Modal */}
      {editingRecord && formState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-navy-950/20 overflow-hidden">
            <div className="px-5 py-4 bg-navy-50/75 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-navy-800" />
                <h3 className="font-display text-sm font-bold text-navy-900">
                  Quyền công bố &amp; Nguồn tư liệu ·{' '}
                  {editingRecord.dublinCore.identifier}
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

            <form onSubmit={handleSave} className="p-5 space-y-4 text-sm">
              {errorMsg && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên tổ chức cung cấp
                  </label>
                  <input
                    type="text"
                    value={formState.providingOrganization}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        providingOrganization: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nguồn tham khảo
                  </label>
                  <input
                    type="text"
                    value={formState.referenceSource}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        referenceSource: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Người cho phép công bố
                  </label>
                  <input
                    type="text"
                    value={formState.authorizerName}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        authorizerName: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò người cho phép
                  </label>
                  <input
                    type="text"
                    value={formState.authorizerRole}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        authorizerRole: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày đồng ý (YYYY-MM-DD hoặc Chưa xác định)
                  </label>
                  <input
                    type="text"
                    value={formState.consentDate}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        consentDate: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái cấp quyền hiển thị
                  </label>
                  <select
                    value={formState.publicationStatus}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        publicationStatus: e.target.value as PublicationStatus,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  >
                    <option value="Chưa được cấp quyền">
                      Chưa được cấp quyền
                    </option>
                    <option value="Công bố có điều kiện">
                      Công bố có điều kiện
                    </option>
                    <option value="Được phép công bố">Được phép công bố</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phạm vi được phép sử dụng
                  </label>
                  <input
                    type="text"
                    value={formState.allowedScope}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        allowedScope: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phần không được công bố
                  </label>
                  <textarea
                    rows={2}
                    value={formState.restrictedPortions}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        restrictedPortions: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>
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
                  Lưu hồ sơ quyền công bố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
