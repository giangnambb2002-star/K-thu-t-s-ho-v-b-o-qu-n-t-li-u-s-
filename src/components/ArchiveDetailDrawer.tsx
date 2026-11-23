import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Edit3,
  FileImage,
  Lock,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { ArchiveRecord } from '../types/archive';
import { StatusText } from './StatusText';
import { formatFileSize } from '../services/cryptoAndFileService';
import { storageService } from '../services/storageService';
import { exportCatalogSheetHTML } from '../services/exportService';

interface ArchiveDetailDrawerProps {
  record: ArchiveRecord | null;
  onClose: () => void;
  onEdit: (record: ArchiveRecord) => void;
  onDelete: (record: ArchiveRecord) => void;
}

export function ArchiveDetailDrawer({
  record,
  onClose,
  onEdit,
  onDelete,
}: ArchiveDetailDrawerProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function loadImages() {
      if (!record) {
        setPreviews({});
        return;
      }
      if (record.rightsConsent.publicationStatus === 'Chưa được cấp quyền') {
        setPreviews({});
        return;
      }
      const next: Record<string, string> = {};
      for (const f of record.files) {
        if (f.mediaStorageKey && f.mimeType.startsWith('image/')) {
          const url = await storageService.getMediaDataUrl(f.mediaStorageKey);
          if (url && active) {
            next[f.id] = url;
          }
        }
      }
      if (active) setPreviews(next);
    }
    loadImages();
    return () => {
      active = false;
    };
  }, [record]);

  if (!record) return null;

  const dc = record.dublinCore;
  const ext = record.extended;
  const isRestricted =
    record.rightsConsent.publicationStatus === 'Chưa được cấp quyền';

  const dcList: Array<[string, string]> = [
    ['Title (Nhan đề)', dc.title],
    ['Identifier (Mã định danh)', dc.identifier],
    ['Creator (Tác giả)', dc.creator],
    ['Subject (Chủ đề)', dc.subject],
    ['Description (Mô tả)', dc.description],
    ['Publisher (Đơn vị phát hành)', dc.publisher],
    ['Contributor (Người đóng góp)', dc.contributor],
    ['Date (Thời gian)', dc.date],
    ['Type (Loại tư liệu)', dc.type],
    ['Format (Định dạng)', dc.format],
    ['Source (Nguồn gốc)', dc.source],
    ['Language (Ngôn ngữ)', dc.language],
    ['Relation (Liên kết)', dc.relation],
    ['Coverage (Phạm vi)', dc.coverage],
    ['Rights (Quyền)', dc.rights],
  ];

  const extList: Array<[string, string]> = [
    ['Nơi lưu giữ hiện nay', ext.currentCustodyLocation],
    ['Nơi lưu giữ tại thời điểm tư liệu', ext.historicalCustodyLocation],
    ['Loại bản đang hiển thị', ext.displayedCopyType],
    ['Tình trạng bản gốc', ext.originalCondition],
    ['Số đăng ký / Số tham khảo', ext.registrationNumber],
    ['Người cho phép công bố', ext.rightsAuthorizer],
    ['Phần không công bố', ext.restrictedPortions],
    ['Mức kiểm chứng', ext.verificationLevel],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-navy-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-3xl bg-white h-full shadow-2xl shadow-navy-950/25 border-l border-slate-200/80 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-navy-50/75 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-navy-700 font-mono font-medium">
              <span>{dc.identifier}</span>
              <span aria-hidden="true">·</span>
              <span>{dc.type}</span>
              <span aria-hidden="true">·</span>
              <span>{dc.date}</span>
            </div>
            <h2
              id="detail-drawer-title"
              className="font-display text-lg font-bold text-navy-900 mt-1 leading-snug"
            >
              {dc.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-navy-900 rounded-xl hover:bg-white transition-colors shrink-0"
            aria-label="Đóng chi tiết tư liệu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <StatusText value={record.status} />
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <StatusText value={record.backup.status} />
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <StatusText value={record.rightsConsent.publicationStatus} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCatalogSheetHTML(record)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-xl transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất phiếu mô tả</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-navy-50 border border-slate-200 rounded-xl transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(record)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-orange-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-xl transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Rights & media preview gate */}
          <section>
            <h3 className="font-display text-sm font-bold text-navy-900 mb-3">
              Bản hiển thị &amp; Tệp tin số hoá ({record.files.length})
            </h3>

            {isRestricted ? (
              <div className="p-4 bg-orange-50/90 border border-orange-200 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-semibold">
                    Tài liệu chưa được cấp quyền công bố
                  </p>
                  <p className="text-xs text-orange-800 mt-1">
                    Hệ thống tự động ẩn bản xem trước theo nguyên tắc bảo tồn:
                    &ldquo;Không hiển thị tài liệu chưa được cấp quyền&rdquo;. Vui
                    lòng cập nhật xác nhận cấp quyền tại trang Nguồn &amp; quyền
                    công bố.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {record.rightsConsent.publicationStatus ===
                  'Công bố có điều kiện' && (
                  <div className="mb-3 p-3.5 bg-navy-50 border border-navy-100 rounded-xl flex items-start gap-2.5 text-xs text-navy-900">
                    <ShieldCheck className="w-4 h-4 text-navy-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Lưu ý phần không công bố:
                      </span>{' '}
                      {ext.restrictedPortions}
                    </div>
                  </div>
                )}

                {record.files.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-navy-50/35 text-center">
                    <FileImage className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      Chưa có tệp ảnh hoặc tài liệu thực tế đính kèm
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hệ thống không sử dụng ảnh AI để thay thế tư liệu thật. Hãy tải lên bản quét/chụp thực tế tại Trung tâm số hoá.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {record.files.map((file) => {
                      const previewUrl = previews[file.id];
                      return (
                        <div
                          key={file.id}
                          className="border border-slate-200/80 rounded-xl p-3.5 bg-white shadow-card flex flex-col sm:flex-row gap-4"
                        >
                          {previewUrl ? (
                            <div className="w-full sm:w-40 h-32 bg-slate-100 rounded-xl border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                              <img
                                src={previewUrl}
                                alt={file.standardizedName}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-full sm:w-40 h-32 bg-navy-50/45 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center text-xs text-slate-500 shrink-0 p-2 text-center">
                              <FileImage className="w-6 h-6 text-slate-400 mb-1" />
                              <span>{file.format}</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-semibold text-sm text-navy-900 break-all">
                                {file.standardizedName}
                              </span>
                              <span className="text-slate-400" aria-hidden="true">
                                ·
                              </span>
                              <span
                                className={`font-medium ${
                                  file.role === 'original'
                                    ? 'text-navy-900'
                                    : 'text-navy-600'
                                }`}
                              >
                                {file.role === 'original'
                                  ? 'Bản gốc bất biến (_ORIG)'
                                  : 'Bản hiển thị (_DISP)'}
                              </span>
                            </div>
                            <p className="text-slate-600">
                              Định dạng: {file.format} · Dung lượng:{' '}
                              <span className="tabular-nums">
                                {formatFileSize(file.sizeBytes)}
                              </span>
                              {file.widthPx && file.heightPx
                                ? ` · ${file.widthPx}×${file.heightPx} px`
                                : ''}
                            </p>
                            <p className="text-slate-500 font-mono text-[11px] break-all">
                              SHA-256: {file.sha256}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Unverified custody warning */}
          {!record.backup.originalLocationVerified && (
            <div className="p-3.5 bg-orange-50/90 border border-orange-200 rounded-xl flex items-start gap-2.5 text-xs text-orange-900">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  Cảnh báo xác minh bản gốc:
                </span>{' '}
                Vị trí lưu giữ hiện nay của bản gốc chưa được xác minh thực địa. Không tự ghi nhận vị trí bảo quản nếu chưa đối chiếu thực tế.
              </div>
            </div>
          )}

          {/* 15 Dublin Core Fields */}
          <section>
            <h3 className="font-display text-sm font-bold text-navy-900 mb-3">
              Bộ 15 trường chuẩn Dublin Core
            </h3>
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-200/80 shadow-card">
              {dcList.map(([label, val]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 sm:grid-cols-3 text-sm"
                >
                  <div className="px-4 py-2.5 bg-navy-50/55 font-medium text-navy-900 text-xs sm:border-r border-slate-200/80">
                    {label}
                  </div>
                  <div
                    className={`sm:col-span-2 px-4 py-2.5 text-xs leading-relaxed ${
                      val.toLowerCase().includes('chưa xác định')
                        ? 'text-orange-700 font-medium'
                        : 'text-slate-800'
                    }`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 8 Extended Fields */}
          <section>
            <h3 className="font-display text-sm font-bold text-navy-900 mb-3">
              Thông tin bảo quản &amp; kiểm chứng mở rộng (8 trường)
            </h3>
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-200/80 shadow-card">
              {extList.map(([label, val]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 sm:grid-cols-3 text-sm"
                >
                  <div className="px-4 py-2.5 bg-navy-50/55 font-medium text-navy-900 text-xs sm:border-r border-slate-200/80">
                    {label}
                  </div>
                  <div
                    className={`sm:col-span-2 px-4 py-2.5 text-xs leading-relaxed ${
                      val.toLowerCase().includes('chưa xác định')
                        ? 'text-orange-700 font-medium'
                        : 'text-slate-800'
                    }`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
