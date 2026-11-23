import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCheck,
  Hash,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { ArchivalFileAsset, ArchiveRecord } from '../types/archive';
import {
  computeSHA256,
  formatFileSize,
  generateStandardizedFileName,
} from '../services/cryptoAndFileService';

interface FileManagementPageProps {
  records: ArchiveRecord[];
  onCreateDisplayCopy?: (
    recordId: string,
    sourceFile: ArchivalFileAsset
  ) => Promise<void>;
}

export function FileManagementPage({ records }: FileManagementPageProps) {
  const allFiles = useMemo(() => {
    return records.flatMap((rec) =>
      rec.files.map((f) => ({
        ...f,
        recordIdentifier: rec.dublinCore.identifier,
        recordTitle: rec.dublinCore.title,
      }))
    );
  }, [records]);

  const allStandardNames = useMemo(
    () => allFiles.map((f) => f.standardizedName),
    [allFiles]
  );

  // Công cụ sinh tên chuẩn & kiểm tra trùng
  const [selectedIdForNaming, setSelectedIdForNaming] = useState<string>(
    records[0]?.dublinCore.identifier || 'DA-TL-2026-001'
  );
  const [roleForNaming, setRoleForNaming] = useState<'original' | 'display'>(
    'original'
  );
  const [rawFileName, setRawFileName] = useState<string>('scan_trang_01.tif');
  const [pageNumber, setPageNumber] = useState<string>('1');
  const [manualCheckName, setManualCheckName] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Công cụ tạo & đối chiếu SHA-256
  const [hashFileName, setHashFileName] = useState<string>('');
  const [hashFileSize, setHashFileSize] = useState<number>(0);
  const [computedHash, setComputedHash] = useState<string>('');
  const [targetCompareHash, setTargetCompareHash] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'original' | 'display'>(
    'all'
  );

  const generatedName = useMemo(() => {
    const pNum = Number(pageNumber);
    return generateStandardizedFileName(
      selectedIdForNaming || 'DA-TL-2026-001',
      roleForNaming,
      rawFileName || 'document.jpg',
      '',
      [],
      Number.isFinite(pNum) && pNum > 0 ? pNum : undefined
    );
  }, [selectedIdForNaming, roleForNaming, rawFileName, pageNumber]);

  const isGeneratedDuplicate = allStandardNames.some(
    (n) => n.toLowerCase() === generatedName.toLowerCase()
  );

  const manualNameToCheck = (manualCheckName || generatedName).trim();
  const duplicateMatches = allFiles.filter(
    (f) =>
      f.standardizedName.toLowerCase() === manualNameToCheck.toLowerCase()
  );

  // Phát hiện trùng lặp thực tế trong kho
  const duplicateGroups = useMemo(() => {
    const counts = new Map<string, number>();
    allFiles.forEach((f) => {
      const k = f.standardizedName.toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries()).filter(([, c]) => c > 1);
  }, [allFiles]);

  const filteredFiles = useMemo(() => {
    if (roleFilter === 'all') return allFiles;
    return allFiles.filter((f) => f.role === roleFilter);
  }, [allFiles, roleFilter]);

  const handleComputeFileHash = async (file: File) => {
    const digest = await computeSHA256(file);
    setHashFileName(file.name);
    setHashFileSize(file.size);
    setComputedHash(digest);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const hashMatchState = useMemo(() => {
    const a = computedHash.trim().toLowerCase();
    const b = targetCompareHash.trim().toLowerCase();
    if (!a || !b) return null;
    return a === b;
  }, [computedHash, targetCompareHash]);

  return (
    <div className="space-y-6">
      {/* Original vs Display principle notice */}
      <div className="bg-navy-50/90 border border-navy-100 rounded-2xl p-4 shadow-card flex items-start gap-3 text-xs sm:text-sm text-slate-800">
        <Lock className="w-5 h-5 text-navy-800 shrink-0 mt-0.5" />
        <div>
          <strong className="text-navy-900">
            Nguyên tắc quản lý tệp gốc &amp; tệp hiển thị:
          </strong>{' '}
          Tệp gốc (<code className="font-mono font-semibold text-navy-900">_ORIG</code>) được đánh dấu bất biến và chỉ dùng để lưu trữ bảo toàn. Mọi thao tác cắt khung, xoay hoặc nén hiển thị web chỉ được thực hiện trên bản hiển thị (<code className="font-mono font-semibold text-navy-700">_DISP</code>).
        </div>
      </div>

      {/* Tools Grid: Naming Generator & SHA-256 Verifier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standardized Naming + Duplicate Checker */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display text-sm font-bold text-navy-900">
              Sinh tên tệp chuẩn theo mã tư liệu &amp; Kiểm tra trùng
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy chuẩn: [Mã_định_danh]_[ORIG|DISP]_[Pxxx].[định_dạng]
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã định danh tư liệu
              </label>
              <select
                value={selectedIdForNaming}
                onChange={(e) => setSelectedIdForNaming(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.dublinCore.identifier}>
                    {r.dublinCore.identifier}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phân loại tệp (Bản gốc / Bản hiển thị)
              </label>
              <select
                value={roleForNaming}
                onChange={(e) =>
                  setRoleForNaming(e.target.value as 'original' | 'display')
                }
                className="w-full px-3 py-2 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
              >
                <option value="original">Bản gốc bất biến (_ORIG)</option>
                <option value="display">Bản hiển thị tra cứu (_DISP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên tệp nguồn (lấy phần mở rộng)
              </label>
              <input
                type="text"
                value={rawFileName}
                onChange={(e) => setRawFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số trang (tuỳ chọn)
              </label>
              <input
                type="number"
                min={0}
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
              />
            </div>
          </div>

          <div className="p-3.5 bg-navy-50/55 border border-navy-100 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                Tên tệp chuẩn hoá tự động
              </div>
              <div className="font-mono text-sm font-semibold text-navy-900 break-all">
                {generatedName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(generatedName)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy-800 bg-white border border-slate-200 rounded-xl hover:bg-navy-50 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedHash === generatedName ? 'Đã chép' : 'Chép'}</span>
            </button>
          </div>

          <div className="pt-2.5 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Kiểm tra tên tệp trùng trong kho
            </label>
            <input
              type="text"
              value={manualCheckName}
              onChange={(e) => setManualCheckName(e.target.value)}
              placeholder={`Mặc định kiểm tra: ${generatedName}`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
            />

            {duplicateMatches.length > 0 || isGeneratedDuplicate ? (
              <div className="flex items-center gap-2 text-xs text-orange-700 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Phát hiện trùng tên tệp &ldquo;{manualNameToCheck}&rdquo; trong kho! Hệ thống sẽ tự động thêm hậu tố phiên bản (_V02) khi lưu.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Tên tệp &ldquo;{manualNameToCheck}&rdquo; hợp lệ và không trùng lặp với {allFiles.length} tệp hiện có.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* SHA-256 Generator & Integrity Verifier */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display text-sm font-bold text-navy-900">
              Tạo &amp; Kiểm tra mã toàn vẹn SHA-256
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sử dụng Web Crypto API tính toán trực tiếp trên tệp thực tế để phát hiện biến đổi dữ liệu (bit rot).
            </p>
          </div>

          <label className="block border-2 border-dashed border-slate-200 hover:border-navy-600 rounded-xl p-5 text-center cursor-pointer bg-navy-50/35 hover:bg-navy-50/80 transition-all">
            <span className="w-9 h-9 rounded-xl bg-navy-100 text-navy-800 flex items-center justify-center mx-auto mb-2">
              <Upload className="w-4 h-4" />
            </span>
            <span className="block text-xs font-semibold text-navy-900">
              Chọn tệp bất kỳ để tạo mã SHA-256 tức thời
            </span>
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleComputeFileHash(f);
              }}
            />
          </label>

          {computedHash && (
            <div className="p-3.5 bg-navy-50/55 border border-navy-100 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-navy-900 truncate">
                  {hashFileName}
                </span>
                <span className="font-mono text-slate-500 tabular-nums shrink-0">
                  {formatFileSize(hashFileSize)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-[11px] text-navy-800 break-all">
                  {computedHash}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(computedHash)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-navy-800 hover:bg-navy-50 transition-colors shrink-0"
                >
                  {copiedHash === computedHash ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đối chiếu với mã SHA-256 đã lưu (dán mã gốc hoặc chọn từ bảng dưới)
            </label>
            <input
              type="text"
              value={targetCompareHash}
              onChange={(e) => setTargetCompareHash(e.target.value)}
              placeholder="Dán chuỗi 64 ký tự SHA-256 để kiểm tra khớp toàn vẹn..."
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600 transition-all"
            />
          </div>

          {hashMatchState !== null && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                hashMatchState
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-orange-50 border-orange-200 text-orange-900'
              }`}
            >
              {hashMatchState ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Khớp 100% SHA-256: Tệp nguyên vẹn, không bị thay đổi hoặc hỏng dữ liệu.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>
                    Cảnh báo: Mã SHA-256 KHÔNG KHỚP! Tệp có thể đã bị chỉnh sửa hoặc hư hại.
                  </span>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Stored Files Inventory Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 bg-navy-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-navy-900">
              Danh sách tệp tin trong kho ({filteredFiles.length})
            </h3>
            {duplicateGroups.length > 0 && (
              <p className="text-xs text-orange-700 mt-0.5">
                Phát hiện {duplicateGroups.length} nhóm tên tệp bị trùng cần xử lý.
              </p>
            )}
          </div>

          <div className="inline-flex items-center p-1 bg-navy-100/80 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                roleFilter === 'all'
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('original')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                roleFilter === 'original'
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Bản gốc (_ORIG)
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('display')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                roleFilter === 'display'
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Bản hiển thị (_DISP)
            </button>
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-700">
              Chưa có tệp tin số hoá nào được tải lên
            </p>
            <p className="text-xs mt-1">
              Hãy tải tệp thật tại trang Trung tâm số hoá để hệ thống chuẩn hoá tên và tạo mã SHA-256.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-navy-50/75 text-[11px] font-semibold uppercase tracking-wider text-navy-800">
                  <th className="py-3 px-4">Tên tệp chuẩn hoá</th>
                  <th className="py-3 px-4">Phân loại bản</th>
                  <th className="py-3 px-4">Định dạng</th>
                  <th className="py-3 px-4 text-right">Dung lượng</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4">Mã SHA-256</th>
                  <th className="py-3 px-4 text-right">Kiểm tra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-navy-900">
                        {file.standardizedName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mã hồ sơ: {file.recordIdentifier} · Gốc tải:{' '}
                        {file.originalUploadedName}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {file.role === 'original' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-navy-900">
                          <Lock className="w-3 h-3" />
                          <span>Bản gốc bất biến</span>
                        </span>
                      ) : (
                        <span className="font-medium text-navy-600">
                          Bản hiển thị
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {file.format}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatFileSize(file.sizeBytes)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-[220px] truncate">
                      {file.sha256}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setTargetCompareHash(file.sha256)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-lg transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        <span>Nạp đối chiếu</span>
                      </button>
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
