import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  ArchivalFileAsset,
  ArchiveRecord,
  DisplayedCopyType,
  DocumentType,
  PublicationStatus,
  VerificationLevel,
} from '../types/archive';
import {
  computeSHA256,
  formatFileSize,
  generateArchivalIdentifier,
  generateStandardizedFileName,
  getFileExtension,
  inspectImageProgrammatically,
  readFileAsDataUrl,
} from '../services/cryptoAndFileService';
import { storageService } from '../services/storageService';

const DOC_TYPES: DocumentType[] = [
  'Văn bản hành chính',
  'Bản thảo viết tay',
  'Ảnh tư liệu',
  'Bản đồ - Bản vẽ',
  'Ấn phẩm - Sách cổ',
  'Hồ sơ nghiên cứu',
  'Khác',
];

interface DigitizationCenterPageProps {
  records: ArchiveRecord[];
  onCompleteDigitization: (
    record: ArchiveRecord,
    isExisting: boolean
  ) => Promise<void>;
  onNavigateToRepository: () => void;
}

interface PendingUpload {
  file: File;
  dataUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  estimatedDpi: number | null;
  sha256: string;
}

export function DigitizationCenterPage({
  records,
  onCompleteDigitization,
  onNavigateToRepository,
}: DigitizationCenterPageProps) {
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingId, setSelectedExistingId] = useState<string>(
    records[0]?.id || ''
  );

  // Tệp gốc & tệp hiển thị tách biệt
  const [originalUpload, setOriginalUpload] = useState<PendingUpload | null>(
    null
  );
  const [displayUpload, setDisplayUpload] = useState<PendingUpload | null>(
    null
  );
  const [alsoCreateDisplayFromOriginal, setAlsoCreateDisplayFromOriginal] =
    useState<boolean>(true);

  // Thông tin phân loại & Dublin Core + 8 trường mở rộng cho bản ghi mới
  const [docType, setDocType] = useState<DocumentType>('Văn bản hành chính');
  const [docYear, setDocYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [identifier, setIdentifier] = useState<string>(() =>
    generateArchivalIdentifier(
      'Văn bản hành chính',
      String(new Date().getFullYear()),
      records.map((r) => r.dublinCore.identifier)
    )
  );
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [publisher, setPublisher] = useState('');
  const [contributor, setContributor] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('vi');
  const [relation, setRelation] = useState('');
  const [coverage, setCoverage] = useState('');
  const [rights, setRights] = useState('');

  // 8 trường mở rộng bắt buộc
  const [currentCustodyLocation, setCurrentCustodyLocation] = useState('');
  const [historicalCustodyLocation, setHistoricalCustodyLocation] =
    useState('');
  const [displayedCopyType, setDisplayedCopyType] =
    useState<DisplayedCopyType>('Bản số');
  const [originalCondition, setOriginalCondition] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [rightsAuthorizer, setRightsAuthorizer] = useState('');
  const [restrictedPortions, setRestrictedPortions] = useState('');
  const [verificationLevel, setVerificationLevel] =
    useState<VerificationLevel>('Chờ xác minh');
  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>('Chưa được cấp quyền');

  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0 idle, 1..4 steps, 5 done
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const existingIdentifiers = records.map((r) => r.dublinCore.identifier);
  const allExistingFileNames = records.flatMap((r) =>
    r.files.map((f) => f.standardizedName)
  );

  const handleRegenerateId = (nextType = docType, nextYear = docYear) => {
    setIdentifier(
      generateArchivalIdentifier(nextType, nextYear, existingIdentifiers)
    );
  };

  const processSelectedFile = async (
    file: File,
    role: 'original' | 'display'
  ) => {
    setErrorMsg(null);
    setSuccessInfo(null);
    try {
      const sha256 = await computeSHA256(file);
      let dataUrl = '';
      let widthPx: number | null = null;
      let heightPx: number | null = null;
      let estimatedDpi: number | null = null;

      if (file.type.startsWith('image/')) {
        try {
          const inspected = await inspectImageProgrammatically(file);
          dataUrl = inspected.dataUrl;
          widthPx = inspected.metrics.widthPx;
          heightPx = inspected.metrics.heightPx;
          estimatedDpi = inspected.metrics.estimatedDpiA4;
        } catch {
          dataUrl = await readFileAsDataUrl(file);
        }
      } else {
        dataUrl = await readFileAsDataUrl(file);
      }

      const pending: PendingUpload = {
        file,
        dataUrl,
        widthPx,
        heightPx,
        estimatedDpi,
        sha256,
      };
      if (role === 'original') {
        setOriginalUpload(pending);
      } else {
        setDisplayUpload(pending);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể xử lý tệp tải lên.'
      );
    }
  };

  const handleRunDigitization = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!originalUpload && !displayUpload) {
      setErrorMsg(
        'Vui lòng tải lên ít nhất một tệp bản gốc (_ORIG) hoặc tệp bản hiển thị (_DISP).'
      );
      return;
    }

    if (targetMode === 'new') {
      const requiredFields: Array<[string, string]> = [
        ['Nhan đề (Title)', title],
        ['Mã định danh (Identifier)', identifier],
        ['Tác giả (Creator)', creator],
        ['Chủ đề (Subject)', subject],
        ['Mô tả (Description)', description],
        ['Đơn vị phát hành (Publisher)', publisher],
        ['Người đóng góp (Contributor)', contributor],
        ['Thời gian tư liệu (Date)', docYear],
        ['Nguồn gốc (Source)', source],
        ['Ngôn ngữ (Language)', language],
        ['Liên kết (Relation)', relation],
        ['Phạm vi (Coverage)', coverage],
        ['Quyền sử dụng (Rights)', rights],
        ['Nơi lưu giữ hiện nay', currentCustodyLocation],
        ['Nơi lưu giữ tại thời điểm tư liệu', historicalCustodyLocation],
        ['Tình trạng bản gốc', originalCondition],
        ['Số đăng ký / tham khảo', registrationNumber],
        ['Người cho phép công bố', rightsAuthorizer],
        ['Phần không công bố', restrictedPortions],
      ];

      const missing = requiredFields
        .filter(([, val]) => !val || !val.trim())
        .map(([label]) => label);

      if (missing.length > 0) {
        setErrorMsg(
          `Không thể số hoá khi thiếu các trường bắt buộc: ${missing.join(', ')}. (Nếu chưa rõ, hãy điền "Chưa xác định").`
        );
        return;
      }

      if (
        existingIdentifiers.some(
          (id) => id.toUpperCase() === identifier.trim().toUpperCase()
        )
      ) {
        setErrorMsg(
          `Mã định danh "${identifier}" đã tồn tại. Hãy bấm "Sinh mã tự động" để tạo mã mới.`
        );
        return;
      }
    }

    const targetRecord =
      targetMode === 'existing'
        ? records.find((r) => r.id === selectedExistingId)
        : null;

    if (targetMode === 'existing' && !targetRecord) {
      setErrorMsg('Không tìm thấy hồ sơ tư liệu được chọn để đính kèm tệp.');
      return;
    }

    try {
      setPipelineStep(1);
      await new Promise((r) => setTimeout(r, 180));

      setPipelineStep(2);
      const activeIdentifier =
        targetMode === 'existing'
          ? targetRecord!.dublinCore.identifier
          : identifier.trim();
      const recordId =
        targetMode === 'existing'
          ? targetRecord!.id
          : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const createdFiles: ArchivalFileAsset[] = [];
      const tempNames = [...allExistingFileNames];
      const now = new Date().toISOString();

      let origFileId: string | undefined;

      setPipelineStep(3);
      if (originalUpload) {
        const stdOrigName = generateStandardizedFileName(
          activeIdentifier,
          'original',
          originalUpload.file.name,
          originalUpload.file.type,
          tempNames
        );
        tempNames.push(stdOrigName);
        origFileId = `file-${Date.now()}-orig`;
        const mediaKey = `${recordId}_${origFileId}`;
        await storageService.saveMediaDataUrl(mediaKey, originalUpload.dataUrl);

        createdFiles.push({
          id: origFileId,
          recordId,
          role: 'original',
          originalUploadedName: originalUpload.file.name,
          standardizedName: stdOrigName,
          format:
            originalUpload.file.type ||
            getFileExtension(
              originalUpload.file.name,
              originalUpload.file.type
            ).toUpperCase(),
          mimeType: originalUpload.file.type || 'application/octet-stream',
          sizeBytes: originalUpload.file.size,
          widthPx: originalUpload.widthPx,
          heightPx: originalUpload.heightPx,
          estimatedDpi: originalUpload.estimatedDpi,
          sha256: originalUpload.sha256,
          createdAt: now,
          mediaStorageKey: mediaKey,
          isImmutableOriginal: true,
        });
      }

      if (displayUpload) {
        const stdDispName = generateStandardizedFileName(
          activeIdentifier,
          'display',
          displayUpload.file.name,
          displayUpload.file.type,
          tempNames
        );
        tempNames.push(stdDispName);
        const dispId = `file-${Date.now()}-disp`;
        const mediaKey = `${recordId}_${dispId}`;
        await storageService.saveMediaDataUrl(mediaKey, displayUpload.dataUrl);

        createdFiles.push({
          id: dispId,
          recordId,
          role: 'display',
          originalUploadedName: displayUpload.file.name,
          standardizedName: stdDispName,
          format:
            displayUpload.file.type ||
            getFileExtension(
              displayUpload.file.name,
              displayUpload.file.type
            ).toUpperCase(),
          mimeType: displayUpload.file.type || 'application/octet-stream',
          sizeBytes: displayUpload.file.size,
          widthPx: displayUpload.widthPx,
          heightPx: displayUpload.heightPx,
          estimatedDpi: displayUpload.estimatedDpi,
          sha256: displayUpload.sha256,
          createdAt: now,
          mediaStorageKey: mediaKey,
          isImmutableOriginal: false,
          derivedFromFileId: origFileId,
        });
      } else if (originalUpload && alsoCreateDisplayFromOriginal) {
        const stdDispName = generateStandardizedFileName(
          activeIdentifier,
          'display',
          originalUpload.file.name,
          originalUpload.file.type,
          tempNames
        );
        const dispId = `file-${Date.now()}-disp-copy`;
        const mediaKey = `${recordId}_${dispId}`;
        await storageService.saveMediaDataUrl(mediaKey, originalUpload.dataUrl);

        createdFiles.push({
          id: dispId,
          recordId,
          role: 'display',
          originalUploadedName: originalUpload.file.name,
          standardizedName: stdDispName,
          format:
            originalUpload.file.type ||
            getFileExtension(
              originalUpload.file.name,
              originalUpload.file.type
            ).toUpperCase(),
          mimeType: originalUpload.file.type || 'application/octet-stream',
          sizeBytes: originalUpload.file.size,
          widthPx: originalUpload.widthPx,
          heightPx: originalUpload.heightPx,
          estimatedDpi: originalUpload.estimatedDpi,
          sha256: originalUpload.sha256,
          createdAt: now,
          mediaStorageKey: mediaKey,
          isImmutableOriginal: false,
          derivedFromFileId: origFileId,
        });
      }

      setPipelineStep(4);
      const formatSummary = createdFiles
        .map((f) => f.format)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(' / ');

      const nextRecord: ArchiveRecord =
        targetMode === 'existing'
          ? {
              ...targetRecord!,
              files: [...targetRecord!.files, ...createdFiles],
              status:
                targetRecord!.status === 'Mới tiếp nhận'
                  ? 'Đã số hoá'
                  : targetRecord!.status,
              updatedAt: now,
            }
          : {
              id: recordId,
              dublinCore: {
                title: title.trim(),
                creator: creator.trim(),
                subject: subject.trim(),
                description: description.trim(),
                publisher: publisher.trim(),
                contributor: contributor.trim(),
                date: docYear.trim(),
                type: docType,
                format: formatSummary || 'Tệp số lưu trữ',
                identifier: activeIdentifier,
                source: source.trim(),
                language: language.trim(),
                relation: relation.trim(),
                coverage: coverage.trim(),
                rights: rights.trim(),
              },
              extended: {
                currentCustodyLocation: currentCustodyLocation.trim(),
                historicalCustodyLocation: historicalCustodyLocation.trim(),
                displayedCopyType,
                originalCondition: originalCondition.trim(),
                registrationNumber: registrationNumber.trim(),
                rightsAuthorizer: rightsAuthorizer.trim(),
                restrictedPortions: restrictedPortions.trim(),
                verificationLevel,
              },
              status: 'Đã số hoá',
              files: createdFiles,
              backup: {
                originalStorageLocation: currentCustodyLocation.trim(),
                originalLocationVerified:
                  verificationLevel === 'Đã xác minh thực địa' &&
                  !currentCustodyLocation
                    .toLowerCase()
                    .includes('chưa xác định'),
                backupLocation1: '',
                backupLocation2: '',
                backupDate: '',
                humanConfirmed: false,
                confirmedBy: '',
                status: 'Chưa sao lưu',
                notes: 'Mới tiếp nhận số hoá, cần thực hiện sao lưu 2 bản.',
              },
              rightsConsent: {
                providingOrganization: publisher.trim(),
                authorizerName: rightsAuthorizer.trim(),
                authorizerRole: 'Chưa xác định',
                consentDate: 'Chưa xác định',
                allowedScope: rights.trim(),
                referenceSource: source.trim(),
                restrictedPortions: restrictedPortions.trim(),
                publicationStatus,
              },
              createdAt: now,
              updatedAt: now,
            };

      await onCompleteDigitization(nextRecord, targetMode === 'existing');
      setPipelineStep(5);
      setSuccessInfo(
        `Đã hoàn tất số hoá cho mã ${activeIdentifier} với ${createdFiles.length} tệp tin (${createdFiles
          .map((f) => f.standardizedName)
          .join(', ')}).`
      );
      setOriginalUpload(null);
      setDisplayUpload(null);
    } catch (err) {
      setPipelineStep(0);
      setErrorMsg(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu số hoá.'
      );
    }
  };

  const steps = [
    'Đọc tệp & đo thông số hình ảnh',
    'Tính mã kiểm toàn vẹn SHA-256',
    'Chuẩn hoá tên tệp gốc & bản hiển thị',
    'Lưu trữ vào IndexedDB & cập nhật kho',
  ];

  const fillUnknownDefaults = () => {
    if (!creator) setCreator('Chưa xác định');
    if (!contributor) setContributor('Chưa xác định');
    if (!source) setSource('Chưa xác định');
    if (!relation) setRelation('Chưa xác định');
    if (!coverage) setCoverage('Chưa xác định');
    if (!currentCustodyLocation) setCurrentCustodyLocation('Chưa xác định');
    if (!historicalCustodyLocation)
      setHistoricalCustodyLocation('Chưa xác định');
    if (!originalCondition) setOriginalCondition('Chưa xác định');
    if (!registrationNumber) setRegistrationNumber('Chưa xác định');
    if (!rightsAuthorizer) setRightsAuthorizer('Chưa xác định');
    if (!restrictedPortions) setRestrictedPortions('Chưa xác định');
  };

  return (
    <div className="space-y-6">
      {/* Mode selector & Pipeline overview */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">
            Tiếp nhận &amp; Số hoá tư liệu mới
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Phân tách tệp gốc bất biến (_ORIG) và tệp hiển thị (_DISP), tự động cấp mã định danh và sinh chữ ký toàn vẹn SHA-256.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-navy-50 rounded-xl self-start border border-navy-100">
          <button
            type="button"
            onClick={() => setTargetMode('new')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              targetMode === 'new'
                ? 'bg-white text-navy-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Tạo hồ sơ mới
          </button>
          <button
            type="button"
            onClick={() => setTargetMode('existing')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              targetMode === 'existing'
                ? 'bg-white text-navy-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Đính kèm vào hồ sơ có sẵn
          </button>
        </div>
      </div>

      {/* Processing Pipeline Progress Bar */}
      {pipelineStep > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-semibold text-navy-900 mb-3">
            Tiến trình xử lý số hoá
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {steps.map((label, idx) => {
              const stepNum = idx + 1;
              const done = pipelineStep > stepNum || pipelineStep === 5;
              const active = pipelineStep === stepNum;
              return (
                <div
                  key={label}
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-colors ${
                    done
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-xs'
                      : active
                        ? 'bg-navy-50 border-navy-200 text-navy-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-navy-700 animate-spin shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center font-mono text-[10px] shrink-0">
                      {stepNum}
                    </span>
                  )}
                  <span className="font-medium">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl shadow-card flex items-start gap-2.5 text-sm text-orange-900">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-emerald-900">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successInfo}</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToRepository}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors whitespace-nowrap self-start shadow-xs"
          >
            Xem trong Kho tư liệu
          </button>
        </div>
      )}

      <form onSubmit={handleRunDigitization} className="space-y-6">
        {/* Step 1: Upload Original & Display Files */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Original file upload */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-display text-sm font-bold text-navy-900">
                Tệp gốc bảo quản (_ORIG)
              </h3>
              <span className="text-xs text-slate-500">Không chỉnh sửa đè</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tệp thu nhận trực tiếp từ máy quét/máy ảnh (TIFF, PNG, JPEG, PDF). Giữ nguyên vẹn dữ liệu gốc.
            </p>

            <label className="block border-2 border-dashed border-slate-200 hover:border-navy-600 rounded-xl p-6 text-center cursor-pointer bg-navy-50/40 hover:bg-navy-50/80 transition-all">
              <span className="w-11 h-11 rounded-xl bg-white text-navy-900 shadow-sm border border-navy-100 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </span>
              <span className="block text-sm font-semibold text-navy-900">
                Chọn tệp bản gốc từ thiết bị
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                Hỗ trợ PNG, JPEG, WebP, TIFF, PDF
              </span>
              <input
                type="file"
                accept="image/*,.pdf,.tif,.tiff"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processSelectedFile(f, 'original');
                }}
              />
            </label>

            {originalUpload && (
              <div className="mt-4 p-3.5 bg-navy-50/60 border border-navy-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 font-semibold text-navy-900">
                  <span className="truncate">{originalUpload.file.name}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatFileSize(originalUpload.file.size)}
                  </span>
                </div>
                {originalUpload.widthPx && (
                  <p className="text-slate-600 tabular-nums">
                    Kích thước: {originalUpload.widthPx} ×{' '}
                    {originalUpload.heightPx} px (ước tính ~
                    {originalUpload.estimatedDpi} DPI khổ A4)
                  </p>
                )}
                <p className="font-mono text-[11px] text-slate-500 break-all">
                  SHA-256: {originalUpload.sha256}
                </p>
              </div>
            )}
          </div>

          {/* Display file upload */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-display text-sm font-bold text-navy-900">
                Tệp hiển thị tra cứu (_DISP)
              </h3>
              <span className="text-xs text-navy-700 font-medium">
                Bản sao phục vụ hiển thị
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Bản sao đã tối ưu dung lượng hoặc cắt khung gọn gàng để xem trực tuyến. Mọi chỉnh sửa chỉ thực hiện trên bản này.
            </p>

            <label className="block border-2 border-dashed border-slate-200 hover:border-navy-600 rounded-xl p-6 text-center cursor-pointer bg-navy-50/40 hover:bg-navy-50/80 transition-all">
              <span className="w-11 h-11 rounded-xl bg-white text-navy-700 shadow-sm border border-navy-100 flex items-center justify-center mx-auto mb-2.5">
                <FileImage className="w-5 h-5" />
              </span>
              <span className="block text-sm font-semibold text-navy-900">
                Chọn tệp bản hiển thị riêng (tuỳ chọn)
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                Hoặc tự động tạo bản sao hiển thị từ tệp gốc bên dưới
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processSelectedFile(f, 'display');
                }}
              />
            </label>

            {!displayUpload && (
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoCreateDisplayFromOriginal}
                  onChange={(e) =>
                    setAlsoCreateDisplayFromOriginal(e.target.checked)
                  }
                  className="rounded border-slate-300 text-navy-900"
                />
                <span>
                  Tự động tạo bản sao hiển thị (_DISP) tách biệt nếu không tải tệp riêng
                </span>
              </label>
            )}

            {displayUpload && (
              <div className="mt-4 p-3.5 bg-navy-50/60 border border-navy-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 font-semibold text-navy-900">
                  <span className="truncate">{displayUpload.file.name}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatFileSize(displayUpload.file.size)}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-500 break-all">
                  SHA-256: {displayUpload.sha256}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Attach to existing OR full metadata form */}
        {targetMode === 'existing' ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card">
            <h3 className="font-display text-sm font-bold text-navy-900 mb-3">
              Chọn hồ sơ tư liệu hiện có để gắn tệp số hoá
            </h3>
            <select
              value={selectedExistingId}
              onChange={(e) => setSelectedExistingId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-navy-50/40 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.dublinCore.identifier} — {r.dublinCore.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-sm font-bold text-navy-900">
                  Thông tin biên mục Dublin Core (15 trường) &amp; Bảo quản (8 trường)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả các trường đều bắt buộc. Nếu chưa có dữ liệu xác thực, dùng nút hỗ trợ để điền &ldquo;Chưa xác định&rdquo;.
                </p>
              </div>
              <button
                type="button"
                onClick={fillUnknownDefaults}
                className="px-3.5 py-1.5 text-xs font-medium text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-xl transition-colors whitespace-nowrap"
              >
                Điền &ldquo;Chưa xác định&rdquo; cho các trường chưa rõ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân loại tài liệu (Type) *
                </label>
                <select
                  value={docType}
                  onChange={(e) => {
                    const nextType = e.target.value as DocumentType;
                    setDocType(nextType);
                    handleRegenerateId(nextType, docYear);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời gian tư liệu (Date) *
                </label>
                <input
                  type="text"
                  value={docYear}
                  onChange={(e) => {
                    setDocYear(e.target.value);
                    handleRegenerateId(docType, e.target.value);
                  }}
                  placeholder="VD: 1975"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Mã định danh tự động (Identifier) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRegenerateId()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tạo lại</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-navy-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhan đề tư liệu (Title) *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập nhan đề đầy đủ của tài liệu"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngôn ngữ (Language) *
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tác giả / Cơ quan tạo lập (Creator) *
                </label>
                <input
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="Tên tác giả hoặc Chưa xác định"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ đề (Subject) *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Từ khoá chủ đề"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn vị phát hành / Lưu giữ (Publisher) *
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Tên tổ chức phát hành / đơn vị quản lý"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người đóng góp (Contributor) *
                </label>
                <input
                  type="text"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nguồn gốc (Source) *
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quan hệ bộ sưu tập (Relation) *
                </label>
                <input
                  type="text"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phạm vi không gian/thời gian (Coverage) *
                </label>
                <input
                  type="text"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quyền sử dụng (Rights) *
                </label>
                <input
                  type="text"
                  value={rights}
                  onChange={(e) => setRights(e.target.value)}
                  placeholder="Phạm vi sử dụng giáo dục, nghiên cứu..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả nội dung (Description) *
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt nội dung và giá trị tư liệu"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>
            </div>

            {/* 8 trường mở rộng */}
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nơi lưu giữ hiện nay *
                </label>
                <input
                  type="text"
                  value={currentCustodyLocation}
                  onChange={(e) => setCurrentCustodyLocation(e.target.value)}
                  placeholder="Ghi Chưa xác định nếu chưa kiểm chứng"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nơi lưu giữ tại thời điểm tư liệu *
                </label>
                <input
                  type="text"
                  value={historicalCustodyLocation}
                  onChange={(e) => setHistoricalCustodyLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại bản đang hiển thị *
                </label>
                <select
                  value={displayedCopyType}
                  onChange={(e) =>
                    setDisplayedCopyType(e.target.value as DisplayedCopyType)
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  <option value="Bản số">Bản số</option>
                  <option value="Bản sao">Bản sao</option>
                  <option value="Bản gốc">Bản gốc</option>
                  <option value="Chưa xác định">Chưa xác định</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tình trạng bản gốc *
                </label>
                <input
                  type="text"
                  value={originalCondition}
                  onChange={(e) => setOriginalCondition(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số đăng ký / tham khảo *
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức kiểm chứng *
                </label>
                <select
                  value={verificationLevel}
                  onChange={(e) =>
                    setVerificationLevel(e.target.value as VerificationLevel)
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                >
                  <option value="Đã xác minh thực địa">
                    Đã xác minh thực địa
                  </option>
                  <option value="Đã đối chiếu hồ sơ">
                    Đã đối chiếu hồ sơ
                  </option>
                  <option value="Chờ xác minh">Chờ xác minh</option>
                  <option value="Chưa xác định">Chưa xác định</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người cho phép công bố *
                </label>
                <input
                  type="text"
                  value={rightsAuthorizer}
                  onChange={(e) => setRightsAuthorizer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phần không công bố *
                </label>
                <input
                  type="text"
                  value={restrictedPortions}
                  onChange={(e) => setRestrictedPortions(e.target.value)}
                  placeholder='VD: "Không có" hoặc mô tả trang hạn chế'
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái cấp quyền hiển thị *
                </label>
                <select
                  value={publicationStatus}
                  onChange={(e) =>
                    setPublicationStatus(e.target.value as PublicationStatus)
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
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 rounded-xl shadow-navy transition-all"
          >
            Hoàn tất số hoá &amp; Lưu vào kho tư liệu
          </button>
        </div>
      </form>
    </div>
  );
}
