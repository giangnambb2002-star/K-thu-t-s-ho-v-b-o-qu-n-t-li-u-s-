import { useEffect, useState } from 'react';
import { AlertCircle, Sparkles, X } from 'lucide-react';
import {
  ArchiveRecord,
  DisplayedCopyType,
  DocumentType,
  DublinCoreMetadata,
  ExtendedArchivalMetadata,
  PublicationStatus,
  RecordStatus,
  VerificationLevel,
} from '../types/archive';
import { generateArchivalIdentifier } from '../services/cryptoAndFileService';

const DOC_TYPES: DocumentType[] = [
  'Văn bản hành chính',
  'Bản thảo viết tay',
  'Ảnh tư liệu',
  'Bản đồ - Bản vẽ',
  'Ấn phẩm - Sách cổ',
  'Hồ sơ nghiên cứu',
  'Khác',
];

const COPY_TYPES: DisplayedCopyType[] = [
  'Bản số',
  'Bản sao',
  'Bản gốc',
  'Chưa xác định',
];

const VERIFICATION_LEVELS: VerificationLevel[] = [
  'Đã xác minh thực địa',
  'Đã đối chiếu hồ sơ',
  'Chờ xác minh',
  'Chưa xác định',
];

const PUBLICATION_STATUSES: PublicationStatus[] = [
  'Được phép công bố',
  'Công bố có điều kiện',
  'Chưa được cấp quyền',
];

const RECORD_STATUSES: RecordStatus[] = [
  'Mới tiếp nhận',
  'Đã số hoá',
  'Đã kiểm tra',
  'Cần chụp lại',
  'Đã sao lưu',
];

interface ArchiveFormModalProps {
  open: boolean;
  initialRecord: ArchiveRecord | null;
  existingIdentifiers: string[];
  onClose: () => void;
  onSave: (record: ArchiveRecord, isNew: boolean) => Promise<void>;
}

const emptyDublinCore = (): DublinCoreMetadata => ({
  title: '',
  creator: '',
  subject: '',
  description: '',
  publisher: '',
  contributor: '',
  date: '',
  type: 'Văn bản hành chính',
  format: '',
  identifier: '',
  source: '',
  language: 'vi',
  relation: '',
  coverage: '',
  rights: '',
});

const emptyExtended = (): ExtendedArchivalMetadata => ({
  currentCustodyLocation: '',
  historicalCustodyLocation: '',
  displayedCopyType: 'Chưa xác định',
  originalCondition: '',
  registrationNumber: '',
  rightsAuthorizer: '',
  restrictedPortions: '',
  verificationLevel: 'Chưa xác định',
});

export function ArchiveFormModal({
  open,
  initialRecord,
  existingIdentifiers,
  onClose,
  onSave,
}: ArchiveFormModalProps) {
  const isEditing = Boolean(initialRecord);
  const [dc, setDc] = useState<DublinCoreMetadata>(emptyDublinCore());
  const [ext, setExt] = useState<ExtendedArchivalMetadata>(emptyExtended());
  const [status, setStatus] = useState<RecordStatus>('Mới tiếp nhận');
  const [pubStatus, setPubStatus] =
    useState<PublicationStatus>('Chưa được cấp quyền');
  const [providingOrg, setProvidingOrg] = useState('');
  const [allowedScope, setAllowedScope] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialRecord) {
      setDc({ ...initialRecord.dublinCore });
      setExt({ ...initialRecord.extended });
      setStatus(initialRecord.status);
      setPubStatus(initialRecord.rightsConsent.publicationStatus);
      setProvidingOrg(initialRecord.rightsConsent.providingOrganization);
      setAllowedScope(initialRecord.rightsConsent.allowedScope);
    } else {
      const fresh = emptyDublinCore();
      fresh.identifier = generateArchivalIdentifier(
        fresh.type,
        String(new Date().getFullYear()),
        existingIdentifiers
      );
      setDc(fresh);
      setExt(emptyExtended());
      setStatus('Mới tiếp nhận');
      setPubStatus('Chưa được cấp quyền');
      setProvidingOrg('');
      setAllowedScope('');
    }
    setErrors([]);
  }, [open, initialRecord, existingIdentifiers]);

  if (!open) return null;

  const setDcField = (key: keyof DublinCoreMetadata, val: string) => {
    setDc((prev) => ({ ...prev, [key]: val }));
  };

  const setExtField = <K extends keyof ExtendedArchivalMetadata>(
    key: K,
    val: ExtendedArchivalMetadata[K]
  ) => {
    setExt((prev) => ({ ...prev, [key]: val }));
  };

  const handleAutoId = () => {
    const filteredIds = initialRecord
      ? existingIdentifiers.filter(
          (i) => i !== initialRecord.dublinCore.identifier
        )
      : existingIdentifiers;
    const generated = generateArchivalIdentifier(dc.type, dc.date, filteredIds);
    setDcField('identifier', generated);
  };

  const validateAllRequired = (): string[] => {
    const missing: string[] = [];
    const dcLabels: Record<keyof DublinCoreMetadata, string> = {
      title: 'Title (Nhan đề)',
      creator: 'Creator (Tác giả / Đơn vị tạo lập)',
      subject: 'Subject (Chủ đề)',
      description: 'Description (Mô tả)',
      publisher: 'Publisher (Đơn vị phát hành / Lưu giữ)',
      contributor: 'Contributor (Người đóng góp)',
      date: 'Date (Thời gian tư liệu)',
      type: 'Type (Loại tư liệu)',
      format: 'Format (Định dạng)',
      identifier: 'Identifier (Mã định danh)',
      source: 'Source (Nguồn gốc)',
      language: 'Language (Ngôn ngữ)',
      relation: 'Relation (Quan hệ bộ sưu tập)',
      coverage: 'Coverage (Phạm vi)',
      rights: 'Rights (Quyền sử dụng)',
    };

    (Object.keys(dcLabels) as Array<keyof DublinCoreMetadata>).forEach((k) => {
      if (!dc[k] || !dc[k].trim()) {
        missing.push(`Thiếu trường Dublin Core bắt buộc: ${dcLabels[k]}`);
      }
    });

    const extLabels: Record<keyof ExtendedArchivalMetadata, string> = {
      currentCustodyLocation: 'Nơi lưu giữ hiện nay',
      historicalCustodyLocation: 'Nơi lưu giữ tại thời điểm tư liệu',
      displayedCopyType: 'Loại bản đang hiển thị',
      originalCondition: 'Tình trạng bản gốc',
      registrationNumber: 'Số đăng ký hoặc số tham khảo',
      rightsAuthorizer: 'Người cho phép công bố',
      restrictedPortions: 'Phần không công bố',
      verificationLevel: 'Mức kiểm chứng',
    };

    (Object.keys(extLabels) as Array<keyof ExtendedArchivalMetadata>).forEach(
      (k) => {
        if (!ext[k] || !String(ext[k]).trim()) {
          missing.push(`Thiếu trường bổ sung bắt buộc: ${extLabels[k]}`);
        }
      }
    );

    const normalizedId = dc.identifier.trim().toUpperCase();
    const otherIds = initialRecord
      ? existingIdentifiers.filter(
          (id) =>
            id.toUpperCase() !==
            initialRecord.dublinCore.identifier.toUpperCase()
        )
      : existingIdentifiers;
    if (
      normalizedId &&
      otherIds.some((id) => id.toUpperCase() === normalizedId)
    ) {
      missing.push(`Mã định danh "${dc.identifier}" đã tồn tại trong kho tư liệu.`);
    }

    return missing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAllRequired();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const normalizedDc: DublinCoreMetadata = {
        ...dc,
        identifier: dc.identifier.trim(),
        title: dc.title.trim(),
      };
      const nextRecord: ArchiveRecord = initialRecord
        ? {
            ...initialRecord,
            dublinCore: normalizedDc,
            extended: { ...ext },
            status,
            backup: {
              ...initialRecord.backup,
              originalStorageLocation: ext.currentCustodyLocation,
              originalLocationVerified:
                ext.verificationLevel === 'Đã xác minh thực địa' &&
                !ext.currentCustodyLocation
                  .toLowerCase()
                  .includes('chưa xác định'),
            },
            rightsConsent: {
              ...initialRecord.rightsConsent,
              providingOrganization:
                providingOrg.trim() ||
                initialRecord.rightsConsent.providingOrganization ||
                'Chưa xác định',
              authorizerName: ext.rightsAuthorizer,
              allowedScope:
                allowedScope.trim() ||
                initialRecord.rightsConsent.allowedScope ||
                dc.rights,
              restrictedPortions: ext.restrictedPortions,
              publicationStatus: pubStatus,
            },
            updatedAt: now,
          }
        : {
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            dublinCore: normalizedDc,
            extended: { ...ext },
            status,
            files: [],
            backup: {
              originalStorageLocation: ext.currentCustodyLocation,
              originalLocationVerified:
                ext.verificationLevel === 'Đã xác minh thực địa' &&
                !ext.currentCustodyLocation
                  .toLowerCase()
                  .includes('chưa xác định'),
              backupLocation1: '',
              backupLocation2: '',
              backupDate: '',
              humanConfirmed: false,
              confirmedBy: '',
              status: 'Chưa sao lưu',
              notes: '',
            },
            rightsConsent: {
              providingOrganization: providingOrg.trim() || 'Chưa xác định',
              authorizerName: ext.rightsAuthorizer,
              authorizerRole: 'Chưa xác định',
              consentDate: 'Chưa xác định',
              allowedScope: allowedScope.trim() || dc.rights,
              referenceSource: dc.source,
              restrictedPortions: ext.restrictedPortions,
              publicationStatus: pubStatus,
            },
            createdAt: now,
            updatedAt: now,
          };

      await onSave(nextRecord, !isEditing);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const renderInputWithUnknownHelper = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    allowUnknown = true,
    multiline = false
  ) => (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-xs font-semibold text-slate-700">
          {label} <span className="text-orange-600">*</span>
        </label>
        {allowUnknown && (
          <button
            type="button"
            onClick={() => onChange('Chưa xác định')}
            className="text-xs font-medium text-navy-700 hover:text-navy-900 hover:underline whitespace-nowrap"
          >
            Điền &ldquo;Chưa xác định&rdquo;
          </button>
        )}
      </div>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
        />
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 backdrop-blur-xs p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-form-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-navy-950/25 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200/80 bg-navy-50/75 shrink-0">
          <div>
            <h2
              id="archive-form-title"
              className="font-display text-lg font-bold text-navy-900"
            >
              {isEditing
                ? `Chỉnh sửa hồ sơ tư liệu · ${initialRecord?.dublinCore.identifier}`
                : 'Thêm bản ghi tư liệu chuẩn Dublin Core'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Bắt buộc nhập đủ 15 trường Dublin Core và 8 trường bảo quản mở rộng. Trường chưa rõ thông tin phải ghi &ldquo;Chưa xác định&rdquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-navy-900 rounded-xl hover:bg-white transition-colors"
            aria-label="Đóng biểu mẫu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {errors.length > 0 && (
            <div className="p-4 bg-orange-50/90 border border-orange-200 rounded-xl text-sm text-orange-900">
              <div className="flex items-center gap-2 font-semibold mb-1.5">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>
                  Không thể lưu do còn {errors.length} thông tin bắt buộc chưa hợp lệ:
                </span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                {errors.slice(0, 8).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 8 && (
                  <li>...và {errors.length - 8} trường khác chưa được điền.</li>
                )}
              </ul>
            </div>
          )}

          {/* Section 1: 15 Dublin Core Fields */}
          <section>
            <div className="pb-2 mb-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-navy-900">
                1. Bộ 15 trường chuẩn Dublin Core
              </h3>
              <span className="text-xs text-slate-500">
                Bắt buộc đầy đủ mọi trường
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                {renderInputWithUnknownHelper(
                  '1. Title (Nhan đề tư liệu)',
                  dc.title,
                  (v) => setDcField('title', v),
                  'Nhập tiêu đề chính xác của tài liệu',
                  false
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    2. Identifier (Mã định danh) <span className="text-orange-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoId}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 hover:underline whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sinh mã tự động</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={dc.identifier}
                  onChange={(e) => setDcField('identifier', e.target.value)}
                  placeholder="Ví dụ: DA-VB-1978-001"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-navy-50/45 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Type (Loại tư liệu) <span className="text-orange-600">*</span>
                </label>
                <select
                  value={dc.type}
                  onChange={(e) => setDcField('type', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {renderInputWithUnknownHelper(
                '4. Creator (Tác giả / Cơ quan tạo lập)',
                dc.creator,
                (v) => setDcField('creator', v),
                'Tên tác giả, nhiếp ảnh gia hoặc cơ quan ban hành'
              )}

              {renderInputWithUnknownHelper(
                '5. Date (Ngày / Năm của tư liệu)',
                dc.date,
                (v) => setDcField('date', v),
                'Ví dụ: 1978 hoặc 1986-05-12'
              )}

              {renderInputWithUnknownHelper(
                '6. Subject (Chủ đề / Từ khoá)',
                dc.subject,
                (v) => setDcField('subject', v),
                'Phân cách bằng dấu chấm phẩy (;)'
              )}

              {renderInputWithUnknownHelper(
                '7. Format (Định dạng vật lý / số)',
                dc.format,
                (v) => setDcField('format', v),
                'Ví dụ: Giấy A4 / TIFF 600 DPI & JPEG'
              )}

              {renderInputWithUnknownHelper(
                '8. Publisher (Đơn vị phát hành / Quản lý)',
                dc.publisher,
                (v) => setDcField('publisher', v),
                'Cơ quan xuất bản hoặc đơn vị chủ quản số hoá'
              )}

              {renderInputWithUnknownHelper(
                '9. Contributor (Người đóng góp / Số hoá)',
                dc.contributor,
                (v) => setDcField('contributor', v),
                'Cá nhân hoặc nhóm biên mục, đóng góp'
              )}

              {renderInputWithUnknownHelper(
                '10. Source (Nguồn gốc tài liệu)',
                dc.source,
                (v) => setDcField('source', v),
                'Số hộp, ký hiệu phông lưu trữ hoặc đơn vị trao tặng'
              )}

              {renderInputWithUnknownHelper(
                '11. Language (Ngôn ngữ)',
                dc.language,
                (v) => setDcField('language', v),
                'Ví dụ: vi, fr, zh-Hani'
              )}

              {renderInputWithUnknownHelper(
                '12. Relation (Liên kết bộ sưu tập)',
                dc.relation,
                (v) => setDcField('relation', v),
                'Tên bộ sưu tập hoặc hồ sơ liên quan'
              )}

              {renderInputWithUnknownHelper(
                '13. Coverage (Phạm vi thời gian / không gian)',
                dc.coverage,
                (v) => setDcField('coverage', v),
                'Địa danh, giai đoạn lịch sử được đề cập'
              )}

              <div className="md:col-span-2">
                {renderInputWithUnknownHelper(
                  '14. Description (Mô tả nội dung tư liệu)',
                  dc.description,
                  (v) => setDcField('description', v),
                  'Tóm tắt nội dung, đặc điểm hình thức và ngữ cảnh lịch sử của tư liệu',
                  false,
                  true
                )}
              </div>

              <div className="md:col-span-2">
                {renderInputWithUnknownHelper(
                  '15. Rights (Điều khoản quyền sử dụng)',
                  dc.rights,
                  (v) => setDcField('rights', v),
                  'Ví dụ: Chỉ phục vụ nghiên cứu học thuật phi thương mại tại chỗ'
                )}
              </div>
            </div>
          </section>

          {/* Section 2: 8 Extended Mandatory Fields */}
          <section>
            <div className="pb-2 mb-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-navy-900">
                2. Các trường bảo quản &amp; kiểm chứng bắt buộc (8 trường)
              </h3>
              <span className="text-xs text-slate-500">
                Không tự suy đoán nơi lưu bản gốc nếu chưa kiểm chứng
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInputWithUnknownHelper(
                'Nơi lưu giữ hiện nay',
                ext.currentCustodyLocation,
                (v) => setExtField('currentCustodyLocation', v),
                'Ghi rõ phòng/tủ/hộp nếu đã xác minh thực tế'
              )}

              {renderInputWithUnknownHelper(
                'Nơi lưu giữ tại thời điểm tư liệu',
                ext.historicalCustodyLocation,
                (v) => setExtField('historicalCustodyLocation', v),
                'Nơi lưu giữ ban đầu được ghi nhận trên hồ sơ'
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại bản đang hiển thị <span className="text-orange-600">*</span>
                </label>
                <select
                  value={ext.displayedCopyType}
                  onChange={(e) =>
                    setExtField(
                      'displayedCopyType',
                      e.target.value as DisplayedCopyType
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {COPY_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức kiểm chứng <span className="text-orange-600">*</span>
                </label>
                <select
                  value={ext.verificationLevel}
                  onChange={(e) =>
                    setExtField(
                      'verificationLevel',
                      e.target.value as VerificationLevel
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {VERIFICATION_LEVELS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {renderInputWithUnknownHelper(
                'Số đăng ký hoặc số tham khảo',
                ext.registrationNumber,
                (v) => setExtField('registrationNumber', v),
                'Ví dụ: ĐK-1978-001'
              )}

              {renderInputWithUnknownHelper(
                'Người cho phép công bố',
                ext.rightsAuthorizer,
                (v) => setExtField('rightsAuthorizer', v),
                'Họ tên & chức danh người có thẩm quyền ký duyệt'
              )}

              <div className="md:col-span-2">
                {renderInputWithUnknownHelper(
                  'Tình trạng bản gốc',
                  ext.originalCondition,
                  (v) => setExtField('originalCondition', v),
                  'Mô tả tình trạng vật lý: nguyên vẹn, ố vàng, rách mép, phai mực...'
                )}
              </div>

              <div className="md:col-span-2">
                {renderInputWithUnknownHelper(
                  'Phần không công bố',
                  ext.restrictedPortions,
                  (v) => setExtField('restrictedPortions', v),
                  'Ghi rõ trang/phần bị hạn chế hoặc ghi "Không có"'
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Workflow & Publication Gate */}
          <section>
            <div className="pb-2 mb-4 border-b border-slate-200/80">
              <h3 className="font-display text-sm font-bold text-navy-900">
                3. Trạng thái xử lý &amp; Cấp quyền hiển thị
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái số hoá
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RecordStatus)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {RECORD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái quyền công bố
                </label>
                <select
                  value={pubStatus}
                  onChange={(e) =>
                    setPubStatus(e.target.value as PublicationStatus)
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {PUBLICATION_STATUSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổ chức cung cấp tư liệu
                </label>
                <input
                  type="text"
                  value={providingOrg}
                  onChange={(e) => setProvidingOrg(e.target.value)}
                  placeholder="Để trống sẽ ghi nhận là Chưa xác định"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phạm vi được phép sử dụng
                </label>
                <input
                  type="text"
                  value={allowedScope}
                  onChange={(e) => setAllowedScope(e.target.value)}
                  placeholder="Ví dụ: Nghiên cứu và giảng dạy phi thương mại"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-navy-50/55 border-t border-slate-200/80 shrink-0">
          <span className="text-xs text-slate-500">
            Mọi trường có dấu <span className="text-orange-600">*</span> là bắt buộc.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 disabled:opacity-60 rounded-xl shadow-navy transition-all"
            >
              {saving
                ? 'Đang lưu hồ sơ...'
                : isEditing
                  ? 'Lưu thay đổi'
                  : 'Tạo bản ghi tư liệu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
