import { DocumentType, ProgrammaticQualityMetrics } from '../types/archive';

const TYPE_PREFIX_MAP: Record<string, string> = {
  'Văn bản hành chính': 'VB',
  'Bản thảo viết tay': 'BT',
  'Ảnh tư liệu': 'AT',
  'Bản đồ - Bản vẽ': 'BD',
  'Ấn phẩm - Sách cổ': 'AP',
  'Hồ sơ nghiên cứu': 'HS',
  Khác: 'TL',
};

export function generateArchivalIdentifier(
  docType: DocumentType | string,
  yearInput: string,
  existingIdentifiers: string[]
): string {
  const prefix = TYPE_PREFIX_MAP[docType] || 'TL';
  const yearMatch = yearInput.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  const base = `DA-${prefix}-${year}`;

  let seq = 1;
  const existingSet = new Set(existingIdentifiers.map((id) => id.toUpperCase()));
  while (existingSet.has(`${base}-${String(seq).padStart(3, '0')}`)) {
    seq += 1;
  }
  return `${base}-${String(seq).padStart(3, '0')}`;
}

export function getFileExtension(fileName: string, mimeType: string): string {
  const parts = fileName.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/tiff': 'tif',
    'application/pdf': 'pdf',
  };
  return mimeMap[mimeType] || 'bin';
}

export function generateStandardizedFileName(
  identifier: string,
  role: 'original' | 'display',
  originalFileName: string,
  mimeType: string,
  existingFileNames: string[] = [],
  pageNumber?: number
): string {
  const cleanId = identifier
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, '-');
  const roleTag = role === 'original' ? 'ORIG' : 'DISP';
  const ext = getFileExtension(originalFileName, mimeType);
  const pageTag =
    pageNumber && pageNumber > 0
      ? `_P${String(pageNumber).padStart(3, '0')}`
      : '';

  const baseName = `${cleanId}_${roleTag}${pageTag}`;
  const existingLower = new Set(existingFileNames.map((n) => n.toLowerCase()));

  let candidate = `${baseName}.${ext}`;
  let version = 2;
  while (existingLower.has(candidate.toLowerCase())) {
    candidate = `${baseName}_V${String(version).padStart(2, '0')}.${ext}`;
    version += 1;
  }
  return candidate;
}

export async function computeSHA256(file: Blob | ArrayBuffer): Promise<string> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không thể đọc tệp từ thiết bị.'));
    reader.readAsDataURL(file);
  });
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export async function inspectImageProgrammatically(file: File): Promise<{
  dataUrl: string;
  metrics: ProgrammaticQualityMetrics;
}> {
  const dataUrl = await readFileAsDataUrl(file);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          'Tệp không phải định dạng ảnh hỗ trợ xem trước trực tiếp (PNG, JPEG, WebP).'
        )
      );
    image.src = dataUrl;
  });

  const widthPx = img.naturalWidth;
  const heightPx = img.naturalHeight;
  const megapixels = Number(((widthPx * heightPx) / 1_000_000).toFixed(2));
  const divisor = gcd(widthPx, heightPx) || 1;
  const aspectRatio = `${Math.round(widthPx / divisor)}:${Math.round(
    heightPx / divisor
  )}`;

  // Ước tính DPI nếu tài liệu kích thước xấp xỉ khổ A4 (8.27 x 11.69 inch)
  const shortSide = Math.min(widthPx, heightPx);
  const longSide = Math.max(widthPx, heightPx);
  const estimatedDpiA4 = Math.round(
    Math.min(shortSide / 8.27, longSide / 11.69)
  );

  // Phân tích độ sáng trung bình & phương sai độ sắc nét (Laplacian sample) trên canvas
  const sampleMax = 400;
  const scale = Math.min(1, sampleMax / Math.max(widthPx, heightPx));
  const sw = Math.max(16, Math.round(widthPx * scale));
  const sh = Math.max(16, Math.round(heightPx * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');

  let avgLuminance = 0;
  let sharpnessScore = 0;

  if (ctx) {
    ctx.drawImage(img, 0, 0, sw, sh);
    const { data } = ctx.getImageData(0, 0, sw, sh);
    const gray = new Float32Array(sw * sh);
    let lumSum = 0;
    for (let i = 0; i < sw * sh; i++) {
      const idx = i * 4;
      const y =
        0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      gray[i] = y;
      lumSum += y;
    }
    avgLuminance = Math.round(lumSum / (sw * sh));

    // Tính độ biến thiên biên (Laplacian variance proxy)
    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const c = gray[y * sw + x];
        const lap =
          gray[(y - 1) * sw + x] +
          gray[(y + 1) * sw + x] +
          gray[y * sw + (x - 1)] +
          gray[y * sw + (x + 1)] -
          4 * c;
        lapSum += lap;
        lapSqSum += lap * lap;
        count++;
      }
    }
    const mean = lapSum / (count || 1);
    const variance = lapSqSum / (count || 1) - mean * mean;
    sharpnessScore = Math.round(Math.min(100, Math.sqrt(Math.max(0, variance)) * 2.2));
  }

  const findings: string[] = [];
  let passesMinimumSpec = true;

  if (longSide < 1600 || shortSide < 1100) {
    passesMinimumSpec = false;
    findings.push(
      `Kích thước điểm ảnh (${widthPx} × ${heightPx} px) thấp hơn ngưỡng khuyến nghị tối thiểu 1600 × 1100 px cho tài liệu lưu trữ.`
    );
  } else {
    findings.push(
      `Kích thước điểm ảnh đạt ${widthPx} × ${heightPx} px (${megapixels} MP), đáp ứng ngưỡng cơ bản để đọc chi tiết.`
    );
  }

  if (estimatedDpiA4 < 200) {
    passesMinimumSpec = false;
    findings.push(
      `Mật độ quy đổi theo khổ A4 ước tính ~${estimatedDpiA4} DPI, chưa đạt chuẩn quét lưu trữ tối thiểu 300 DPI.`
    );
  } else if (estimatedDpiA4 < 300) {
    findings.push(
      `Mật độ quy đổi theo khổ A4 ước tính ~${estimatedDpiA4} DPI (khuyến nghị 300–600 DPI cho bản gốc lưu trữ dài hạn).`
    );
  } else {
    findings.push(
      `Mật độ quy đổi theo khổ A4 ước tính ~${estimatedDpiA4} DPI, đạt ngưỡng lưu trữ chuẩn.`
    );
  }

  if (avgLuminance < 65) {
    findings.push(
      `Độ sáng trung bình thấp (${avgLuminance}/255), hình ảnh có dấu hiệu thiếu sáng.`
    );
  } else if (avgLuminance > 225) {
    findings.push(
      `Độ sáng trung bình rất cao (${avgLuminance}/255), cần kiểm tra nguy cơ cháy sáng mất nét chữ.`
    );
  } else {
    findings.push(
      `Độ sáng trung bình ở mức cân bằng (${avgLuminance}/255).`
    );
  }

  const formatLabel = file.type || getFileExtension(file.name, file.type).toUpperCase();
  if (file.type === 'image/jpeg' && file.size < 250 * 1024) {
    findings.push(
      `Tệp JPEG dung lượng nhỏ (${formatFileSize(file.size)}), có khả năng bị nén mất chi tiết cho bản gốc.`
    );
  }

  return {
    dataUrl,
    metrics: {
      widthPx,
      heightPx,
      megapixels,
      aspectRatio,
      fileSizeBytes: file.size,
      format: formatLabel,
      estimatedDpiA4,
      avgLuminance,
      sharpnessScore,
      passesMinimumSpec,
      findings,
    },
  };
}
