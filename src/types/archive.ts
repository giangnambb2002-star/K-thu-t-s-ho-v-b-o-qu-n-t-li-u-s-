export type PageId =
  | 'overview'
  | 'repository'
  | 'digitization'
  | 'quality-check'
  | 'file-management'
  | 'backup'
  | 'rights'
  | 'guides';

export type DocumentType =
  | 'Văn bản hành chính'
  | 'Bản thảo viết tay'
  | 'Ảnh tư liệu'
  | 'Bản đồ - Bản vẽ'
  | 'Ấn phẩm - Sách cổ'
  | 'Hồ sơ nghiên cứu'
  | 'Khác';

export type RecordStatus =
  | 'Mới tiếp nhận'
  | 'Đã số hoá'
  | 'Đã kiểm tra'
  | 'Cần chụp lại'
  | 'Đã sao lưu';

export type DisplayedCopyType =
  | 'Bản gốc'
  | 'Bản sao'
  | 'Bản số'
  | 'Chưa xác định';

export type VerificationLevel =
  | 'Đã xác minh thực địa'
  | 'Đã đối chiếu hồ sơ'
  | 'Chờ xác minh'
  | 'Chưa xác định';

export type PublicationStatus =
  | 'Được phép công bố'
  | 'Công bố có điều kiện'
  | 'Chưa được cấp quyền';

export type BackupCompletionStatus =
  | 'Chưa sao lưu'
  | 'Sao lưu một phần'
  | 'Đã sao lưu đầy đủ';

export interface DublinCoreMetadata {
  title: string;
  creator: string;
  subject: string;
  description: string;
  publisher: string;
  contributor: string;
  date: string;
  type: DocumentType | string;
  format: string;
  identifier: string;
  source: string;
  language: string;
  relation: string;
  coverage: string;
  rights: string;
}

export interface ExtendedArchivalMetadata {
  currentCustodyLocation: string;
  historicalCustodyLocation: string;
  displayedCopyType: DisplayedCopyType;
  originalCondition: string;
  registrationNumber: string;
  rightsAuthorizer: string;
  restrictedPortions: string;
  verificationLevel: VerificationLevel;
}

export interface ArchivalFileAsset {
  id: string;
  recordId: string;
  role: 'original' | 'display';
  originalUploadedName: string;
  standardizedName: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  estimatedDpi: number | null;
  sha256: string;
  createdAt: string;
  mediaStorageKey?: string;
  isImmutableOriginal: boolean;
  derivedFromFileId?: string;
}

export interface BackupRecordInfo {
  originalStorageLocation: string;
  originalLocationVerified: boolean;
  backupLocation1: string;
  backupLocation2: string;
  backupDate: string;
  humanConfirmed: boolean;
  confirmedBy: string;
  status: BackupCompletionStatus;
  notes: string;
}

export interface RightsConsentInfo {
  providingOrganization: string;
  authorizerName: string;
  authorizerRole: string;
  consentDate: string;
  allowedScope: string;
  referenceSource: string;
  restrictedPortions: string;
  publicationStatus: PublicationStatus;
}

export interface ProgrammaticQualityMetrics {
  widthPx: number;
  heightPx: number;
  megapixels: number;
  aspectRatio: string;
  fileSizeBytes: number;
  format: string;
  estimatedDpiA4: number;
  avgLuminance: number;
  sharpnessScore: number;
  passesMinimumSpec: boolean;
  findings: string[];
}

export interface GeminiCriterionEvaluation {
  status: 'Tốt' | 'Cần lưu ý' | 'Kém' | string;
  comment: string;
}

export interface GeminiQualityAnalysis {
  advisoryLabel: 'Đánh giá tham khảo bởi AI';
  model: string;
  analyzedAt: string;
  result: {
    sharpness: GeminiCriterionEvaluation;
    lighting: GeminiCriterionEvaluation;
    shadows: GeminiCriterionEvaluation & { detected: boolean };
    cameraAngle: GeminiCriterionEvaluation;
    shouldRetake: boolean;
    retakeRecommendation: string;
    improvementSuggestions: string[];
    overallAdvisoryNote: string;
  };
}

export interface QualityCheckEntry {
  id: string;
  recordId?: string;
  fileId?: string;
  fileName: string;
  checkedAt: string;
  programmatic: ProgrammaticQualityMetrics;
  aiAnalysis?: GeminiQualityAnalysis;
  humanConfirmed: boolean;
  humanDecision: 'Chờ xác nhận' | 'Đạt chuẩn lưu trữ' | 'Yêu cầu chụp lại';
  reviewerName: string;
  reviewerNote: string;
}

export interface ArchiveRecord {
  id: string;
  dublinCore: DublinCoreMetadata;
  extended: ExtendedArchivalMetadata;
  status: RecordStatus;
  files: ArchivalFileAsset[];
  backup: BackupRecordInfo;
  rightsConsent: RightsConsentInfo;
  latestQualityCheck?: QualityCheckEntry;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actionType:
    | 'create'
    | 'update'
    | 'delete'
    | 'digitize'
    | 'quality'
    | 'backup'
    | 'rights'
    | 'export';
  title: string;
  detail: string;
  recordIdentifier?: string;
}
