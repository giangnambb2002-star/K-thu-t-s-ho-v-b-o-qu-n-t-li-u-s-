import { useCallback, useEffect, useState } from 'react';
import {
  ActivityLog,
  ArchiveRecord,
  BackupRecordInfo,
  PageId,
  QualityCheckEntry,
  RightsConsentInfo,
} from './types/archive';
import { storageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ArchiveFormModal } from './components/ArchiveFormModal';
import { ArchiveDetailDrawer } from './components/ArchiveDetailDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { OverviewPage } from './pages/OverviewPage';
import { RepositoryPage } from './pages/RepositoryPage';
import { DigitizationCenterPage } from './pages/DigitizationCenterPage';
import { QualityCheckPage } from './pages/QualityCheckPage';
import { FileManagementPage } from './pages/FileManagementPage';
import { BackupManagementPage } from './pages/BackupManagementPage';
import { RightsAndSourcesPage } from './pages/RightsAndSourcesPage';
import { PreservationGuidePage } from './pages/PreservationGuidePage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [qualityHistory, setQualityHistory] = useState<QualityCheckEntry[]>([]);

  const [activePage, setActivePage] = useState<PageId>('overview');
  const [repositoryTypeFilter, setRepositoryTypeFilter] =
    useState<string>('Tất cả');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [detailRecord, setDetailRecord] = useState<ArchiveRecord | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ArchiveRecord | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<ArchiveRecord | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const refreshData = useCallback(async () => {
    const [recs, acts, qcs] = await Promise.all([
      storageService.getAllRecords(),
      storageService.getActivities(),
      storageService.getQualityChecks(),
    ]);
    setRecords(recs);
    setActivities(acts);
    setQualityHistory(qcs);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await storageService.init();
      if (mounted) {
        await refreshData();
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshData]);

  const handleNavigate = (page: PageId, typeFilter?: string) => {
    if (page === 'repository') {
      setRepositoryTypeFilter(typeFilter || 'Tất cả');
    }
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRecord = async (record: ArchiveRecord, isNew: boolean) => {
    await storageService.saveRecord(record);
    await storageService.logActivity({
      actionType: isNew ? 'create' : 'update',
      title: isNew
        ? `Thêm mới hồ sơ ${record.dublinCore.identifier}`
        : `Cập nhật hồ sơ ${record.dublinCore.identifier}`,
      detail: `${record.dublinCore.title} (${record.dublinCore.type})`,
      recordIdentifier: record.dublinCore.identifier,
    });
    await refreshData();
    if (detailRecord && detailRecord.id === record.id) {
      setDetailRecord(record);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const idCode = deleteTarget.dublinCore.identifier;
    const title = deleteTarget.dublinCore.title;
    await storageService.deleteRecord(deleteTarget.id);
    await storageService.logActivity({
      actionType: 'delete',
      title: `Xoá hồ sơ ${idCode}`,
      detail: `Đã gỡ bản ghi "${title}" khỏi kho lưu trữ cục bộ.`,
      recordIdentifier: idCode,
    });
    if (detailRecord?.id === deleteTarget.id) {
      setDetailRecord(null);
    }
    setDeleteTarget(null);
    await refreshData();
  };

  const handleCompleteDigitization = async (
    record: ArchiveRecord,
    isExisting: boolean
  ) => {
    await storageService.saveRecord(record);
    await storageService.logActivity({
      actionType: 'digitize',
      title: isExisting
        ? `Bổ sung tệp số hoá cho ${record.dublinCore.identifier}`
        : `Số hoá mới tư liệu ${record.dublinCore.identifier}`,
      detail: `Đã lưu ${record.files.length} tệp tin với mã SHA-256 và tên chuẩn hoá.`,
      recordIdentifier: record.dublinCore.identifier,
    });
    await refreshData();
  };

  const handleSaveQualityCheck = async (
    entry: QualityCheckEntry,
    linkedRecordId?: string
  ) => {
    await storageService.saveQualityCheck(entry);
    if (linkedRecordId) {
      const target = records.find((r) => r.id === linkedRecordId);
      if (target) {
        const nextStatus =
          entry.humanDecision === 'Đạt chuẩn lưu trữ'
            ? target.backup.status === 'Đã sao lưu đầy đủ' &&
              target.backup.humanConfirmed
              ? 'Đã sao lưu'
              : 'Đã kiểm tra'
            : 'Cần chụp lại';
        const updated: ArchiveRecord = {
          ...target,
          status: nextStatus,
          latestQualityCheck: entry,
          updatedAt: new Date().toISOString(),
        };
        await storageService.saveRecord(updated);
      }
    }
    await storageService.logActivity({
      actionType: 'quality',
      title: `Kiểm tra chất lượng tệp ${entry.fileName}`,
      detail: `${entry.humanDecision} · Người xác nhận: ${entry.reviewerName}`,
    });
    await refreshData();
  };

  const handleUpdateBackup = async (
    recordId: string,
    backup: BackupRecordInfo
  ) => {
    const target = records.find((r) => r.id === recordId);
    if (!target) return;

    const nextStatus =
      backup.status === 'Đã sao lưu đầy đủ' && backup.humanConfirmed
        ? 'Đã sao lưu'
        : target.status === 'Đã sao lưu'
          ? 'Đã kiểm tra'
          : target.status;

    const updated: ArchiveRecord = {
      ...target,
      backup,
      extended: {
        ...target.extended,
        currentCustodyLocation: backup.originalStorageLocation,
      },
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    await storageService.saveRecord(updated);
    await storageService.logActivity({
      actionType: 'backup',
      title: `Cập nhật sao lưu cho ${target.dublinCore.identifier}`,
      detail: `Trạng thái: ${backup.status}${
        backup.humanConfirmed && backup.confirmedBy
          ? ` (Xác nhận bởi ${backup.confirmedBy})`
          : ''
      }`,
      recordIdentifier: target.dublinCore.identifier,
    });
    await refreshData();
  };

  const handleUpdateRights = async (
    recordId: string,
    rightsConsent: RightsConsentInfo
  ) => {
    const target = records.find((r) => r.id === recordId);
    if (!target) return;

    const updated: ArchiveRecord = {
      ...target,
      rightsConsent,
      extended: {
        ...target.extended,
        rightsAuthorizer: rightsConsent.authorizerName,
        restrictedPortions: rightsConsent.restrictedPortions,
      },
      dublinCore: {
        ...target.dublinCore,
        rights: rightsConsent.allowedScope,
      },
      updatedAt: new Date().toISOString(),
    };

    await storageService.saveRecord(updated);
    await storageService.logActivity({
      actionType: 'rights',
      title: `Cập nhật quyền công bố ${target.dublinCore.identifier}`,
      detail: `${rightsConsent.publicationStatus} · Tổ chức: ${rightsConsent.providingOrganization}`,
      recordIdentifier: target.dublinCore.identifier,
    });
    await refreshData();
  };

  const handleConfirmResetDemo = async () => {
    await storageService.resetDemoData();
    setResetConfirmOpen(false);
    setDetailRecord(null);
    await refreshData();
  };

  const unbackedCount = records.filter(
    (r) => r.backup.status !== 'Đã sao lưu đầy đủ' || !r.backup.humanConfirmed
  ).length;

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] text-slate-900">
      <Sidebar
        activePage={activePage}
        onSelectPage={(p) => handleNavigate(p)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        recordCount={records.length}
        unbackedCount={unbackedCount}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activePage={activePage}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onStartDigitization={() => handleNavigate('digitization')}
          onQuickSearchRepo={() => handleNavigate('repository')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse"
                  />
                ))}
              </div>
              <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {activePage === 'overview' && (
                <OverviewPage
                  records={records}
                  activities={activities}
                  onNavigate={handleNavigate}
                  onResetDemo={() => setResetConfirmOpen(true)}
                />
              )}

              {activePage === 'repository' && (
                <RepositoryPage
                  key={repositoryTypeFilter}
                  records={records}
                  initialTypeFilter={repositoryTypeFilter}
                  onAddNew={() => {
                    setEditingRecord(null);
                    setFormModalOpen(true);
                  }}
                  onViewDetail={(rec) => setDetailRecord(rec)}
                  onEdit={(rec) => {
                    setEditingRecord(rec);
                    setFormModalOpen(true);
                  }}
                  onDelete={(rec) => setDeleteTarget(rec)}
                />
              )}

              {activePage === 'digitization' && (
                <DigitizationCenterPage
                  records={records}
                  onCompleteDigitization={handleCompleteDigitization}
                  onNavigateToRepository={() => handleNavigate('repository')}
                />
              )}

              {activePage === 'quality-check' && (
                <QualityCheckPage
                  records={records}
                  qualityHistory={qualityHistory}
                  onSaveQualityCheck={handleSaveQualityCheck}
                />
              )}

              {activePage === 'file-management' && (
                <FileManagementPage records={records} />
              )}

              {activePage === 'backup' && (
                <BackupManagementPage
                  records={records}
                  onUpdateBackup={handleUpdateBackup}
                />
              )}

              {activePage === 'rights' && (
                <RightsAndSourcesPage
                  records={records}
                  onUpdateRights={handleUpdateRights}
                />
              )}

              {activePage === 'guides' && <PreservationGuidePage />}
            </>
          )}
        </main>
      </div>

      {/* Add/Edit Dublin Core Modal */}
      <ArchiveFormModal
        open={formModalOpen}
        initialRecord={editingRecord}
        existingIdentifiers={records.map((r) => r.dublinCore.identifier)}
        onClose={() => {
          setFormModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
      />

      {/* Detail Drawer */}
      <ArchiveDetailDrawer
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onEdit={(rec) => {
          setEditingRecord(rec);
          setFormModalOpen(true);
        }}
        onDelete={(rec) => setDeleteTarget(rec)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="Xác nhận xoá bản ghi tư liệu"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xoá hồ sơ "${deleteTarget.dublinCore.identifier} – ${deleteTarget.dublinCore.title}" và toàn bộ tệp đính kèm khỏi kho lưu trữ cục bộ? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xoá bản ghi"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset Demo Data Confirmation */}
      <ConfirmDialog
        open={resetConfirmOpen}
        danger
        title="Khôi phục bộ dữ liệu mẫu"
        description="Thao tác này sẽ đặt lại kho dữ liệu thử nghiệm về 3 hồ sơ mẫu ban đầu trong IndexedDB. Toàn bộ bản ghi và tệp bạn vừa tải lên sẽ bị xoá."
        confirmLabel="Khôi phục mẫu"
        onConfirm={handleConfirmResetDemo}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
