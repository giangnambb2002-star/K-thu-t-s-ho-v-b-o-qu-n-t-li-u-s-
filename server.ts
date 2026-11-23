import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY.trim() !== '' &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({ status: 'ok', geminiConfigured: hasKey });
  });

  app.post('/api/analyze-image', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, fileName, documentType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        fileName?: string;
        documentType?: string;
      };

      if (!imageBase64 || !mimeType) {
        res.status(400).json({
          error: 'Thiếu dữ liệu hình ảnh hoặc định dạng MIME để phân tích.',
        });
        return;
      }

      const allowedMime = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/tiff',
        'image/bmp',
      ];
      if (!allowedMime.includes(mimeType.toLowerCase())) {
        res.status(400).json({
          error: `Định dạng ${mimeType} chưa được hỗ trợ phân tích trực tiếp bởi Gemini Vision. Vui lòng dùng JPEG, PNG hoặc WebP.`,
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập khoá API trong Settings > Secrets để sử dụng phân tích AI.',
        });
        return;
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const systemInstruction = `Bạn là chuyên gia kiểm định chất lượng số hoá tư liệu lưu trữ (archival digitization specialist).
Hãy đánh giá khách quan chất lượng kỹ thuật của ảnh chụp/bản quét tư liệu này bằng tiếng Việt có dấu chuẩn xác.
TUYỆT ĐỐI KHÔNG khẳng định ảnh đã đạt chuẩn lưu trữ cuối cùng — kết quả chỉ mang tính tham khảo hỗ trợ cán bộ chuyên môn.
Không bịa đặt thông tin lịch sử hay nguồn gốc tư liệu không nhìn thấy trong ảnh.`;

      const prompt = `Phân tích chất lượng kỹ thuật của tệp ảnh tư liệu (${fileName || 'không rõ tên'}, loại tư liệu: ${documentType || 'chưa phân loại'}).
Hãy nhận xét chi tiết theo 5 tiêu chí:
1. Độ rõ nét (sharpness): chữ viết/chi tiết có bị nhoè, mất nét, rung máy hay nén quá mức không?
2. Ánh sáng (lighting): phân bố ánh sáng có đều không, có bị cháy sáng (overexposed), lóa phản chiếu hay quá tối không?
3. Bóng che (shadows): có bóng tay, bóng máy ảnh, bóng gáy sách hay vật cản che khuất nội dung tư liệu không?
4. Góc chụp & căn chỉnh (cameraAngle): tư liệu có bị nghiêng méo phối cảnh, cong vênh, cắt mất lề hay lệch khung hình không?
5. Đề xuất cải thiện & khuyến nghị chụp lại (retakeRecommendation, improvementSuggestions): nêu cụ thể cần chụp lại hay không và cần chỉnh gì (ánh sáng, chân máy, làm phẳng trang, tăng DPI...).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType === 'image/tiff' ? 'image/png' : mimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sharpness: {
                type: Type.OBJECT,
                properties: {
                  status: {
                    type: Type.STRING,
                    description: 'Một trong: Tốt, Cần lưu ý, Kém',
                  },
                  comment: { type: Type.STRING },
                },
                required: ['status', 'comment'],
              },
              lighting: {
                type: Type.OBJECT,
                properties: {
                  status: {
                    type: Type.STRING,
                    description: 'Một trong: Tốt, Cần lưu ý, Kém',
                  },
                  comment: { type: Type.STRING },
                },
                required: ['status', 'comment'],
              },
              shadows: {
                type: Type.OBJECT,
                properties: {
                  detected: { type: Type.BOOLEAN },
                  status: {
                    type: Type.STRING,
                    description: 'Một trong: Tốt, Cần lưu ý, Kém',
                  },
                  comment: { type: Type.STRING },
                },
                required: ['detected', 'status', 'comment'],
              },
              cameraAngle: {
                type: Type.OBJECT,
                properties: {
                  status: {
                    type: Type.STRING,
                    description: 'Một trong: Tốt, Cần lưu ý, Kém',
                  },
                  comment: { type: Type.STRING },
                },
                required: ['status', 'comment'],
              },
              shouldRetake: { type: Type.BOOLEAN },
              retakeRecommendation: { type: Type.STRING },
              improvementSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              overallAdvisoryNote: { type: Type.STRING },
            },
            required: [
              'sharpness',
              'lighting',
              'shadows',
              'cameraAngle',
              'shouldRetake',
              'retakeRecommendation',
              'improvementSuggestions',
              'overallAdvisoryNote',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini không trả về nội dung phân tích. Vui lòng thử lại.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        advisoryLabel: 'Đánh giá tham khảo bởi AI',
        model: 'gemini-4-hydrogen',
        analyzedAt: new Date().toISOString(),
        result: parsed,
      });
    } catch (error) {
      console.error('Gemini analyze-image error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Lỗi không xác định khi gọi dịch vụ phân tích ảnh Gemini.';
      res.status(500).json({
        error: `Không thể hoàn thành phân tích ảnh: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DIGIARCHIVE server running at http://localhost:${PORT}`);
  });
}

startServer();
