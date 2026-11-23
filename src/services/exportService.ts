import { ArchiveRecord } from '../types/archive';
import { formatFileSize } from './cryptoAndFileService';

function triggerDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateTag(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportRecordsAsJSON(records: ArchiveRecord[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    standard: 'Dublin Core Metadata Element Set (15) + DIGIARCHIVE Extended (8)',
    totalRecords: records.length,
    records: records.map((r) => ({
      identifier: r.dublinCore.identifier,
      status: r.status,
      dublinCore: r.dublinCore,
      extended: r.extended,
      rightsConsent: r.rightsConsent,
      backup: r.backup,
      files: r.files.map((f) => ({
        standardizedName: f.standardizedName,
        role: f.role,
        format: f.format,
        sizeBytes: f.sizeBytes,
        sha256: f.sha256,
        createdAt: f.createdAt,
      })),
    })),
  };

  triggerDownload(
    JSON.stringify(payload, null, 2),
    `DIGIARCHIVE_Kho_Tu_Lieu_${formatDateTag()}.json`,
    'application/json;charset=utf-8'
  );
}

export function exportRecordsAsCSV(records: ArchiveRecord[]): void {
  const headers = [
    'Identifier (Mã định danh)',
    'Title (Tiêu đề)',
    'Creator (Tác giả)',
    'Subject (Chủ đề)',
    'Description (Mô tả)',
    'Publisher (Đơn vị phát hành)',
    'Contributor (Người đóng góp)',
    'Date (Ngày tháng)',
    'Type (Loại tư liệu)',
    'Format (Định dạng)',
    'Source (Nguồn)',
    'Language (Ngôn ngữ)',
    'Relation (Liên kết)',
    'Coverage (Phạm vi)',
    'Rights (Quyền)',
    'Nơi lưu giữ hiện nay',
    'Nơi lưu giữ tại thời điểm tư liệu',
    'Loại bản đang hiển thị',
    'Tình trạng bản gốc',
    'Số đăng ký / tham khảo',
    'Người cho phép công bố',
    'Phần không công bố',
    'Mức kiểm chứng',
    'Trạng thái xử lý',
    'Trạng thái sao lưu',
    'Số lượng tệp',
  ];

  const rows = records.map((r) => [
    r.dublinCore.identifier,
    r.dublinCore.title,
    r.dublinCore.creator,
    r.dublinCore.subject,
    r.dublinCore.description,
    r.dublinCore.publisher,
    r.dublinCore.contributor,
    r.dublinCore.date,
    r.dublinCore.type,
    r.dublinCore.format,
    r.dublinCore.source,
    r.dublinCore.language,
    r.dublinCore.relation,
    r.dublinCore.coverage,
    r.dublinCore.rights,
    r.extended.currentCustodyLocation,
    r.extended.historicalCustodyLocation,
    r.extended.displayedCopyType,
    r.extended.originalCondition,
    r.extended.registrationNumber,
    r.extended.rightsAuthorizer,
    r.extended.restrictedPortions,
    r.extended.verificationLevel,
    r.status,
    r.backup.status,
    r.files.length,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCSV(cell)).join(','))
      .join('\r\n');

  triggerDownload(
    csvContent,
    `DIGIARCHIVE_Kho_Tu_Lieu_${formatDateTag()}.csv`,
    'text/csv;charset=utf-8'
  );
}

export function exportCatalogSheetHTML(record: ArchiveRecord): void {
  const dc = record.dublinCore;
  const ext = record.extended;
  const rc = record.rightsConsent;
  const bk = record.backup;

  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const dcRows: Array<[string, string]> = [
    ['Identifier (Mã định danh)', dc.identifier],
    ['Title (Nhan đề)', dc.title],
    ['Creator (Tác giả / Đơn vị tạo lập)', dc.creator],
    ['Subject (Chủ đề / Từ khoá)', dc.subject],
    ['Description (Mô tả nội dung)', dc.description],
    ['Publisher (Đơn vị phát hành / Lưu giữ)', dc.publisher],
    ['Contributor (Người đóng góp)', dc.contributor],
    ['Date (Thời gian tư liệu)', dc.date],
    ['Type (Loại tư liệu)', dc.type],
    ['Format (Định dạng)', dc.format],
    ['Source (Nguồn gốc)', dc.source],
    ['Language (Ngôn ngữ)', dc.language],
    ['Relation (Quan hệ bộ sưu tập)', dc.relation],
    ['Coverage (Phạm vi không gian / thời gian)', dc.coverage],
    ['Rights (Thông tin bản quyền)', dc.rights],
  ];

  const extRows: Array<[string, string]> = [
    ['Nơi lưu giữ hiện nay', ext.currentCustodyLocation],
    ['Nơi lưu giữ tại thời điểm tư liệu', ext.historicalCustodyLocation],
    ['Loại bản đang hiển thị', ext.displayedCopyType],
    ['Tình trạng bản gốc', ext.originalCondition],
    ['Số đăng ký / Số tham khảo', ext.registrationNumber],
    ['Người cho phép công bố', ext.rightsAuthorizer],
    ['Phần không công bố', ext.restrictedPortions],
    ['Mức kiểm chứng', ext.verificationLevel],
  ];

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu mô tả tư liệu – ${esc(dc.identifier)}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 32px auto; max-width: 860px; line-height: 1.5; }
    header { border-bottom: 2px solid #0f294a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: baseline; }
    h1 { font-size: 20px; color: #0f294a; margin: 0; }
    .id-code { font-family: monospace; font-size: 14px; font-weight: 700; color: #0f294a; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f294a; margin: 22px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: top; }
    th { width: 32%; background: #f8fafc; font-weight: 600; color: #334155; }
    .meta-footer { margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>PHIẾU MÔ TẢ TƯ LIỆU SỐ – DIGIARCHIVE</h1>
      <div style="font-size:12px;color:#475569;">Hồ sơ chuẩn Dublin Core (15 trường) &amp; Thông tin bảo quản bắt buộc</div>
    </div>
    <div class="id-code">${esc(dc.identifier)}</div>
  </header>

  <h2>I. Bộ trường chuẩn Dublin Core (15 trường)</h2>
  <table>
    ${dcRows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
  </table>

  <h2>II. Thông tin bảo quản &amp; kiểm chứng bắt buộc (8 trường)</h2>
  <table>
    ${extRows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
  </table>

  <h2>III. Nguồn tư liệu, quyền công bố &amp; sao lưu</h2>
  <table>
    <tr><th>Tổ chức cung cấp</th><td>${esc(rc.providingOrganization)}</td></tr>
    <tr><th>Trạng thái công bố</th><td>${esc(rc.publicationStatus)} · Phạm vi: ${esc(rc.allowedScope)}</td></tr>
    <tr><th>Vị trí lưu bản gốc</th><td>${esc(bk.originalStorageLocation)} (${bk.originalLocationVerified ? 'Đã xác minh thực địa' : 'Chưa xác minh'})</td></tr>
    <tr><th>Trạng thái sao lưu</th><td>${esc(bk.status)} · Bản 1: ${esc(bk.backupLocation1 || 'Chưa có')} · Bản 2: ${esc(bk.backupLocation2 || 'Chưa có')}</td></tr>
  </table>

  <h2>IV. Danh sách tệp tin gắn kèm (${record.files.length})</h2>
  <table>
    <tr><th>Tên tệp chuẩn hoá</th><th>Vai trò</th><th>Định dạng / Dung lượng</th><th>Mã kiểm toàn vẹn SHA-256</th></tr>
    ${
      record.files.length === 0
        ? '<tr><td colspan="4">Chưa có tệp số hoá đính kèm trong hồ sơ.</td></tr>'
        : record.files
            .map(
              (f) =>
                `<tr><td><code>${esc(f.standardizedName)}</code></td><td>${
                  f.role === 'original' ? 'Bản gốc bất biến' : 'Bản hiển thị'
                }</td><td>${esc(f.format)} (${esc(formatFileSize(f.sizeBytes))})</td><td><code style="font-size:11px;word-break:break-all;">${esc(f.sha256)}</code></td></tr>`
            )
            .join('')
    }
  </table>

  <div class="meta-footer">
    Xuất từ hệ thống DIGIARCHIVE vào lúc ${new Date().toLocaleString('vi-VN')}. Phục vụ mục đích giáo dục, nghiên cứu và bảo tồn tư liệu.
  </div>
</body>
</html>`;

  triggerDownload(
    html,
    `Phieu_Mo_Ta_${dc.identifier}_${formatDateTag()}.html`,
    'text/html;charset=utf-8'
  );
}

export function exportBackupLedgerCSV(records: ArchiveRecord[]): void {
  const headers = [
    'Mã định danh (Identifier)',
    'Tiêu đề tư liệu',
    'Vị trí lưu bản gốc',
    'Xác minh vị trí bản gốc',
    'Vị trí sao lưu thứ nhất',
    'Vị trí sao lưu thứ hai',
    'Ngày sao lưu',
    'Xác nhận thực tế bởi con người',
    'Người xác nhận',
    'Trạng thái sao lưu',
    'Số tệp gốc (_ORIG)',
    'Mã SHA-256 tệp gốc',
    'Ghi chú sao lưu',
  ];

  const rows = records.map((r) => {
    const origFiles = r.files.filter((f) => f.role === 'original');
    return [
      r.dublinCore.identifier,
      r.dublinCore.title,
      r.backup.originalStorageLocation || r.extended.currentCustodyLocation,
      r.backup.originalLocationVerified ? 'Đã xác minh' : 'Chưa xác minh',
      r.backup.backupLocation1 || 'Chưa thiết lập',
      r.backup.backupLocation2 || 'Chưa thiết lập',
      r.backup.backupDate || 'Chưa ghi nhận',
      r.backup.humanConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận',
      r.backup.confirmedBy || 'Chưa xác định',
      r.backup.status,
      origFiles.length,
      origFiles.map((f) => f.sha256).join(' | ') || 'Chưa có tệp gốc',
      r.backup.notes,
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCSV(cell)).join(','))
      .join('\r\n');

  triggerDownload(
    csvContent,
    `DIGIARCHIVE_Danh_Sach_Sao_Luu_${formatDateTag()}.csv`,
    'text/csv;charset=utf-8'
  );
}

export function exportBackupLedgerJSON(records: ArchiveRecord[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    reportType: 'Danh sách quản lý sao lưu & bảo quản bản gốc',
    totalRecords: records.length,
    items: records.map((r) => ({
      identifier: r.dublinCore.identifier,
      title: r.dublinCore.title,
      currentCustodyLocation: r.extended.currentCustodyLocation,
      backup: r.backup,
      originalFiles: r.files
        .filter((f) => f.role === 'original')
        .map((f) => ({
          standardizedName: f.standardizedName,
          sha256: f.sha256,
          sizeBytes: f.sizeBytes,
        })),
    })),
  };

  triggerDownload(
    JSON.stringify(payload, null, 2),
    `DIGIARCHIVE_Danh_Sach_Sao_Luu_${formatDateTag()}.json`,
    'application/json;charset=utf-8'
  );
}
