import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  BackupCompletionStatus,
  PublicationStatus,
  RecordStatus,
} from '../types/archive';

interface StatusTextProps {
  value: RecordStatus | BackupCompletionStatus | PublicationStatus | string;
}

export function StatusText({ value }: StatusTextProps) {
  switch (value) {
    case 'Đã kiểm tra':
    case 'Đã sao lưu':
    case 'Đã sao lưu đầy đủ':
    case 'Được phép công bố':
    case 'Đạt chuẩn lưu trữ':
    case 'Tốt':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{value}</span>
        </span>
      );

    case 'Đã số hoá':
    case 'Công bố có điều kiện':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span>{value}</span>
        </span>
      );

    case 'Sao lưu một phần':
    case 'Cần lưu ý':
    case 'Mới tiếp nhận':
    case 'Chờ xác nhận':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{value}</span>
        </span>
      );

    case 'Cần chụp lại':
    case 'Chưa sao lưu':
    case 'Yêu cầu chụp lại':
    case 'Kém':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-600" />
          <span>{value}</span>
        </span>
      );

    case 'Chưa được cấp quyền':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-800 whitespace-nowrap">
          <Lock className="w-3.5 h-3.5 shrink-0 text-orange-600" />
          <span>{value}</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>{value}</span>
        </span>
      );
  }
}
