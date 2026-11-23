import {
  Archive,
  BookOpen,
  Database,
  FileCheck2,
  FolderKanban,
  HardDriveDownload,
  LayoutDashboard,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageId } from '../types/archive';

export interface NavItem {
  id: PageId;
  label: string;
  shortDesc: string;
  group: 'core' | 'governance';
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    shortDesc: 'Bảng điều hành & tiến độ',
    group: 'core',
    icon: LayoutDashboard,
  },
  {
    id: 'repository',
    label: 'Kho tư liệu số',
    shortDesc: 'Tra cứu chuẩn Dublin Core',
    group: 'core',
    icon: Database,
  },
  {
    id: 'digitization',
    label: 'Trung tâm số hoá',
    shortDesc: 'Tiếp nhận & tạo mã tự động',
    group: 'core',
    icon: ScanLine,
  },
  {
    id: 'quality-check',
    label: 'Kiểm tra chất lượng',
    shortDesc: 'Đo thông số & Gemini AI',
    group: 'core',
    icon: FileCheck2,
  },
  {
    id: 'file-management',
    label: 'Quản lý tệp',
    shortDesc: 'Đặt tên chuẩn & SHA-256',
    group: 'governance',
    icon: FolderKanban,
  },
  {
    id: 'backup',
    label: 'Quản lý sao lưu',
    shortDesc: 'Bản gốc & sao lưu 3-2-1',
    group: 'governance',
    icon: HardDriveDownload,
  },
  {
    id: 'rights',
    label: 'Nguồn & quyền công bố',
    shortDesc: 'Pháp lý & phạm vi sử dụng',
    group: 'governance',
    icon: ShieldCheck,
  },
  {
    id: 'guides',
    label: 'Hướng dẫn bảo quản',
    shortDesc: 'Quy chuẩn nghiệp vụ lưu trữ',
    group: 'governance',
    icon: BookOpen,
  },
];

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  recordCount: number;
  unbackedCount: number;
}

export function Sidebar({
  activePage,
  onSelectPage,
  mobileOpen,
  onCloseMobile,
  recordCount,
  unbackedCount,
}: SidebarProps) {
  const handleSelect = (id: PageId) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const coreItems = NAV_ITEMS.filter((i) => i.group === 'core');
  const govItems = NAV_ITEMS.filter((i) => i.group === 'governance');

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-blue-200/50 uppercase">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className={`sidebar-nav-item group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isActive
                ? 'bg-gradient-to-r from-navy-900 to-navy-600 text-white font-medium ring-1 ring-white/15 shadow-[0_4px_14px_-4px_rgba(8,23,44,0.45),inset_0_1px_0_rgba(255,255,255,0.16)]'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isActive
                    ? 'bg-navy-600 text-white shadow-sm'
                    : 'bg-white/6 text-blue-200/80 group-hover:bg-white/12 group-hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[13px] truncate">{item.label}</span>
            </span>

            {item.id === 'repository' && (
              <span
                className={`text-xs font-mono tabular-nums shrink-0 ${
                  isActive ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {recordCount}
              </span>
            )}

            {item.id === 'backup' && unbackedCount > 0 && (
              <span
                className="text-xs font-mono tabular-nums shrink-0 text-amber-300 font-semibold"
                title={`${unbackedCount} tư liệu chưa sao lưu đầy đủ`}
              >
                !{unbackedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const navContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
            <Archive className="w-4 h-4 text-blue-100" />
          </div>
          <span className="font-display font-bold tracking-tight text-base text-white whitespace-nowrap">
            DIGIARCHIVE
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-lg"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-5 space-y-6"
        aria-label="Điều hướng chính"
      >
        {renderGroup('Nghiệp vụ số hoá', coreItems)}
        {renderGroup('Bảo quản & Pháp lý', govItems)}
      </nav>

      {/* Institutional Mission Footer */}
      <div className="m-3 p-3.5 rounded-xl bg-navy-950/45 border border-white/10 text-xs text-slate-300 leading-relaxed shrink-0 shadow-inner">
        <p className="font-semibold text-white">
          Kho lưu trữ giáo dục &amp; nghiên cứu
        </p>
        <p className="mt-1 text-[11px] text-blue-200/75">
          Chuẩn Dublin Core (15+8) · Lưu trữ cục bộ IndexedDB
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[264px] shrink-0 border-r border-slate-200/80">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
