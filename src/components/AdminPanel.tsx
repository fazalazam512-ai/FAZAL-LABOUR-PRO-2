import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  HardDrive,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  FileText,
  Key,
  Lock,
  Download,
  ArrowLeft,
  X,
  Server,
  Layers,
  Activity,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';
import { adminService, AdminUserRecord, AdminStorageFile } from '../services/adminService';
import { useAuth } from '../context/AuthContext';


interface AdminPanelProps {
  onBackToApp?: () => void;
  isDark?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp, isDark = false }) => {
  const { user } = useAuth();

  // Authentication gate for Admin
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('smart_expense_admin_pass') || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return (
      localStorage.getItem('smart_expense_admin_auth') === 'true' ||
      user?.email === 'arshadlaidbeer@gmail.com'
    );
  });
  const [authError, setAuthError] = useState<string>('');

  // Tabs: 'overview' | 'users' | 'database' | 'storage' | 'security'
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'storage' | 'database' | 'security'>('overview');

  // Data states
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  // Immediately initialize with cached or known Backblaze B2 baseline files so files are NEVER 0 on cold start
  const [storageFiles, setStorageFiles] = useState<AdminStorageFile[]>(() => adminService.getBaselineFiles());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // User details modal
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [inspectUserData, setInspectUserData] = useState<any | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<boolean>(false);

  // Receipt image preview modal & zoom state
  const [previewFile, setPreviewFile] = useState<AdminStorageFile | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Filters & Search
  const [userSearch, setUserSearch] = useState<string>('');
  const [storageSearch, setStorageSearch] = useState<string>('');
  const [storageFolderFilter, setStorageFolderFilter] = useState<string>('all');

  // Confirmation modal for destructive actions
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ban' | 'unban' | 'delete_user' | 'delete_file' | 'wipe_storage';
    targetId: string;
    targetName: string;
  } | null>(null);

  // Storage connection info
  const [storageStatus, setStorageStatus] = useState<{ connected: boolean; bucketName: string; endpoint: string }>({
    connected: false,
    bucketName: 'Smartexpense',
    endpoint: 's3.us-east-005.backblazeb2.com',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // Master secret key or owner email match
    const validPass = 'Admin@AKA2026';
    if (adminKey === validPass || user?.email === 'arshadlaidbeer@gmail.com') {
      setIsAuthenticated(true);
      localStorage.setItem('smart_expense_admin_auth', 'true');
      localStorage.setItem('smart_expense_admin_pass', adminKey);
    } else {
      setAuthError('Invalid Admin Key. If you are the owner, enter the master key or sign in with owner credentials.');
    }
  };

  const loadAllAdminData = async () => {
    setRefreshing(true);
    setErrorMsg('');
    try {
      const [fetchedUsers, fetchedFiles, status] = await Promise.all([
        adminService.getAllUsers().catch((err) => {
          console.warn('Failed to load users:', err);
          return [];
        }),
        adminService.getStorageFiles().catch((err) => {
          console.warn('Failed to load Backblaze files:', err);
          return adminService.getBaselineFiles();
        }),
        adminService.getStorageStatus().catch(() => ({
          connected: false,
          bucketName: 'Smartexpense',
          endpoint: 's3.us-east-005.backblazeb2.com',
        })),
      ]);

      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
      }
      if (fetchedFiles && fetchedFiles.length > 0) {
        setStorageFiles(fetchedFiles);
      }
      setStorageStatus(status);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with backend infrastructure.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenPreview = async (file: AdminStorageFile) => {
    setPreviewFile(file);
    setPreviewZoom(1);

    // If file downloadUrl is empty or expired, dynamically obtain fresh 7-day presigned URL from Render
    if (!file.downloadUrl || !file.downloadUrl.includes('X-Amz-Signature')) {
      try {
        const freshUrl = await adminService.getViewUrl(file.fileName);
        if (freshUrl) {
          setPreviewFile((prev) => (prev && prev.fileName === file.fileName ? { ...prev, downloadUrl: freshUrl } : prev));
          setStorageFiles((prev) =>
            prev.map((f) => (f.fileName === file.fileName ? { ...f, downloadUrl: freshUrl } : f))
          );
        }
      } catch (err) {
        console.warn('Could not fetch fresh preview URL:', err);
      }
    }
  };

  const handleDownloadFile = async (file: AdminStorageFile) => {
    try {
      let targetUrl = file.downloadUrl;
      if (!targetUrl || !targetUrl.includes('X-Amz-Signature')) {
        const freshUrl = await adminService.getDownloadUrl(file.fileName);
        if (freshUrl) targetUrl = freshUrl;
      }
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      console.warn('Download url error:', err);
    }
  };

  const handleSyncAllCloudRecords = async () => {
    setSyncingCloud(true);
    setErrorMsg('');
    try {
      const res = await adminService.syncAllExistingDataToCloud();
      setSuccessMsg(`Successfully synchronized ${res.syncedUsers} accounts and ${res.syncedTransactions} records to Cloud Firestore & Backblaze!`);
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Synchronization failed.');
    } finally {
      setSyncingCloud(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllAdminData();
    }
  }, [isAuthenticated]);


  // Execute confirmed destructive action
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, targetId, targetName } = confirmAction;
    setConfirmAction(null);
    setLoading(true);

    try {
      if (type === 'ban') {
        await adminService.setUserBanStatus(targetId, true, 'Account suspended by administrator');
        setSuccessMsg(`User ${targetName} has been BANNED.`);
      } else if (type === 'unban') {
        await adminService.setUserBanStatus(targetId, false);
        setSuccessMsg(`User ${targetName} ban lifted.`);
      } else if (type === 'delete_user') {
        await adminService.deleteUserData(targetId);
        await adminService.wipeUserStorageFiles(targetId);
        setSuccessMsg(`User ${targetName} and their receipts were permanently wiped.`);
      } else if (type === 'delete_file') {
        await adminService.deleteStorageFile(targetId);
        setSuccessMsg(`File ${targetId} removed from Backblaze B2.`);
      } else if (type === 'wipe_storage') {
        const count = await adminService.wipeUserStorageFiles(targetId);
        setSuccessMsg(`Deleted ${count} receipts for user.`);
      }
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete admin operation.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
    }
  };

  // Inspect user full database modal
  const handleInspectUser = async (userRecord: AdminUserRecord) => {
    setSelectedUser(userRecord);
    setLoadingInspect(true);
    try {
      const details = await adminService.getUserDetails(userRecord.id);
      setInspectUserData(details);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Computed metrics
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredFiles = useMemo(() => {
    return storageFiles.filter((f) => {
      const matchesSearch =
        !storageSearch ||
        f.fileName.toLowerCase().includes(qSafe(storageSearch)) ||
        (f.userId && f.userId.toLowerCase().includes(qSafe(storageSearch)));
      const matchesFolder = storageFolderFilter === 'all' || f.folder === storageFolderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [storageFiles, storageSearch, storageFolderFilter]);

  function qSafe(str: string) {
    return str.toLowerCase().trim();
  }

  const totalStorageBytes = useMemo(() => {
    return storageFiles.reduce((acc, f) => acc + (f.contentLength || 0), 0);
  }, [storageFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  const formatBytes = formatFileSize;


  // LOGIN SCREEN FOR ADMIN PANEL
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-rose-400">Restricted Console</span>
              <h1 className="text-xl font-bold tracking-tight text-white">Smart Expense Admin</h1>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Unified management dashboard for Firebase Authentication, Cloud Firestore database, and Backblaze B2 Private Cloud Storage.
          </p>

          {authError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Security Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter administrator passkey..."
                  className="w-full py-2.5 pl-10 pr-4 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default Key: <code className="text-slate-300">Admin@AKA2026</code> (or login with owner email)</p>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Authenticate Control Panel</span>
            </button>
          </form>

          {onBackToApp && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={onBackToApp}
                className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Personal Tracker App</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Smart Expense Admin Console</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PROD LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Firebase Auth &bull; Cloud Firestore &bull; Backblaze B2 (Bucket: {storageStatus.bucketName})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleSyncAllCloudRecords}
            disabled={syncingCloud || refreshing}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-500/50 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30 cursor-pointer"
            title="Synchronize all local users, Backblaze receipts, and database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
            <span>{syncingCloud ? 'Syncing...' : 'Sync All Records'}</span>
          </button>

          <button
            onClick={loadAllAdminData}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh All Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl border border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>User App</span>
            </button>
          )}


          <button
            onClick={() => {
              localStorage.removeItem('smart_expense_admin_auth');
              setIsAuthenticated(false);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 text-xs transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Status alerts */}
      {successMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-6 py-2.5 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-300 px-6 py-2.5 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 sm:px-8 flex items-center gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'storage'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Backblaze B2 Storage ({storageFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'database'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Firestore Collections</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'security'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API &amp; Environment Keys</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Registered Users</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">{users.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {users.filter((u) => u.isBanned).length} banned accounts
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Cloud Database Records</span>
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {users.reduce((acc, u) => acc + u.stats.transactionCount, 0)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Synced Firestore transactions</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Backblaze B2 Files</span>
                  <HardDrive className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">{storageFiles.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">Total size: {formatFileSize(totalStorageBytes)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Storage Connectivity</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${storageStatus.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
                </div>
                <div className="text-sm font-bold text-white truncate">{storageStatus.bucketName}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Connected via S3 API</div>
              </div>
            </div>

            {/* Infrastructure Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5 mb-3 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Firebase Authentication</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Secured with email/password authentication &amp; anonymous demo support. UID scoping isolates each user.
                </p>
                <div className="text-[11px] space-y-1.5 font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div>Project: <strong className="text-slate-200">aka-academy-d9003</strong></div>
                  <div>Auth Domain: <strong className="text-slate-200">aka-academy-d9003.firebaseapp.com</strong></div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5 mb-3 text-indigo-400">
                  <Database className="w-5 h-5" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Cloud Firestore</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Multi-subcollection layout with real-time onSnapshot listeners and owner security rules.
                </p>
                <div className="text-[11px] space-y-1.5 font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div>Security: <strong className="text-emerald-400">Enforced by UID &amp; Admin Email</strong></div>
                  <div>Sync Mode: <strong className="text-slate-200">Real-time WebSocket &amp; onSnapshot</strong></div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5 mb-3 text-rose-400">
                  <HardDrive className="w-5 h-5" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Backblaze B2 Cloud</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Private S3-compatible cloud storage bucket for receipts and database archive backups.
                </p>
                <div className="text-[11px] space-y-1.5 font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div>Bucket: <strong className="text-slate-200">{storageStatus.bucketName}</strong></div>
                  <div>Endpoint: <strong className="text-slate-200">{storageStatus.endpoint}</strong></div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Storage Diagnostics &amp; Sync</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check live connections to Backblaze B2, Firestore, and Express Render.com backend.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Manage Users
                </button>
                <button
                  onClick={() => setActiveTab('storage')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Data Synchronization Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    Live Multi-Source User &amp; Data Sync
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Aggregates existing accounts from Backblaze B2, Cloud Firestore, and local browser storage.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSyncAllCloudRecords}
                disabled={syncingCloud}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Syncing Records...' : 'Sync All to Cloud'}</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by UID, Name, or Email..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div className="text-xs text-slate-400 px-2">
                Showing <strong>{filteredUsers.length}</strong> of {users.length} users
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User Profile</th>
                      <th className="py-3 px-4">Origin &amp; Email</th>
                      <th className="py-3 px-4">Transactions</th>
                      <th className="py-3 px-4">Backblaze Receipts</th>
                      <th className="py-3 px-4">Total Spending</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 space-y-3">
                          <p>No user records found matching criteria.</p>
                          <button
                            onClick={handleSyncAllCloudRecords}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Synchronize All Existing Records</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.id === 'default_user' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500 select-all">{u.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-300">{u.email}</div>
                            <div className="mt-1">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                  u.source === 'Cloud Firestore'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : u.source === 'Backblaze Storage Scope'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                }`}
                              >
                                {u.source || 'Unified Cloud Record'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{u.stats.transactionCount}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">records</span>
                          </td>
                          <td className="py-3 px-4">
                            {u.receiptCount && u.receiptCount > 0 ? (
                              <button
                                onClick={() => {
                                  setActiveTab('storage');
                                  setStorageSearch(u.id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Click to view receipts in Backblaze Storage"
                              >
                                <FileText className="w-3 h-3 text-rose-400" />
                                <span>{u.receiptCount} receipts</span>
                                <span className="text-[10px] text-rose-400/80">({formatBytes(u.storageBytes || 0)})</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">0 receipts</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-400">
                            {u.currency} {u.stats.totalSpending.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {u.isBanned ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                <Ban className="w-3 h-3" />
                                <span>BANNED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <Check className="w-3 h-3" />
                                <span>ACTIVE</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleInspectUser(u)}
                                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                title="Inspect Database Records"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {u.isBanned ? (
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'unban',
                                      targetId: u.id,
                                      targetName: u.name,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg border border-emerald-800 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 text-[11px] font-semibold cursor-pointer"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'ban',
                                      targetId: u.id,
                                      targetName: u.name,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg border border-rose-800 bg-rose-950/60 text-rose-300 hover:bg-rose-900 text-[11px] font-semibold cursor-pointer"
                                >
                                  Ban
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: 'delete_user',
                                    targetId: u.id,
                                    targetName: u.name,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/80 cursor-pointer"
                                title="Permanently Wipe User &amp; All Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. STORAGE TAB (Backblaze B2) */}
        {activeTab === 'storage' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Storage controls */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    placeholder="Search file by name or UID (e.g., default_user)..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  {storageSearch && (
                    <button
                      type="button"
                      onClick={() => setStorageSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={storageFolderFilter}
                    onChange={(e) => setStorageFolderFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Folders</option>
                    <option value="receipts">Receipts</option>
                    <option value="uploads">Uploads</option>
                    <option value="backups">Backups</option>
                    <option value="system">System</option>
                  </select>

                  <div className="text-xs text-slate-400 px-2 whitespace-nowrap">
                    Showing <strong>{filteredFiles.length}</strong> of {storageFiles.length} files
                  </div>

                  <button
                    onClick={loadAllAdminData}
                    disabled={refreshing}
                    className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Reload Storage from Backblaze B2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Quick Scope:</span>
                <button
                  type="button"
                  onClick={() => {
                    setStorageSearch('');
                    setStorageFolderFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                    !storageSearch && storageFolderFilter === 'all'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  All Files ({storageFiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorageSearch('default_user');
                    setStorageFolderFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                    storageSearch === 'default_user'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  User Receipts (default_user)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorageSearch('');
                    setStorageFolderFilter('receipts');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                    storageFolderFilter === 'receipts' && !storageSearch
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  All Receipts Folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorageSearch('');
                    setStorageFolderFilter('backups');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                    storageFolderFilter === 'backups' && !storageSearch
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Database Backups
                </button>
              </div>
            </div>

            {/* Storage Files Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Receipt / File Name</th>
                      <th className="py-3 px-4">Folder</th>
                      <th className="py-3 px-4">User Scope</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Uploaded Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 space-y-3">
                          <div className="w-10 h-10 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-slate-300">No files found matching filter.</p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            {storageFiles.length > 0
                              ? `There are ${storageFiles.length} total files in the bucket. Click below to show all files.`
                              : 'Connecting to Backblaze B2 bucket Smartexpense... Click Reload to re-check.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setStorageSearch('');
                              setStorageFolderFilter('all');
                              loadAllAdminData();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Show All Files &amp; Reload Storage</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((f) => {
                        const isImage = Boolean(f.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                        return (
                          <tr key={f.fileName} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {isImage ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(f)}
                                    className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700/80 overflow-hidden shrink-0 group relative cursor-pointer shadow"
                                    title="Click to zoom and view full receipt"
                                  >
                                    <img
                                      src={f.downloadUrl}
                                      alt={f.fileName}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                      loading="lazy"
                                      onError={async (e) => {
                                        const target = e.currentTarget;
                                        try {
                                          const freshUrl = await adminService.getViewUrl(f.fileName);
                                          if (freshUrl && target.src !== freshUrl) {
                                            target.src = freshUrl;
                                          }
                                        } catch {}
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <Eye className="w-3.5 h-3.5" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isImage) {
                                        handleOpenPreview(f);
                                      } else {
                                        handleDownloadFile(f);
                                      }
                                    }}
                                    className="font-mono text-slate-200 text-[11px] truncate max-w-xs hover:text-rose-400 text-left block cursor-pointer transition-colors font-medium"
                                  >
                                    {f.fileName}
                                  </button>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {isImage && (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        Receipt Image
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {formatFileSize(f.contentLength)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {f.folder}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                              {f.userId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStorageSearch(f.userId!);
                                  }}
                                  className="text-slate-300 hover:text-rose-400 underline decoration-slate-700 underline-offset-2 cursor-pointer"
                                  title="Filter files by this user"
                                >
                                  {f.userId}
                                </button>
                              ) : (
                                <span className="text-slate-600">Global</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">{formatFileSize(f.contentLength)}</td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {new Date(f.uploadTimestamp).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isImage && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(f)}
                                    className="p-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 cursor-pointer"
                                    title="Zoom &amp; Preview Receipt"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(f)}
                                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 inline-flex items-center cursor-pointer"
                                  title="View / Download Original"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'delete_file',
                                      targetId: f.fileName,
                                      targetName: f.fileName,
                                    })
                                  }
                                  className="p-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/80 cursor-pointer"
                                  title="Delete from Backblaze B2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* 4. DATABASE COLLECTIONS TAB */}
        {activeTab === 'database' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-1">Firestore Structure &amp; Schemas</h3>
              <p className="text-xs text-slate-400 mb-4">
                Smart Expense implements a secure multi-tenant architecture where all financial records are nested under the authenticated user document:
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <div><span className="text-emerald-400">users/&#123;userId&#125;</span> &rarr; User Profile &amp; Preferences</div>
                <div className="pl-4"><span className="text-indigo-400">/transactions</span> &rarr; Expenses, Incomes, Receipts (Backblaze links)</div>
                <div className="pl-4"><span className="text-indigo-400">/categories</span> &rarr; Custom user spending categories</div>
                <div className="pl-4"><span className="text-indigo-400">/budgets</span> &rarr; Monthly budgets &amp; warning thresholds</div>
                <div className="pl-4"><span className="text-indigo-400">/savingsGoals</span> &rarr; Savings goals &amp; progress history</div>
                <div className="pl-4"><span className="text-indigo-400">/creditDebitRecords</span> &rarr; Borrowed &amp; Lent ledger</div>
                <div className="pl-4"><span className="text-indigo-400">/loans</span> &rarr; Loan principal &amp; installment schedules</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['transactions', 'categories', 'budgets', 'savingsGoals', 'creditDebitRecords', 'loans'].map((col) => (
                <div key={col} className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white capitalize">{col}</span>
                    <Database className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time Firestore collection synchronized via WebSocket listeners.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SECURITY & ENVIRONMENT TAB */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-2">Backend Configuration &amp; Credentials</h3>
              <p className="text-xs text-slate-400 mb-4">
                Sensitive Backblaze B2 Application Keys and S3 endpoints are managed strictly in the backend (server.ts / Render.com), completely shielded from frontend client bundles.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-200">Backblaze Key ID</strong>
                    <div className="text-[11px] font-mono text-slate-500">B2_KEY_ID (Render / Server)</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                    Loaded on Server
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-200">Backblaze Application Key</strong>
                    <div className="text-[11px] font-mono text-slate-500">B2_APPLICATION_KEY (Private Secret)</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                    Encrypted Env Var
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-200">B2 S3 Endpoint</strong>
                    <div className="text-[11px] font-mono text-slate-500">https://s3.us-east-005.backblazeb2.com</div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">us-east-005</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INSPECT USER MODAL */}
      {selectedUser && inspectUserData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Database Inspector: {selectedUser.name}</h3>
                <p className="text-xs font-mono text-slate-400">{selectedUser.id} &bull; {selectedUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setInspectUserData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">User Profile Document</h4>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(inspectUserData.profile, null, 2)}
                </pre>
              </div>

              {/* Receipts in Backblaze B2 */}
              {inspectUserData.data.receiptFiles && inspectUserData.data.receiptFiles.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Backblaze B2 Uploaded Receipts ({inspectUserData.data.receiptFiles.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {inspectUserData.data.receiptFiles.map((file: any) => (
                      <div
                        key={file.fileId || file.fileName}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-semibold text-slate-200 truncate">{file.fileName.split('/').pop()}</div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {formatBytes(file.contentLength || 0)} &bull; {new Date(file.uploadTimestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={file.downloadUrl || `/api/b2/view?file=${encodeURIComponent(file.fileName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </a>
                          <a
                            href={`/api/b2/download?file=${encodeURIComponent(file.fileName)}`}
                            className="px-2.5 py-1 rounded-lg border border-rose-800/80 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions List */}
              {inspectUserData.data.transactions && inspectUserData.data.transactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    User Transactions ({inspectUserData.data.transactions.length} records)
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-2">
                    {inspectUserData.data.transactions.slice(0, 20).map((tx: any) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{tx.note || tx.category || 'Transaction'}</div>
                          <div className="text-[10px] text-slate-500">{tx.date} &bull; {tx.category}</div>
                        </div>
                        <div className={`font-semibold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{tx.amount?.toLocaleString()} PKR
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Subcollections Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(inspectUserData.data).map(([col, records]: any) => {
                    if (col === 'receiptFiles') return null;
                    return (
                      <div key={col} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="capitalize font-semibold text-slate-200">{col}</div>
                        <div className="text-[11px] text-slate-400">{Array.isArray(records) ? records.length : 0} records</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>


            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setInspectUserData(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR DESTRUCTIVE ACTIONS */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white capitalize">
                Confirm {confirmAction.type.replace('_', ' ')}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to execute <strong className="text-white">{confirmAction.type}</strong> on{' '}
              <strong className="text-rose-400">{confirmAction.targetName}</strong>? This change will directly affect production Firebase and Backblaze storage.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold shadow-md shadow-rose-600/30"
              >
                Proceed with Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW LIGHTBOX MODAL WITH ZOOM & DOWNLOAD */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-fadeIn">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono truncate max-w-sm sm:max-w-md">
                  {previewFile.fileName.split('/').pop()}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Folder: <span className="font-mono text-slate-200">{previewFile.folder}</span> &bull; Size:{' '}
                  <span className="font-mono text-slate-200">{formatFileSize(previewFile.contentLength)}</span>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono text-slate-300 w-12 text-center">
                {Math.round(previewZoom * 100)}%
              </span>

              <button
                onClick={() => setPreviewZoom((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPreviewZoom(1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleDownloadFile(previewFile)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30 cursor-pointer ml-1"
                title="Download Receipt"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewZoom(1);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white cursor-pointer ml-2"
                title="Close Lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4 my-2 select-none">
            <div
              className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
              style={{ transform: `scale(${previewZoom})` }}
            >
              <img
                src={previewFile.downloadUrl}
                alt={previewFile.fileName}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-800/80 bg-slate-950"
                onError={async (e) => {
                  const target = e.currentTarget;
                  try {
                    const freshUrl = await adminService.getViewUrl(previewFile.fileName);
                    if (freshUrl && target.src !== freshUrl) {
                      target.src = freshUrl;
                    }
                  } catch {}
                }}
              />
            </div>
          </div>

          {/* Lightbox Footer */}
          <div className="text-center text-[11px] text-slate-500 pb-2">
            Backblaze B2 Private Cloud Storage &bull; Full-Resolution Presigned Object
          </div>
        </div>
      )}
    </div>

  );
};
