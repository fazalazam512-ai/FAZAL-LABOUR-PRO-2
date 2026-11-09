import React, { useState } from 'react';
import {
  Settings,
  User,
  Moon,
  Sun,
  Globe,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  FolderPlus,
  ShieldCheck,
  LogOut,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';
import { UserProfile, Category, CurrencyCode } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';
import { backblazeService, B2CloudFile } from '../services/backblazeService';
import { storageService } from '../services/storageService';
import { ReceiptModal } from './ReceiptModal';

interface SettingsViewProps {
  profile: UserProfile;
  categories: Category[];
  isDark: boolean;
  onToggleTheme: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onAddCategory: (category: Omit<Category, 'id' | 'isDefault'>) => void;
  onDeleteCategory: (categoryId: string) => void;
  onExportAllData: () => void;
  onImportAllData: (jsonData: string) => boolean;
  onResetData: () => void;
  authEmail?: string | null;
  userId?: string | null;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  categories,
  isDark,
  onToggleTheme,
  onUpdateProfile,
  onAddCategory,
  onDeleteCategory,
  onExportAllData,
  onImportAllData,
  onResetData,
  authEmail,
  userId,
  onLogout,
}) => {
  const [userName, setUserName] = useState(profile?.name || (authEmail ? authEmail.split('@')[0] : 'Expense Manager'));
  const [userEmail, setUserEmail] = useState(profile?.email || authEmail || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || profile?.defaultCurrency || 'PKR');
  const [profileSaved, setProfileSaved] = useState(false);

  // New Category State
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  // Import file ref
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Backblaze B2 Cloud Storage States
  const [b2Status, setB2Status] = useState<{ connected: boolean; message: string } | null>(null);
  const [isTestingB2, setIsTestingB2] = useState(false);
  const [isBackingUpB2, setIsBackingUpB2] = useState(false);
  const [isRestoringB2, setIsRestoringB2] = useState(false);
  const [b2Message, setB2Message] = useState<string | null>(null);
  const [cloudFiles, setCloudFiles] = useState<B2CloudFile[]>([]);
  const [showCloudFiles, setShowCloudFiles] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [previewReceiptFile, setPreviewReceiptFile] = useState<B2CloudFile | null>(null);

  const handleTestB2Connection = async () => {
    setIsTestingB2(true);
    setB2Message(null);
    try {
      const status = await backblazeService.checkConnection();
      if (status.connected) {
        setB2Status({
          connected: true,
          message: `Connected successfully to Backblaze B2 (Bucket: ${status.bucketName}, Endpoint: ${status.endpoint})`,
        });
      } else {
        setB2Status({
          connected: false,
          message: status.error || 'Could not reach Backblaze B2 storage',
        });
      }
    } catch (e: any) {
      setB2Status({
        connected: false,
        message: e?.message || 'Connection test failed',
      });
    } finally {
      setIsTestingB2(false);
    }
  };

  const handleB2CloudBackup = async () => {
    setIsBackingUpB2(true);
    setB2Message(null);
    try {
      const allData = storageService.exportAllData();
      const res = await backblazeService.backupData(JSON.parse(allData), userId || 'user');
      if (res.success) {
        setB2Message('Snapshot successfully uploaded to Backblaze B2 Cloud (Smartexpense)!');
      } else {
        setB2Message(`Backup upload failed: ${res.error}`);
      }
    } catch (err: any) {
      setB2Message(`Backup error: ${err?.message || 'Failed to upload backup'}`);
    } finally {
      setIsBackingUpB2(false);
      setTimeout(() => setB2Message(null), 5000);
    }
  };

  const handleB2CloudRestore = async () => {
    setIsRestoringB2(true);
    setB2Message(null);
    try {
      const data = await backblazeService.fetchLatestBackup(userId || 'user');
      if (data) {
        const ok = onImportAllData(JSON.stringify(data));
        if (ok) {
          setB2Message('Latest cloud backup successfully restored from Backblaze B2!');
        } else {
          setB2Message('Failed to parse cloud backup payload.');
        }
      } else {
        setB2Message('No previous cloud backup found in Backblaze B2 for this account.');
      }
    } catch (err: any) {
      setB2Message(`Cloud restore error: ${err?.message}`);
    } finally {
      setIsRestoringB2(false);
      setTimeout(() => setB2Message(null), 5000);
    }
  };

  const handleLoadCloudFiles = async () => {
    setIsLoadingFiles(true);
    setShowCloudFiles(true);
    try {
      const files = await backblazeService.listFiles();
      setCloudFiles(files);
    } catch (err) {
      console.warn('Failed to load cloud files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: userName.trim(),
      email: userEmail.trim(),
      defaultCurrency: currency,
      currency,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    onAddCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
      subcategories: [],
    });

    setNewCatName('');
    setShowAddCat(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportAllData(content);
        if (success) {
          setImportStatus('Backup restored successfully!');
        } else {
          setImportStatus('Failed to restore backup. Invalid JSON file format.');
        }
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="settings-view" className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <span>Profile & Application Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage identity credentials, currency preferences, categories, and system backups
        </p>
      </div>

      {/* Account & Firebase Authentication Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Account & Authentication</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Firebase Protected
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as <strong className="font-semibold text-slate-700 dark:text-slate-300">{authEmail || profile.name}</strong>
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              id="settings-logout-btn"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Tracker</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">AUTHENTICATED EMAIL</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
              {authEmail || 'Not available'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">ACCOUNT ID (UID)</span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate block">
              {userId || 'Firebase Session'}
            </span>
          </div>
        </div>

        {/* Admin Console Shortcut */}
        <div className="pt-2 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
          <div>
            <strong className="text-xs font-semibold text-slate-900 dark:text-white block">System Admin Panel</strong>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Manage all registered users, Firestore records, and Backblaze B2 storage files</span>
          </div>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = 'admin';
            }}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Launch Admin</span>
          </a>
        </div>
      </div>

      {/* User Profile Form */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>User Profile & Currency</span>
        </h2>

        {profileSaved && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> Profile settings saved successfully.
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                FULL NAME
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                DEFAULT CURRENCY
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                APPEARANCE THEME
              </label>
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between hover:bg-slate-100"
              >
                <span className="font-medium">{isDark ? 'Dark Theme (Active)' : 'Light Theme (Active)'}</span>
                {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="save-profile-btn"
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            Save Profile Settings
          </button>
        </form>
      </div>

      {/* Category Manager */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>Category Management</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize income and expense categorization buckets
            </p>
          </div>

          <button
            id="add-cat-btn"
            onClick={() => setShowAddCat(!showAddCat)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCat && (
          <form onSubmit={handleCreateCategory} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  CATEGORY NAME
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Freelance, Crypto, Pet Care"
                  className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  TYPE
                </label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  COLOR
                </label>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-full h-8 rounded-lg cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCat(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Save Category
              </button>
            </div>
          </form>
        )}

        {/* Existing Categories List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pt-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color}20` }}
                >
                  <CategoryIcon iconName={c.icon} className="w-3.5 h-3.5" color={c.color} />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">
                  {c.name}
                </span>
              </div>

              {!c.isDefault && (
                <button
                  onClick={() => onDeleteCategory(c.id)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                  title="Delete custom category"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backblaze B2 Cloud Storage Integration */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Backblaze B2 Cloud Storage</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  Connected
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Bucket: <strong className="font-semibold text-slate-700 dark:text-slate-300">Smartexpense</strong> (Endpoint: <code className="text-[11px] font-mono">s3.us-east-005.backblazeb2.com</code>)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestB2Connection}
            disabled={isTestingB2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {isTestingB2 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Test Connection</span>
          </button>
        </div>

        {/* Credentials Details Info Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Bucket Name</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Smartexpense</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Bucket ID</span>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate" title="0dd37800427b1ffaae130116">
              0dd37800...116
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Region</span>
            <div className="font-medium text-slate-700 dark:text-slate-300">us-east-005</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Key Name</span>
            <div className="font-medium text-slate-700 dark:text-slate-300 truncate">Master App Key</div>
          </div>
        </div>

        {/* Status Alert */}
        {b2Status && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              b2Status.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {b2Status.connected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{b2Status.message}</span>
          </div>
        )}

        {b2Message && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{b2Message}</span>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleB2CloudBackup}
            disabled={isBackingUpB2}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isBackingUpB2 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
            <span>Backup All Data to Backblaze</span>
          </button>

          <button
            type="button"
            onClick={handleB2CloudRestore}
            disabled={isRestoringB2}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isRestoringB2 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
            <span>Restore Latest from Backblaze</span>
          </button>

          <button
            type="button"
            onClick={handleLoadCloudFiles}
            disabled={isLoadingFiles}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer ml-auto"
          >
            {isLoadingFiles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            <span>{showCloudFiles ? 'Refresh Cloud Files' : 'Browse Stored Files'}</span>
          </button>
        </div>

        {/* Cloud Files Browser Table */}
        {showCloudFiles && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Files Stored in Backblaze B2 ({cloudFiles.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCloudFiles(false)}
                className="text-xs text-slate-400 hover:underline cursor-pointer"
              >
                Hide
              </button>
            </div>

            {cloudFiles.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                {cloudFiles.map((file) => (
                  <div key={file.fileId || file.fileName} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-800 dark:text-slate-200">{file.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {(file.contentLength / 1024).toFixed(1)} KB
                      </span>
                      {file.fileName.includes('receipt') && (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptFile(file)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-sans text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                        >
                          View / Download PNG
                        </button>
                      )}
                      <a
                        href={`/api/b2/download?file=${encodeURIComponent(file.fileName)}`}
                        download
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Download file directly"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {isLoadingFiles ? 'Loading files from Backblaze B2...' : 'No files found in Smartexpense bucket.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Backup, Restore & Reset */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Data Management & Backups
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your financial data is stored securely in your browser&apos;s local storage. You can export complete snapshots or restore from a previous backup anytime.
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            id="export-backup-btn"
            onClick={onExportAllData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Complete JSON Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore from JSON Backup</span>
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            id="reset-demo-btn"
            onClick={onResetData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Empty State</span>
          </button>
        </div>
      </div>

      {/* High-Resolution Zoom & PNG Download Modal for Cloud File */}
      {previewReceiptFile && (
        <ReceiptModal
          isOpen={Boolean(previewReceiptFile)}
          onClose={() => setPreviewReceiptFile(null)}
          imageUrl={previewReceiptFile.downloadUrl || `/api/b2/view?file=${encodeURIComponent(previewReceiptFile.fileName)}`}
          title={previewReceiptFile.fileName}
          date={new Date(previewReceiptFile.uploadTimestamp).toISOString().split('T')[0]}
        />
      )}
    </div>
  );
};
