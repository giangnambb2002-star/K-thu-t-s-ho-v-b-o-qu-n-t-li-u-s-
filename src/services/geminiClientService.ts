import { GeminiQualityAnalysis } from '../types/archive';

export interface AnalyzeImagePayload {
  imageBase64: string;
  mimeType: string;
  fileName: string;
  documentType?: string;
}

export async function analyzeImageWithGemini(
  payload: AnalyzeImagePayload
): Promise<GeminiQualityAnalysis> {
  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error || `Máy chủ trả về lỗi HTTP ${response.status}.`
    );
  }

  return data as GeminiQualityAnalysis;
}
