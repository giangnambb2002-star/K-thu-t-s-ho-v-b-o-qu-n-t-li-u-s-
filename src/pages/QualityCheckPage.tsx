import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  ArchiveRecord,
  GeminiQualityAnalysis,
  ProgrammaticQualityMetrics,
  QualityCheckEntry,
} from '../types/archive';
import {
  formatFileSize,
  inspectImageProgrammatically,
} from '../services/cryptoAndFileService';
import { analyzeImageWithGemini } from '../services/geminiClientService';
import { StatusText } from '../components/StatusText';
import { storageService } from '../services/storageService';

interface QualityCheckPageProps {
  records: ArchiveRecord[];
  qualityHistory: QualityCheckEntry[];
  onSaveQualityCheck: (
    entry: QualityCheckEntry,
    linkedRecordId?: string
  ) => Promise<void>;
}

export function QualityCheckPage({
  records,
  qualityHistory,
  onSaveQualityCheck,
}: QualityCheckPageProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [docTypeHint, setDocTypeHint] = useState<string>('Văn bản / Tư liệu');
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [programmatic, setProgrammatic] =
    useState<ProgrammaticQualityMetrics | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<GeminiQualityAnalysis | null>(
    null
  );
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Xác nhận của con người (bắt buộc)
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerNote, setReviewerNote] = useState<string>('');
  const [humanDecision, setHumanDecision] = useState<
    'Đạt chuẩn lưu trữ' | 'Yêu cầu chụp lại'
  >('Đạt chuẩn lưu trữ');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setAiAnalysis(null);
    setAiError(null);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const { dataUrl, metrics } = await inspectImageProgrammatically(file);
      setFileName(file.name);
      setMimeType(file.type || 'image/jpeg');
      setPreviewUrl(dataUrl);
      setProgrammatic(metrics);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc kích thước và thông số ảnh.'
      );
    }
  };

  const handlePickFromRecord = async (recordId: string) => {
    setSelectedRecordId(recordId);
    setAiAnalysis(null);
    setAiError(null);
    setSaveSuccess(null);
    setSaveError(null);

    const rec = records.find((r) => r.id === recordId);
    if (!rec) return;
    setDocTypeHint(rec.dublinCore.type);

    const imgFile = rec.files.find(
      (f) => f.mediaStorageKey && f.mimeType.startsWith('image/')
    );
    if (!imgFile || !imgFile.mediaStorageKey) {
      setSaveError(
        'Hồ sơ này chưa có tệp ảnh lưu trong IndexedDB. Bạn có thể tải tệp ảnh trực tiếp từ máy tính.'
      );
      return;
    }

    const dataUrl = await storageService.getMediaDataUrl(
      imgFile.mediaStorageKey
    );
    if (!dataUrl) return;

    // Tạo File giả lập từ dataUrl để chạy inspectImageProgrammatically chính xác
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const reconstructed = new File([blob], imgFile.standardizedName, {
      type: imgFile.mimeType,
    });
    const inspected = await inspectImageProgrammatically(reconstructed);
    setFileName(imgFile.standardizedName);
    setMimeType(imgFile.mimeType);
    setPreviewUrl(dataUrl);
    setProgrammatic(inspected.metrics);
  };

  const handleRunGeminiAnalysis = async () => {
    if (!previewUrl) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const analysis = await analyzeImageWithGemini({
        imageBase64: previewUrl,
        mimeType: mimeType || 'image/jpeg',
        fileName,
        documentType: docTypeHint,
      });
      setAiAnalysis(analysis);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối dịch vụ phân tích ảnh Gemini.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleHumanConfirmSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);

    if (!programmatic || !fileName) {
      setSaveError('Vui lòng tải ảnh lên và chạy kiểm tra trước khi xác nhận.');
      return;
    }
    if (!reviewerName.trim()) {
      setSaveError(
        'Vui lòng nhập họ tên cán bộ kiểm tra. Hệ thống không tự động xác nhận ảnh đạt chuẩn nếu chưa có người kiểm tra.'
      );
      return;
    }

    const entry: QualityCheckEntry = {
      id: `qc-${Date.now()}`,
      recordId: selectedRecordId || undefined,
      fileName,
      checkedAt: new Date().toISOString(),
      programmatic,
      aiAnalysis: aiAnalysis || undefined,
      humanConfirmed: true,
      humanDecision,
      reviewerName: reviewerName.trim(),
      reviewerNote:
        reviewerNote.trim() || 'Đã kiểm tra trực tiếp bởi cán bộ phụ trách.',
    };

    await onSaveQualityCheck(entry, selectedRecordId || undefined);
    setSaveSuccess(
      `Đã ghi nhận quyết định "${humanDecision}" bởi ${reviewerName.trim()} cho tệp ${fileName}.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner disclaimer */}
      <div className="bg-navy-50/90 border border-navy-100 rounded-2xl p-4 shadow-card flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-navy-800 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
          <strong className="text-navy-900">
            Nguyên tắc kiểm định chất lượng DIGIARCHIVE:
          </strong>{' '}
          Thông số kích thước/độ phân giải được đo trực tiếp bằng thuật toán trình duyệt; nhận xét của Gemini AI chỉ mang nhãn{' '}
          <span className="font-semibold text-orange-800">
            &ldquo;Đánh giá tham khảo bởi AI&rdquo;
          </span>{' '}
          và <strong>không tự động xác nhận ảnh đạt chuẩn</strong> khi chưa có cán bộ kiểm tra ký xác nhận.
        </div>
      </div>

      {/* Upload & Source Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="font-display text-sm font-bold text-navy-900">
              1. Chọn nguồn ảnh kiểm tra
            </h3>

            <label className="block border-2 border-dashed border-slate-200 hover:border-navy-600 rounded-xl p-6 text-center cursor-pointer bg-navy-50/35 hover:bg-navy-50/80 transition-all">
              <span className="w-11 h-11 rounded-xl bg-navy-100 text-navy-800 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </span>
              <span className="block text-sm font-semibold text-navy-900">
                Tải ảnh tư liệu lên để kiểm tra
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                JPEG, PNG, WebP (đo thông số điểm ảnh &amp; phân tích Gemini Vision)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Hoặc chọn từ hồ sơ đã số hoá trong kho
              </label>
              <select
                value={selectedRecordId}
                onChange={(e) => handlePickFromRecord(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
              >
                <option value="">-- Chọn hồ sơ tư liệu --</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.dublinCore.identifier} · {r.dublinCore.title}
                  </option>
                ))}
              </select>
            </div>

            {previewUrl && (
              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-100 shadow-xs">
                <img
                  src={previewUrl}
                  alt={fileName}
                  className="w-full max-h-72 object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
                <div className="px-3.5 py-2.5 bg-white border-t border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-2">
                  <span className="font-mono truncate font-medium text-navy-900">
                    {fileName}
                  </span>
                  <span className="tabular-nums font-mono shrink-0 text-navy-700">
                    {programmatic
                      ? `${programmatic.widthPx}×${programmatic.heightPx} px`
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Programmatic + Gemini AI + Human confirmation */}
        <div className="lg:col-span-7 space-y-5">
          {/* Programmatic Inspection */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
              <h3 className="font-display text-sm font-bold text-navy-900">
                2. Kiểm tra thông số kỹ thuật bằng chương trình
              </h3>
              {programmatic && (
                <span
                  className={`text-xs font-semibold ${
                    programmatic.passesMinimumSpec
                      ? 'text-emerald-700'
                      : 'text-orange-700'
                  }`}
                >
                  {programmatic.passesMinimumSpec
                    ? 'Đạt ngưỡng kích thước cơ bản'
                    : 'Cảnh báo thông số thấp'}
                </span>
              )}
            </div>

            {!programmatic ? (
              <div className="py-10 text-center text-xs text-slate-500">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Tải lên một ảnh để đo kích thước, độ phân giải quy đổi DPI, độ sáng và chỉ số độ nét.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-navy-50/45 border border-navy-100/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">Kích thước</div>
                    <div className="font-mono text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                      {programmatic.widthPx} × {programmatic.heightPx}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      {programmatic.megapixels} MP
                    </div>
                  </div>
                  <div className="p-3 bg-navy-50/45 border border-navy-100/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Ước tính DPI (A4)
                    </div>
                    <div className="font-mono text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                      ~{programmatic.estimatedDpiA4} DPI
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          programmatic.estimatedDpiA4 >= 300
                            ? 'bg-emerald-600'
                            : programmatic.estimatedDpiA4 >= 200
                              ? 'bg-navy-600'
                              : 'bg-orange-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((programmatic.estimatedDpiA4 / 400) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-navy-50/45 border border-navy-100/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Dung lượng · Tỷ lệ
                    </div>
                    <div className="font-mono text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                      {formatFileSize(programmatic.fileSizeBytes)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Tỷ lệ {programmatic.aspectRatio}
                    </div>
                  </div>
                  <div className="p-3 bg-navy-50/45 border border-navy-100/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Độ sáng · Biên nét
                    </div>
                    <div className="font-mono text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                      {programmatic.avgLuminance}/255 ·{' '}
                      {programmatic.sharpnessScore}
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-navy-800"
                        style={{
                          width: `${Math.min(100, programmatic.sharpnessScore)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-700">
                  {programmatic.findings.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-navy-800 font-bold">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Sử dụng Gemini Vision phía máy chủ để nhận xét ánh sáng, bóng che, góc chụp
                  </span>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleRunGeminiAnalysis}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 disabled:opacity-60 rounded-xl shadow-navy transition-all whitespace-nowrap shrink-0"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {aiLoading
                        ? 'Đang phân tích bằng Gemini...'
                        : 'Phân tích chất lượng với Gemini AI'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gemini AI Advisory Results */}
          {aiError && (
            <div className="p-4 bg-orange-50/90 border border-orange-200 rounded-2xl shadow-card flex items-start gap-2.5 text-xs text-orange-900">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể phân tích bằng Gemini AI</p>
                <p className="mt-1">{aiError}</p>
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="bg-white border border-navy-200/80 rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                    {aiAnalysis.advisoryLabel}
                  </span>
                  <h3 className="font-display text-sm font-bold text-navy-900 mt-0.5">
                    Kết quả nhận xét chi tiết theo từng tiêu chí
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Cần con người xác nhận trước khi lưu chính thức
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      Độ rõ nét
                    </span>
                    <StatusText value={aiAnalysis.result.sharpness.status} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {aiAnalysis.result.sharpness.comment}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      Ánh sáng
                    </span>
                    <StatusText value={aiAnalysis.result.lighting.status} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {aiAnalysis.result.lighting.comment}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      Bóng che
                    </span>
                    <StatusText value={aiAnalysis.result.shadows.status} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {aiAnalysis.result.shadows.comment}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-900">
                      Góc chụp &amp; khung hình
                    </span>
                    <StatusText value={aiAnalysis.result.cameraAngle.status} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {aiAnalysis.result.cameraAngle.comment}
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  aiAnalysis.result.shouldRetake
                    ? 'bg-orange-50/85 border-orange-200 text-orange-950'
                    : 'bg-navy-50/75 border-navy-100 text-slate-800'
                }`}
              >
                <div className="font-semibold mb-1">
                  Khuyến nghị chụp lại:{' '}
                  {aiAnalysis.result.shouldRetake
                    ? 'Nên chụp/quét lại'
                    : 'Không bắt buộc chụp lại (tham khảo)'}
                </div>
                <p className="leading-relaxed">
                  {aiAnalysis.result.retakeRecommendation}
                </p>
                {aiAnalysis.result.improvementSuggestions.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 space-y-0.5">
                    {aiAnalysis.result.improvementSuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Human Reviewer Confirmation Gate */}
          {programmatic && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <UserCheck className="w-4 h-4 text-navy-800" />
                <h3 className="font-display text-sm font-bold text-navy-900">
                  3. Xác nhận cuối cùng của cán bộ kiểm tra (Bắt buộc)
                </h3>
              </div>

              {saveError && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ tên người kiểm tra <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Nhập tên cán bộ xác nhận"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kết luận kiểm định của con người
                  </label>
                  <select
                    value={humanDecision}
                    onChange={(e) =>
                      setHumanDecision(
                        e.target.value as
                          | 'Đạt chuẩn lưu trữ'
                          | 'Yêu cầu chụp lại'
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  >
                    <option value="Đạt chuẩn lưu trữ">Đạt chuẩn lưu trữ</option>
                    <option value="Yêu cầu chụp lại">Yêu cầu chụp lại</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú kiểm tra
                  </label>
                  <input
                    type="text"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    placeholder="Nhận xét bổ sung của người kiểm tra"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleHumanConfirmSave}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 rounded-xl shadow-navy transition-all"
                >
                  Lưu xác nhận kiểm tra chất lượng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspection History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 bg-navy-50/55">
          <h3 className="font-display text-sm font-bold text-navy-900">
            Lịch sử kiểm tra chất lượng đã được xác nhận ({qualityHistory.length})
          </h3>
        </div>
        {qualityHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Chưa có lượt kiểm tra chất lượng nào được lưu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-navy-800 bg-navy-50/75">
                  <th className="py-3 px-4">Tên tệp</th>
                  <th className="py-3 px-4">Thông số ảnh</th>
                  <th className="py-3 px-4">Tham khảo AI</th>
                  <th className="py-3 px-4">Người xác nhận</th>
                  <th className="py-3 px-4">Kết luận chính thức</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {qualityHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-navy-50/35 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-navy-900">
                      {item.fileName}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">
                      {item.programmatic.widthPx}×{item.programmatic.heightPx} px
                      · ~{item.programmatic.estimatedDpiA4} DPI
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.aiAnalysis
                        ? item.aiAnalysis.result.shouldRetake
                          ? 'AI gợi ý xem xét chụp lại'
                          : 'AI đánh giá ổn định'
                        : 'Chưa chạy AI'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.reviewerName}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText value={item.humanDecision} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
