import { Menu, Plus, Search } from 'lucide-react';
import { PageId } from '../types/archive';
import { NAV_ITEMS } from './Sidebar';

interface HeaderProps {
  activePage: PageId;
  onOpenMobileMenu: () => void;
  onStartDigitization: () => void;
  onQuickSearchRepo: () => void;
}

export function Header({
  activePage,
  onOpenMobileMenu,
  onStartDigitization,
  onQuickSearchRepo,
}: HeaderProps) {
  const current = NAV_ITEMS.find((n) => n.id === activePage) || NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,41,74,0.06)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-navy-900 hover:bg-navy-50 rounded-xl transition-colors"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline font-medium text-navy-700 whitespace-nowrap">
              DIGIARCHIVE
            </span>
            <span
              className="hidden sm:inline text-slate-300"
              aria-hidden="true"
            >
              /
            </span>
            <span className="hidden sm:inline text-slate-500 truncate">
              {current.shortDesc}
            </span>
          </div>
          <h1 className="font-display font-bold text-navy-900 text-base sm:text-lg leading-tight truncate">
            {current.label}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {activePage !== 'repository' && (
          <button
            type="button"
            onClick={onQuickSearchRepo}
            className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-navy-700" />
            <span>Tra cứu kho</span>
          </button>
        )}

        <button
          type="button"
          onClick={onStartDigitization}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 rounded-xl shadow-navy transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Số hoá tư liệu mới</span>
        </button>
      </div>
    </header>
  );
}
