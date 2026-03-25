/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Home, Camera, History, User, ChevronRight, Verified, Upload, X, Loader2, Zap, Image as ImageIcon, RotateCcw, Play, FileUp, Cpu, CheckCircle2, Circle, Hourglass, Database, Search, CalendarDays, Clock3, Check, Bell, Menu, Pencil, BarChart3, SlidersHorizontal, Wifi, WifiOff, Cloud, HardDrive, Download, Trash2, RefreshCw, Smartphone, Monitor, Shield, Lock, Info, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanResult, MOCK_SCANS, LEATHER_CATEGORIES, AVG_PRECISION } from './types';
import { classifyLeather } from './services/gemini';

type View = 'home' | 'scan' | 'history' | 'profile' | 'result';
type Language = 'zh' | 'en';
type Theme = 'dark' | 'light';
const HISTORY_STORAGE_KEY = 'leather_history';
const MAX_HISTORY_ITEMS = 30;
const MAX_PERSISTED_ITEMS = 30;
const UI_LANG_KEY = 'ui_language';
const UI_THEME_KEY = 'ui_theme';
const UI_PREF_KEY = 'ui_profile_prefs';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const historyEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/history` : '/api/history';

function getPreviewUrl(scan: ScanResult) {
  const fallback = (scan.matches?.[0] as any)?.referenceUrl as string | undefined;
  return scan.imageUrl || fallback || '';
}

function sanitizeForStorage(scans: ScanResult[]) {
  // Keep history bounded so storage remains stable across refreshes.
  return scans.slice(0, MAX_PERSISTED_ITEMS).map((scan) => ({
    ...scan
  }));
}

function persistHistorySafely(scans: ScanResult[]) {
  let candidate = sanitizeForStorage(scans);

  while (candidate.length > 0) {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(candidate));
      return;
    } catch {
      candidate = candidate.slice(0, Math.max(1, Math.floor(candidate.length / 2)));
    }
  }

  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

function createThumbnailDataUrl(dataUrl: string, maxSide = 512, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl?.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function detectDeviceLabel() {
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function formatToMinute(timestamp: number) {
  const dt = new Date(timestamp);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function formatHistoryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatHistoryTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function App() {
  const SCAN_FRAME = { xPct: 0.22, yPct: 0.22, widthPct: 0.56, heightPct: 0.42 };
  const SCAN_CONTAINER_ASPECT = 4 / 5;
  const FRAME_SCALE_MIN = 0.7;
  const FRAME_SCALE_MAX = 1.3;
  const FRAME_SCALE_STEP = 0.05;
  const [currentView, setCurrentView] = useState<View>('home');
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(8);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanDraftImage, setScanDraftImage] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [frameScale, setFrameScale] = useState(1);
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [historySyncMode, setHistorySyncMode] = useState<'server' | 'local'>('local');
  const [historySearch, setHistorySearch] = useState('');
  const [defaultSort, setDefaultSort] = useState<'newest' | 'confidence' | 'name'>('newest');
  const [autoSaveHistory, setAutoSaveHistory] = useState(true);
  const [hdPreviewEnabled, setHdPreviewEnabled] = useState(true);
  const [hapticFeedbackEnabled, setHapticFeedbackEnabled] = useState(false);
  const [cameraPermissionState, setCameraPermissionState] = useState<'authorized' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(historyEndpoint);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.history)) {
            setHistorySyncMode('server');
            setHistory(data.history.slice(0, MAX_HISTORY_ITEMS));
            setLastSyncAt(Date.now());
            return;
          }
        }
      } catch {
        // Fallback to local cache if server is unavailable.
      }
      setHistorySyncMode('local');

      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!saved) {
        setHistory(MOCK_SCANS);
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        } else {
          setHistory(MOCK_SCANS);
        }
      } catch {
        setHistory(MOCK_SCANS);
      }
    };

    void loadHistory();
  }, []);

  useEffect(() => {
    if (!autoSaveHistory) return;
    persistHistorySafely(history);
  }, [history, autoSaveHistory]);

  useEffect(() => {
    const validIds = new Set(history.map((item) => item.id));
    setSelectedHistoryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [history]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(UI_LANG_KEY);
    const savedTheme = localStorage.getItem(UI_THEME_KEY);
    const savedPrefs = localStorage.getItem(UI_PREF_KEY);
    if (savedLanguage === 'zh' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
    }
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.defaultSort === 'newest' || prefs.defaultSort === 'confidence' || prefs.defaultSort === 'name') setDefaultSort(prefs.defaultSort);
        if (typeof prefs.autoSaveHistory === 'boolean') setAutoSaveHistory(prefs.autoSaveHistory);
        if (typeof prefs.hdPreviewEnabled === 'boolean') setHdPreviewEnabled(prefs.hdPreviewEnabled);
        if (typeof prefs.hapticFeedbackEnabled === 'boolean') setHapticFeedbackEnabled(prefs.hapticFeedbackEnabled);
      } catch {
        // ignore invalid prefs cache
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(UI_LANG_KEY, language);
    document.title = language === 'zh' ? '革识' : 'LeatherMind';
  }, [language]);

  useEffect(() => {
    localStorage.setItem(UI_THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(UI_PREF_KEY, JSON.stringify({
      defaultSort,
      autoSaveHistory,
      hdPreviewEnabled,
      hapticFeedbackEnabled,
    }));
  }, [defaultSort, autoSaveHistory, hdPreviewEnabled, hapticFeedbackEnabled]);

  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        if (!navigator.permissions || !navigator.permissions.query) {
          setCameraPermissionState('unknown');
          return;
        }
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const normalized = (result.state as 'granted' | 'denied' | 'prompt');
        if (normalized === 'granted') setCameraPermissionState('authorized');
        else if (normalized === 'denied') setCameraPermissionState('denied');
        else setCameraPermissionState('prompt');
      } catch {
        setCameraPermissionState('unknown');
      }
    };
    void checkCameraPermission();
  }, []);

  const text = language === 'zh' ? {
    appName: '革识',
    allowCamera: '请允许摄像头权限后再扫描。',
    modelReady: '模型已就绪：AI 材质分析在线',
    heroTitle: '皮革纹理识别',
    heroDesc: `使用 AI 在 ${LEATHER_CATEGORIES} 个类别中识别皮革材质`,
    scanLeather: '扫描皮革',
    uploadGallery: '从相册上传',
    database: '数据库',
    categoriesDesc: '已收录皮革类别',
    precision: '精度',
    precisionDesc: '平均识别置信度',
    recentScans: '最近识别',
    recentScansDesc: '你的历史识别记录',
    viewAll: '查看全部',
    analysisResult: '分析结果',
    analyzing: '正在分析纹理...',
    topMatches: 'Top 匹配',
    done: '完成',
    scanHistory: '识别历史',
    clearHistory: '清空历史',
    clearConfirm: '确认清空所有历史记录吗？',
    navHome: '首页',
    navScan: '扫描',
    navHistory: '历史',
    navProfile: '我的',
    confidence: '置信度',
    archive: 'ARCHIVE',
    searchHistory: '搜索材质或日期...',
    totalScans: 'TOTAL SCANS',
    avgAccuracy: 'ACCURACY',
    profileTitle: '个人中心',
    profileStatus: '使用本地历史模式',
    editProfile: '编辑资料',
    performanceAnalytics: '性能分析',
    totalScansCard: '总识别次数',
    avgConfCard: '平均置信度',
    thisWeekCard: '本周识别',
    lastScanCard: '最近识别',
    appPreferences: '应用偏好',
    prefTheme: '主题',
    prefLanguage: '语言',
    prefSort: '默认排序',
    prefAutoSave: '自动保存历史',
    prefHdPreview: '高清预览',
    prefHaptic: '震动反馈',
    sortNewest: '最新优先',
    sortConfidence: '置信度优先',
    sortName: '名称优先',
    themeDark: '深色',
    themeLight: '浅色',
    langZh: '中文',
    langEn: 'English',
    profileUserName: 'Marcus Thorne',
    profileUserEmail: 'm.thorne@leathermind.ai',
    profileRole: '高级检验员',
    serverMode: '服务器模式',
    localMode: '本地模式',
    serverModeShort: '服务器',
    localModeShort: '本地',
    favorites: '收藏',
    noRecordsYet: '暂无记录',
    mobile: '移动端',
    desktop: '桌面端',
    denied: '已拒绝',
    prompt: '待授权',
    unknown: '未知',
    deployLocal: '本地',
    deployTunnel: '隧道',
    deployRender: 'Render',
    deployGithubPages: 'GitHub Pages',
    privacyPolicy: '隐私政策与服务条款',
    infraSync: '基础设施与同步',
    historyMode: '历史模式',
    connection: '连接状态',
    backendUrl: '后端地址',
    syncStatus: '同步状态',
    upToDate: '已同步',
    connected: '已连接',
    offline: '离线',
    dataManagement: '数据管理',
    exportHistory: '导出历史 (.json)',
    syncToServer: '同步到服务器',
    clearLocalCache: '清理本地缓存',
    preferencesProfile: '识别偏好',
    mostIdentified: '最常识别',
    highConfidenceRate: '高置信度占比',
    recentSummaries: '最近 3 条识别摘要',
    environment: '环境',
    device: '设备',
    cameraGallery: '相机/相册',
    deployment: '部署环境',
    authorized: '已授权',
    security: '安全',
    sessionActive: '会话正常',
    twoFaEnabled: '已启用 2FA',
    teamAccess: '团队访问',
    aboutApp: '关于应用',
    appVersion: '应用版本',
    modelVersion: '模型版本',
    buildNumber: '构建号',
    logout: '退出登录',
  } : {
    appName: 'LeatherMind',
    allowCamera: 'Please allow camera access to scan leather.',
    modelReady: 'Model Ready: AI-driven analysis online.',
    heroTitle: 'Leather Texture Classifier',
    heroDesc: `Identify leather materials across ${LEATHER_CATEGORIES} categories with AI precision.`,
    scanLeather: 'Scan Leather',
    uploadGallery: 'Upload from Gallery',
    database: 'Database',
    categoriesDesc: 'Leather categories cataloged.',
    precision: 'Precision',
    precisionDesc: 'Average AI confidence score.',
    recentScans: 'Recent Scans',
    recentScansDesc: 'Your previous material classifications',
    viewAll: 'View All',
    analysisResult: 'Analysis Result',
    analyzing: 'Analyzing Texture...',
    topMatches: 'Top Matches',
    done: 'Done',
    scanHistory: 'Scan History',
    clearHistory: 'Clear History',
    clearConfirm: 'Clear all saved scan history?',
    navHome: 'Home',
    navScan: 'Scan',
    navHistory: 'History',
    navProfile: 'Profile',
    confidence: 'confidence',
    archive: 'ARCHIVE',
    searchHistory: 'Search materials or dates...',
    totalScans: 'TOTAL SCANS',
    avgAccuracy: 'ACCURACY',
    profileTitle: 'Profile',
    profileStatus: 'Using local history mode',
    editProfile: 'Edit Profile',
    performanceAnalytics: 'PERFORMANCE ANALYTICS',
    totalScansCard: 'TOTAL SCANS',
    avgConfCard: 'AVG. CONF.',
    thisWeekCard: 'THIS WEEK',
    lastScanCard: 'LAST SCAN',
    appPreferences: 'APPLICATION PREFERENCES',
    prefTheme: 'Theme',
    prefLanguage: 'Language',
    prefSort: 'Default Sort',
    prefAutoSave: 'Auto-save History',
    prefHdPreview: 'HD Preview',
    prefHaptic: 'Haptic Feedback',
    sortNewest: 'Newest First',
    sortConfidence: 'Confidence First',
    sortName: 'Name First',
    themeDark: 'Dark',
    themeLight: 'Light',
    langZh: '中文',
    langEn: 'English',
    profileUserName: 'Marcus Thorne',
    profileUserEmail: 'm.thorne@leathermind.ai',
    profileRole: 'Senior Inspector',
    serverMode: 'Server Mode',
    localMode: 'Local Mode',
    serverModeShort: 'Server',
    localModeShort: 'Local',
    favorites: 'Favorites',
    noRecordsYet: 'No records yet.',
    mobile: 'Mobile',
    desktop: 'Desktop',
    denied: 'Denied',
    prompt: 'Prompt',
    unknown: 'Unknown',
    deployLocal: 'Local',
    deployTunnel: 'Tunnel',
    deployRender: 'Render',
    deployGithubPages: 'GitHub Pages',
    privacyPolicy: 'Privacy Policy & EULA',
    infraSync: 'INFRASTRUCTURE & SYNC',
    historyMode: 'History Mode',
    connection: 'Connection',
    backendUrl: 'Backend URL',
    syncStatus: 'Sync Status',
    upToDate: 'Up to date',
    connected: 'Connected',
    offline: 'Offline',
    dataManagement: 'DATA MANAGEMENT',
    exportHistory: 'Export History (.json)',
    syncToServer: 'Sync to Server',
    clearLocalCache: 'Clear Local Cache',
    preferencesProfile: 'MY RECOGNITION PREFERENCES',
    mostIdentified: 'Most Identified',
    highConfidenceRate: 'High Confidence Rate',
    recentSummaries: 'Recent 3 Summaries',
    environment: 'ENVIRONMENT',
    device: 'Device',
    cameraGallery: 'Camera/Gallery',
    deployment: 'Deployment',
    authorized: 'Authorized',
    security: 'SECURITY',
    sessionActive: 'Session Active',
    twoFaEnabled: '2FA Enabled',
    teamAccess: 'Team Access',
    aboutApp: 'ABOUT',
    appVersion: 'App Version',
    modelVersion: 'Model Version',
    buildNumber: 'Build',
    logout: 'Terminate Session',
  };
  const deviceLabel = language === 'zh' ? '设备' : 'Device';
  const timeLabel = language === 'zh' ? '时间' : 'Time';
  const noteLabel = language === 'zh' ? '备注' : 'Note';
  const editNoteLabel = language === 'zh' ? '备注' : 'Note';
  const deleteItemLabel = language === 'zh' ? '删除' : 'Delete';
  const deleteItemConfirm = language === 'zh' ? '确认删除这条历史记录吗？' : 'Delete this history item?';
  const selectAllLabel = language === 'zh' ? '全选' : 'Select All';
  const clearSelectLabel = language === 'zh' ? '取消全选' : 'Clear';
  const deleteSelectedLabel = language === 'zh' ? '删除已选' : 'Delete Selected';
  const deleteSelectedConfirm = language === 'zh' ? '确认删除已选历史记录吗？' : 'Delete selected history items?';
  const deleteFailedMsg = language === 'zh' ? '删除失败：后端未成功保存，请稍后重试。' : 'Delete failed: server did not persist the change.';

  const scanText = language === 'zh'
    ? {
        liveScanner: '实时扫描',
        scanWorkspace: '扫描工作台',
        optimalDistance: '最佳距离',
        distanceGuide: '距表面 8-12 厘米',
        capture: '拍照',
        takePhoto: '拍照',
        gallery: '相册',
        qualityTipTitle: '拍摄质量提示',
        qualityTipBody: '请拍摄清晰的皮革近景纹理，避免强反光和重阴影。',
        retake: '重拍',
        startAnalysis: '开始分析',
        frameSize: '取景框大小',
      }
    : {
        liveScanner: 'Live Scanner',
        scanWorkspace: 'Scan Workspace',
        optimalDistance: 'Optimal Distance',
        distanceGuide: '8-12 cm from surface',
        capture: 'Capture',
        takePhoto: 'Take Photo',
        gallery: 'Gallery',
        qualityTipTitle: 'Capture Quality Tip',
        qualityTipBody: 'Use a clear close-up texture image. Avoid heavy glare and deep shadow.',
        retake: 'Retake',
        startAnalysis: 'Start Analysis',
        frameSize: 'Frame Size',
      };
  const resultText = language === 'zh'
    ? {
        bestMatch: '最佳匹配',
        aiConfidenceMetric: 'AI 置信度',
        visualVerification: '视觉校验',
        yourScan: '你的扫描',
        reference: '参考样本',
        top3Similar: 'Top 3 相似匹配',
        noReference: '暂无参考图',
        tapToZoom: '点击查看高清',
        processingTitle: '正在处理材质数据',
        processingBody: '正在基于本地皮革数据库进行精确分类比对。',
        neuralLoad: '神经负载',
        optimizing: '优化中...',
        stage1: '提取纹理特征...',
        stage2: '匹配本地训练类别...',
        stage3: '计算置信度分数...',
        qualityHigh: '质量指数: 高',
        aiConfidence: 'AI 置信度',
        latency: '延迟',
      }
    : {
        bestMatch: 'Best Match',
        aiConfidenceMetric: 'AI Confidence',
        visualVerification: 'Visual Verification',
        yourScan: 'Your Scan',
        reference: 'Reference',
        top3Similar: 'Top 3 Similar Matches',
        noReference: 'No Reference Image',
        tapToZoom: 'Tap to view HD',
        processingTitle: 'Processing Material Data',
        processingBody: 'Cross-referencing local leather database for precise classification.',
        neuralLoad: 'Neural Logic Load',
        optimizing: 'Optimizing...',
        stage1: 'Extracting texture features...',
        stage2: 'Matching against local trained classes...',
        stage3: 'Calculating confidence score...',
        qualityHigh: 'Quality Index: High',
        aiConfidence: 'AI Confidence',
        latency: 'Latency',
      };
  const scaledWidth = SCAN_FRAME.widthPct * frameScale;
  const scaledHeight = SCAN_FRAME.heightPct * frameScale;
  const frameWidthPct = Math.min(0.9, Math.max(0.2, scaledWidth));
  const frameHeightPct = Math.min(0.8, Math.max(0.15, scaledHeight));
  const scanFrame = {
    xPct: SCAN_FRAME.xPct + (SCAN_FRAME.widthPct - frameWidthPct) / 2,
    yPct: SCAN_FRAME.yPct + (SCAN_FRAME.heightPct - frameHeightPct) / 2,
    widthPct: frameWidthPct,
    heightPct: frameHeightPct,
  };
  const bestMatch = lastScan?.matches?.[0] ?? null;
  const similarMatches = lastScan?.matches?.slice(0, 3) ?? [];
  const filteredHistory = [...history.filter(matchesHistorySearch)].sort((a, b) => {
    if (defaultSort === 'confidence') {
      return (b.matches?.[0]?.confidence || 0) - (a.matches?.[0]?.confidence || 0);
    }
    if (defaultSort === 'name') {
      return (a.matches?.[0]?.label || '').localeCompare(b.matches?.[0]?.label || '');
    }
    return b.timestamp - a.timestamp;
  });
  const filteredHistoryIds = filteredHistory.map((item) => item.id);
  const allVisibleSelected = filteredHistoryIds.length > 0 && filteredHistoryIds.every((id) => selectedHistoryIds.includes(id));
  const avgAccuracy = history.length
    ? history.reduce((sum, item) => sum + (item.matches?.[0]?.confidence || 0), 0) / history.length
    : 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekScans = history.filter((item) => item.timestamp >= weekAgo).length;
  const lastScanTimeAgo = history.length ? formatTimeAgo(history[0].timestamp) : '--';
  const mostIdentifiedLabel = history.length
    ? (Object.entries(
        history.reduce<Record<string, number>>((acc, item) => {
          const key = item.matches?.[0]?.label || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
    : '--';
  const highConfidenceRate = history.length
    ? Math.round((history.filter((item) => (item.matches?.[0]?.confidence || 0) >= 90).length / history.length) * 100)
    : 0;
  const deploymentLabel = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!host) return text.unknown;
    if (host.includes('localhost') || host === '127.0.0.1') return text.deployLocal;
    if (host.includes('trycloudflare.com') || host.includes('yanyihan.top')) return text.deployTunnel;
    if (host.includes('onrender.com')) return text.deployRender;
    if (host.includes('github.io')) return text.deployGithubPages;
    return host;
  })();
  const currentDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? text.mobile : text.desktop;
  const cameraPermissionLabel =
    cameraPermissionState === 'authorized'
      ? text.authorized
      : cameraPermissionState === 'denied'
      ? text.denied
      : cameraPermissionState === 'prompt'
      ? text.prompt
      : text.unknown;
  const stage1Done = analysisProgress >= 36;
  const stage2Done = analysisProgress >= 72;
  const stage3Done = analysisProgress >= 96;
  const pseudoConfidence = bestMatch?.confidence ?? Math.max(84, Math.round(analysisProgress * 0.98));
  const pseudoLatency = 38 + Math.round((100 - analysisProgress) * 0.2);

  useEffect(() => {
    if (!isScanning) {
      setAnalysisProgress(8);
      return;
    }
    setAnalysisProgress(12);
    const timer = window.setInterval(() => {
      setAnalysisProgress((prev) => {
        const capped = 94;
        const step = prev < 45 ? 5.5 : prev < 75 ? 2.8 : 1.2;
        return Math.min(capped, prev + step + Math.random() * 1.4);
      });
    }, 320);
    return () => window.clearInterval(timer);
  }, [isScanning]);

  const refreshHistoryFromServer = async () => {
    if (historySyncMode !== 'server') return false;
    try {
      const response = await fetch(historyEndpoint);
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data?.history)) return false;
      setHistory(data.history.slice(0, MAX_HISTORY_ITEMS));
      setLastSyncAt(Date.now());
      return true;
    } catch {
      return false;
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!window.confirm(deleteItemConfirm)) return;
    const previousHistory = history;
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setSelectedHistoryIds((prev) => prev.filter((v) => v !== id));
    if (lastScan?.id === id) {
      setLastScan(null);
      setCurrentView('home');
    }
    if (historySyncMode !== 'server') return;
    try {
      const res = await fetch(`${historyEndpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
      await refreshHistoryFromServer();
    } catch {
      setHistory(previousHistory);
      alert(deleteFailedMsg);
    }
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  function matchesHistorySearch(scan: ScanResult) {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    const label = (scan.matches?.[0]?.label || '').toLowerCase();
    const note = (scan.note || '').toLowerCase();
    const date = formatHistoryDate(scan.timestamp).toLowerCase();
    const time = formatHistoryTime(scan.timestamp).toLowerCase();
    const device = (scan.device || '').toLowerCase();
    return label.includes(q) || note.includes(q) || date.includes(q) || time.includes(q) || device.includes(q);
  }

  const toggleSelectAllHistory = () => {
    const visibleIds = history.filter(matchesHistorySearch).map((item) => item.id);
    setSelectedHistoryIds((prev) => {
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const deleteSelectedHistory = async () => {
    if (!selectedHistoryIds.length) return;
    if (!window.confirm(deleteSelectedConfirm)) return;
    const previousHistory = history;
    const idSet = new Set(selectedHistoryIds);
    setHistory((prev) => prev.filter((item) => !idSet.has(item.id)));
    if (lastScan && idSet.has(lastScan.id)) {
      setLastScan(null);
      setCurrentView('home');
    }
    if (historySyncMode !== 'server') {
      setSelectedHistoryIds([]);
      return;
    }
    try {
      const results = await Promise.all(
        selectedHistoryIds.map((id) => fetch(`${historyEndpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' }))
      );
      if (results.some((r) => !r.ok)) throw new Error('Some deletes failed');
      setSelectedHistoryIds([]);
      await refreshHistoryFromServer();
    } catch {
      setHistory(previousHistory);
      alert(deleteFailedMsg);
    }
  };

  const editHistoryNote = (id: string) => {
    const current = history.find((item) => item.id === id)?.note || '';
    const input = window.prompt(noteLabel, current);
    if (input === null) return;
    const note = input.trim().slice(0, 300);
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
    if (lastScan?.id === id) {
      setLastScan((prev) => (prev ? { ...prev, note } : prev));
    }
    if (historySyncMode !== 'server') return;
    void fetch(`${historyEndpoint}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
  };

  const openScanWorkspace = () => {
    setCurrentView('scan');
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(text.allowCamera);
      return;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } } },
      { video: true },
    ];

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        setCurrentView('scan');
        setScanDraftImage(null);
        setIsFlashOn(false);
        return;
      } catch (err) {
        console.error("Camera attempt failed:", constraints, err);
      }
    }

    alert(text.allowCamera);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsFlashOn(false);
    }
  };

  const toggleFlash = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() || {}) as any;
    if (!caps.torch) return;
    const next = !isFlashOn;
    await track.applyConstraints({ advanced: [{ torch: next } as any] });
    setIsFlashOn(next);
  };

  const captureImage = () => {
    const video = scanVideoRef.current;
    if (!video) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return;

    const sourceAspect = sourceWidth / sourceHeight;
    let visibleX = 0;
    let visibleY = 0;
    let visibleWidth = sourceWidth;
    let visibleHeight = sourceHeight;

    // Mirror object-cover behavior so capture area matches the on-screen frame exactly.
    if (sourceAspect > SCAN_CONTAINER_ASPECT) {
      visibleWidth = sourceHeight * SCAN_CONTAINER_ASPECT;
      visibleX = (sourceWidth - visibleWidth) / 2;
    } else if (sourceAspect < SCAN_CONTAINER_ASPECT) {
      visibleHeight = sourceWidth / SCAN_CONTAINER_ASPECT;
      visibleY = (sourceHeight - visibleHeight) / 2;
    }

    const cropX = Math.round(visibleX + visibleWidth * scanFrame.xPct);
    const cropY = Math.round(visibleY + visibleHeight * scanFrame.yPct);
    const cropWidth = Math.round(visibleWidth * scanFrame.widthPct);
    const cropHeight = Math.round(visibleHeight * scanFrame.heightPct);

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    const base64 = canvas.toDataURL('image/jpeg');
    stopCamera();
    setScanDraftImage(base64);
  };

  const analyzeImage = async (base64: string) => {
    const startedAt = Date.now();
    const minLoadingMs = 2200;
    setIsScanning(true);
    setCurrentView('result');
    try {
      const matches = await classifyLeather(base64);
      const historyImage = await createThumbnailDataUrl(base64);
      const newScan: ScanResult = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        imageUrl: historyImage,
        matches,
        device: detectDeviceLabel(),
        note: '',
      };
      setLastScan(newScan);
      setHistory(prev => [newScan, ...prev].slice(0, MAX_HISTORY_ITEMS));
      if (historySyncMode === 'server') {
        void fetch(historyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan: newScan }),
        });
      }
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed));
      }
      setAnalysisProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 220));
      setIsScanning(false);
    }
  };

  const startAnalysisFromScan = async () => {
    if (!scanDraftImage) return;
    await analyzeImage(scanDraftImage);
  };

  const retakePhoto = async () => {
    setScanDraftImage(null);
    await startCamera();
  };

  const handleScanFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setScanDraftImage(base64);
      setCurrentView('scan');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const getMatchReferenceUrl = (match: any) => {
    return match?.referenceUrl || '';
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 leather-grain-overlay z-50 pointer-events-none" />

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/20">
            <img 
              src="/images/avatar.svg" 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-headline font-extrabold text-primary tracking-tighter text-xl">{text.appName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high text-xs font-label uppercase tracking-wider hover:bg-surface-variant transition-colors"
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high text-xs font-label uppercase tracking-wider hover:bg-surface-variant transition-colors"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16 pb-24 px-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* Hero */}
              <section className="relative overflow-hidden rounded-xl aspect-[4/5] md:aspect-video bg-surface-container-low shadow-2xl">
                <img 
                  src="/images/home.png" 
                  alt="Leather Texture" 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-surface-container-lowest/60 backdrop-blur-md border border-outline-variant/10">
                    <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_#e9c349]" />
                    <span className="label-sm">{text.modelReady}</span>
                  </div>
                  <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight mb-2">{text.heroTitle}</h2>
                  <p className="font-body text-on-surface-variant text-sm max-w-sm leading-relaxed">{text.heroDesc}</p>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={openScanWorkspace}
                  className="w-full py-4 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
                >
                  <Camera className="w-8 h-8" />
                  {text.scanLeather}
                </button>
                <label className="w-full py-4 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface font-headline font-bold text-lg flex items-center justify-center gap-4 hover:bg-surface-variant transition-colors active:scale-[0.98] cursor-pointer">
                  <FileUp className="w-8 h-8" />
                  {text.uploadGallery}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>

              {/* Stats */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary">
                  <p className="label-sm text-outline mb-1">{text.database}</p>
                  <p className="font-headline font-bold text-2xl text-primary">{LEATHER_CATEGORIES}</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">{text.categoriesDesc}</p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-tertiary">
                  <p className="label-sm text-outline mb-1">{text.precision}</p>
                  <p className="font-headline font-bold text-2xl text-tertiary">{AVG_PRECISION}%</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">{text.precisionDesc}</p>
                </div>
              </section>

              {/* Recent Scans */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="headline-sm mt-4 tracking-tight">{text.recentScans}</h3>
                    <p className="font-body text-xs text-outline">{text.recentScansDesc}</p>
                  </div>
                  <button 
                    onClick={() => setCurrentView('history')}
                    className="text-primary font-label text-xs uppercase font-semibold tracking-wider hover:underline"
                  >
                    {text.viewAll}
                  </button>
                </div>
                <div className="space-y-3">
                  {history.slice(0, 3).map((scan) => (
                    <div 
                      key={scan.id}
                      onClick={() => { setLastScan(scan); setCurrentView('result'); }}
                      className="flex items-center gap-4 p-3 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors group cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-lowest flex-shrink-0">
                        {getPreviewUrl(scan) ? (
                          <img 
                            src={getPreviewUrl(scan)} 
                            alt={scan.matches[0].label} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-container-highest" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-headline font-bold text-sm">{scan.matches[0].label}</h4>
                          <span className="label-sm px-2.5 py-1 rounded-md bg-tertiary/90 text-on-tertiary">
                            {scan.matches[0].confidence}%
                          </span>
                        </div>
                        <p className="body-md text-outline mt-1">
                          {deviceLabel}: {scan.device || 'Unknown'} | {timeLabel}: {formatToMinute(scan.timestamp)}
                        </p>
                        {scan.note && (
                          <p className="body-md text-on-surface-variant mt-1">
                            {noteLabel}: {scan.note}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { stopCamera(); setCurrentView('home'); }}
                  className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="font-headline font-extrabold text-2xl">{text.appName}</h2>
                <div className="w-10" />
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/20">
                <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/45 text-[10px] tracking-[0.2em] uppercase">{cameraStream ? scanText.liveScanner : scanText.scanWorkspace}</div>
                {cameraStream && (
                  <button
                    onClick={toggleFlash}
                    className={`absolute top-4 right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isFlashOn ? 'bg-tertiary text-on-tertiary' : 'bg-black/45 text-white'}`}
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                )}

                <div className="aspect-[4/5] relative">
                  {cameraStream ? (
                    <video 
                      autoPlay 
                      playsInline 
                      ref={(el) => {
                        scanVideoRef.current = el;
                        if (el && cameraStream) el.srcObject = cameraStream;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={scanDraftImage || 'https://images.unsplash.com/photo-1616627452934-67e61d9ee3b7?q=80&w=1200&auto=format&fit=crop'}
                      alt="Scan Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute border border-primary/45 rounded-xl"
                      style={{
                        left: `${scanFrame.xPct * 100}%`,
                        top: `${scanFrame.yPct * 100}%`,
                        width: `${scanFrame.widthPct * 100}%`,
                        height: `${scanFrame.heightPct * 100}%`,
                      }}
                    />
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/45 backdrop-blur-sm text-center">
                    <p className="text-xs uppercase tracking-widest text-primary">{scanText.optimalDistance}</p>
                    <p className="text-sm text-on-surface-variant">{scanText.distanceGuide}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={cameraStream ? captureImage : startCamera}
                  className="py-4 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface font-headline font-bold text-base flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  {cameraStream ? scanText.capture : scanText.takePhoto}
                </button>
                <label className="py-4 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface font-headline font-bold text-base flex items-center justify-center gap-2 cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  {scanText.gallery}
                  <input type="file" className="hidden" accept="image/*" onChange={handleScanFileUpload} />
                </label>
              </div>

              {cameraStream && (
                <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/15">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-headline font-bold text-base">{scanText.frameSize}</p>
                    <p className="text-sm text-on-surface-variant">{Math.round(frameScale * 100)}%</p>
                  </div>
                  <input
                    type="range"
                    min={FRAME_SCALE_MIN}
                    max={FRAME_SCALE_MAX}
                    step={FRAME_SCALE_STEP}
                    value={frameScale}
                    onChange={(e) => setFrameScale(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/15">
                <p className="font-headline font-bold text-base">{scanText.qualityTipTitle}</p>
                <p className="text-sm text-on-surface-variant mt-1">{scanText.qualityTipBody}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={retakePhoto}
                  disabled={!scanDraftImage}
                  className="py-4 rounded-xl bg-surface-container-high text-on-surface font-headline font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  {scanText.retake}
                </button>
                <button
                  onClick={startAnalysisFromScan}
                  disabled={!scanDraftImage || isScanning}
                  className="py-4 rounded-xl bg-primary text-on-primary font-headline font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {scanText.startAnalysis}
                </button>
              </div>
            </motion.div>
          )}

          {currentView === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="p-2 hover:bg-surface-container-high rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
                <h2 className="headline-sm mt-4">{text.analysisResult}</h2>
                <div className="w-10" />
              </div>

              <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-6 relative overflow-hidden">
                <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full border-[18px] border-primary/10 pointer-events-none" />
                {isScanning ? (
                  <div className="space-y-6">
                    <div className="relative rounded-2xl overflow-hidden border border-primary/30">
                      <img
                        src={scanDraftImage || lastScan?.imageUrl || 'https://images.unsplash.com/photo-1616627452934-67e61d9ee3b7?q=80&w=1200&auto=format&fit=crop'}
                        alt="Processing"
                        className="w-full aspect-[4/5] object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />
                      <div className="absolute top-5 left-5">
                        <p className="label-sm text-primary">Sensor Active</p>
                        <p className="body-md text-on-surface-variant mt-1">ISO 100 | Macro 1:1</p>
                      </div>
                      <div className="absolute top-16 left-5 right-5 h-px bg-primary/40" />
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary/80 rounded-tl-md" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary/80 rounded-tr-md" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary/80 rounded-bl-md" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary/80 rounded-br-md" />
                    </div>

                    <div>
                      <h3 className="font-headline font-extrabold text-4xl leading-[0.95] tracking-tight">
                        {resultText.processingTitle}
                      </h3>
                      <p className="body-md text-on-surface-variant mt-3">
                        {resultText.processingBody}
                      </p>
                    </div>

                    <div className="grid grid-cols-[84px_1fr] gap-4 items-center">
                      <div className="relative w-[84px] h-[84px]">
                        <svg className="w-[84px] h-[84px] -rotate-90" viewBox="0 0 84 84">
                          <circle cx="42" cy="42" r="36" stroke="currentColor" strokeWidth="6" className="text-surface-container-highest" fill="none" />
                          <circle
                            cx="42"
                            cy="42"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-primary transition-all duration-500"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={(2 * Math.PI * 36) * (1 - analysisProgress / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-headline font-bold text-2xl text-primary">
                          {Math.round(analysisProgress)}%
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="label-sm text-outline">{resultText.neuralLoad}</p>
                          <p className="body-md font-semibold text-primary">{resultText.optimizing}</p>
                        </div>
                        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysisProgress}%` }}
                            transition={{ duration: 0.3 }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 border border-outline-variant/30 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className={`body-md ${stage1Done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{resultText.stage1}</p>
                        {stage1Done ? <CheckCircle2 className="w-5 h-5 text-tertiary" /> : <Loader2 className="w-5 h-5 animate-spin text-outline" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`body-md ${stage2Done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{resultText.stage2}</p>
                        {stage2Done ? <CheckCircle2 className="w-5 h-5 text-tertiary" /> : <Circle className="w-5 h-5 text-outline" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`body-md ${stage3Done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{resultText.stage3}</p>
                        {stage3Done ? <CheckCircle2 className="w-5 h-5 text-tertiary" /> : <Hourglass className="w-5 h-5 text-outline" />}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-black/25 border border-outline-variant/20 p-2.5">
                        <p className="label-sm text-primary">{resultText.qualityHigh}</p>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-outline-variant/20 p-2.5 flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        <p className="label-sm text-on-surface-variant">{resultText.aiConfidenceMetric}: {(pseudoConfidence / 100).toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-outline-variant/20 p-2.5 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        <p className="label-sm text-on-surface-variant">{resultText.latency}: {pseudoLatency}ms</p>
                      </div>
                    </div>
                  </div>
                ) : bestMatch ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <span className="label-sm px-4 py-2 rounded-full bg-tertiary text-on-tertiary">{resultText.bestMatch}</span>
                      <div className="text-right">
                        <p className="label-sm text-outline">{resultText.aiConfidence}</p>
                        <p className="headline-sm text-primary mt-1">{bestMatch.confidence}%</p>
                      </div>
                    </div>
                    <h3 className="headline-sm mt-8 tracking-tight break-words">{bestMatch.label}</h3>
                  </>
                ) : null}
              </div>

              {!isScanning && lastScan && (
              <section className="space-y-3">
                <h3 className="headline-sm mt-4">{resultText.visualVerification}</h3>
                <div className="grid grid-cols-2 gap-3 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-3">
                  <button
                    onClick={() => lastScan?.imageUrl && setPreviewImage({ src: lastScan.imageUrl, title: resultText.yourScan })}
                    className="rounded-xl overflow-hidden bg-surface-container-high relative group"
                  >
                    {lastScan?.imageUrl ? (
                      <img src={lastScan.imageUrl} alt={resultText.yourScan} className="w-full h-36 object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center body-md text-outline">{resultText.noReference}</div>
                    )}
                    <span className="label-sm absolute bottom-2 left-2 px-3 py-1 rounded-md bg-black/50 text-on-background">{resultText.yourScan}</span>
                  </button>
                  <button
                    onClick={() => {
                      const ref = bestMatch ? getMatchReferenceUrl(bestMatch as any) : '';
                      if (ref) setPreviewImage({ src: ref, title: resultText.reference });
                    }}
                    className="rounded-xl overflow-hidden bg-surface-container-high relative group"
                  >
                    {bestMatch && getMatchReferenceUrl(bestMatch as any) ? (
                      <img src={getMatchReferenceUrl(bestMatch as any)} alt={resultText.reference} className="w-full h-36 object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center body-md text-outline">{resultText.noReference}</div>
                    )}
                    <span className="label-sm absolute bottom-2 left-2 px-3 py-1 rounded-md bg-black/50 text-on-background">{resultText.reference}</span>
                  </button>
                </div>
                <p className="label-sm text-outline">{resultText.tapToZoom}</p>
              </section>
              )}

              {!isScanning && lastScan && (
              <section className="space-y-3">
                <h3 className="headline-sm mt-4">{resultText.top3Similar}</h3>
                <div className="space-y-3">
                  {similarMatches.map((match, idx) => (
                    <div key={idx} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15">
                      <div className="flex gap-4">
                        <button
                          onClick={() => {
                            const ref = getMatchReferenceUrl(match as any);
                            if (ref) setPreviewImage({ src: ref, title: match.label });
                          }}
                          className="w-24 h-24 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0"
                        >
                          {getMatchReferenceUrl(match as any) ? (
                            <img
                              src={getMatchReferenceUrl(match as any)}
                              alt={match.label}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center body-md text-outline">{resultText.noReference}</div>
                          )}
                        </button>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-2 gap-3">
                            <h4 className="headline-sm tracking-tight break-words">{match.label}</h4>
                            <span className="body-md font-semibold text-primary">{match.confidence}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${match.confidence}%` }}
                              transition={{ duration: 1, delay: idx * 0.2 }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {!isScanning && lastScan && (
                <div className="space-y-6">
                  <button 
                    onClick={() => setCurrentView('home')}
                    className="w-full py-4 rounded-lg bg-surface-container-high font-headline font-bold text-on-surface hover:bg-surface-variant transition-colors"
                  >
                    {text.done}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <p className="label-sm text-primary/80">{text.archive}</p>
                <h2 className="font-headline font-bold text-4xl tracking-tight mt-2">{text.scanHistory}</h2>
              </div>

              <div className="relative">
                <Search className="w-5 h-5 text-outline absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={text.searchHistory}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/35 border border-outline-variant/25 body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={toggleSelectAllHistory}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"
                >
                  {allVisibleSelected ? clearSelectLabel : selectAllLabel}
                </button>
                <button
                  onClick={() => void deleteSelectedHistory()}
                  disabled={!selectedHistoryIds.length}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSelectedLabel} ({selectedHistoryIds.length})
                </button>
                <button
                  onClick={() => {
                    if (!history.length) return;
                    if (!window.confirm(text.clearConfirm)) return;
                    const previousHistory = history;
                    setHistory([]);
                    setSelectedHistoryIds([]);
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                    if (historySyncMode !== 'server') return;
                    void (async () => {
                      try {
                        const res = await fetch(historyEndpoint, { method: 'DELETE' });
                        if (!res.ok) throw new Error(`DELETE all failed: ${res.status}`);
                        await refreshHistoryFromServer();
                      } catch {
                        setHistory(previousHistory);
                        alert(deleteFailedMsg);
                      }
                    })();
                  }}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors font-label uppercase tracking-wider text-on-surface-variant"
                >
                  {text.clearHistory}
                </button>
              </div>

              <div className="space-y-4">
                {filteredHistory.map((scan) => (
                  <div 
                    key={scan.id}
                    onClick={() => { setLastScan(scan); setCurrentView('result'); }}
                    className="relative flex items-center gap-3 p-3 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <span className="absolute top-2.5 right-2.5 label-sm px-2.5 py-1 rounded-lg bg-tertiary/95 text-on-tertiary text-xs">
                      {scan.matches[0].confidence}%
                    </span>
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      {getPreviewUrl(scan) ? (
                        <img src={getPreviewUrl(scan)} alt={scan.matches[0].label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-surface-container-highest" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0 min-h-24 flex flex-col justify-center pr-24 pb-8 relative">
                      <h4 className="font-headline font-bold text-lg leading-tight pr-10 line-clamp-1">{scan.matches[0].label}</h4>
                      <div className="mt-1.5 space-y-1">
                        <p className="text-sm text-outline flex items-center gap-2 whitespace-nowrap">
                          <CalendarDays className="w-4 h-4" />
                          {formatHistoryDate(scan.timestamp)}
                        </p>
                        <p className="text-sm text-outline flex items-center gap-2 whitespace-nowrap">
                          <Clock3 className="w-4 h-4" />
                          {formatHistoryTime(scan.timestamp)}
                        </p>
                      </div>
                      {scan.note && (
                        <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-1">
                          {noteLabel}: {scan.note}
                        </p>
                      )}
                      <div className="absolute right-0 bottom-0 flex items-center justify-end gap-1.5 pr-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editHistoryNote(scan.id);
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-surface-container-high hover:bg-surface-variant transition-colors"
                          >
                            {editNoteLabel}
                          </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteHistoryItem(scan.id);
                          }}
                          className="text-[10px] px-2 py-1 rounded bg-surface-container-high hover:bg-red-500/20 transition-colors"
                        >
                            {deleteItemLabel}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHistorySelection(scan.id);
                            }}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              selectedHistoryIds.includes(scan.id)
                                ? 'bg-primary border-primary text-on-primary'
                                : 'bg-[#2a2a2a] border-[#3a3a3a] text-transparent'
                            }`}
                            title={deleteSelectedLabel}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-outline self-center ml-0.5" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-black/35 border border-outline-variant/20 p-5">
                  <p className="label-sm text-on-surface-variant">{text.totalScans}</p>
                  <p className="font-headline font-extrabold text-5xl text-primary mt-2">{history.length}</p>
                </div>
                <div className="rounded-2xl bg-black/35 border border-outline-variant/20 p-5">
                  <p className="label-sm text-on-surface-variant">{text.avgAccuracy}</p>
                  <p className="font-headline font-extrabold text-5xl text-tertiary mt-2">{Math.round(avgAccuracy)}%</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-primary">
                  <Menu className="w-5 h-5" />
                </div>
                <button className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
              </div>

              <section className="rounded-3xl bg-surface-container-low border border-outline-variant/20 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/30">
                    <img src="/images/avatar.svg" alt="Profile Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-headline font-bold text-2xl leading-tight">{text.profileUserName}</h3>
                    <p className="body-md text-on-surface-variant">{text.profileUserEmail}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="label-sm px-2 py-1 rounded-md bg-primary/20 text-primary">{text.profileRole}</span>
                      <span className="label-sm px-2 py-1 rounded-md bg-tertiary/20 text-tertiary">{historySyncMode === 'server' ? text.serverMode : text.localMode}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/20">
                  <p className="body-md text-on-surface-variant">{historySyncMode === 'server' ? text.connected : text.profileStatus}</p>
                  <button className="label-sm text-primary flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" />
                    {text.editProfile}
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.performanceAnalytics}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="label-sm text-outline">{text.totalScansCard}</p>
                    <p className="font-headline font-extrabold text-4xl mt-1">{history.length}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="label-sm text-outline">{text.avgConfCard}</p>
                    <p className="font-headline font-extrabold text-4xl text-primary mt-1">{avgAccuracy.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="label-sm text-outline">{text.thisWeekCard}</p>
                    <p className="font-headline font-extrabold text-4xl mt-1">{thisWeekScans}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="label-sm text-outline">{text.lastScanCard}</p>
                    <p className="font-headline font-extrabold text-3xl mt-1">{lastScanTimeAgo}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-3 flex items-center justify-between">
                  <p className="body-md text-on-surface-variant">{text.mostIdentified}</p>
                  <p className="body-md font-semibold text-primary">{mostIdentifiedLabel}</p>
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.appPreferences}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 divide-y divide-outline-variant/20">
                  <ChoiceRow
                    label={text.prefTheme}
                    options={[
                      { key: 'dark', label: text.themeDark },
                      { key: 'light', label: text.themeLight },
                    ]}
                    activeKey={theme}
                    onSelect={(key) => setTheme(key as Theme)}
                  />
                  <ChoiceRow
                    label={text.prefLanguage}
                    options={[
                      { key: 'zh', label: text.langZh },
                      { key: 'en', label: text.langEn },
                    ]}
                    activeKey={language}
                    onSelect={(key) => setLanguage(key as Language)}
                  />
                  <ChoiceRow
                    label={text.prefSort}
                    options={[
                      { key: 'newest', label: text.sortNewest },
                      { key: 'confidence', label: text.sortConfidence },
                      { key: 'name', label: text.sortName },
                    ]}
                    activeKey={defaultSort}
                    onSelect={(key) => setDefaultSort(key as 'newest' | 'confidence' | 'name')}
                  />
                  <ToggleRow label={text.prefAutoSave} enabled={autoSaveHistory} onToggle={() => setAutoSaveHistory((v) => !v)} />
                  <ToggleRow label={text.prefHdPreview} enabled={hdPreviewEnabled} onToggle={() => setHdPreviewEnabled((v) => !v)} />
                  <ToggleRow label={text.prefHaptic} enabled={hapticFeedbackEnabled} onToggle={() => setHapticFeedbackEnabled((v) => !v)} />
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.infraSync}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="label-sm text-outline">{text.historyMode}</p>
                      <p className="body-md font-semibold">{historySyncMode === 'server' ? text.serverModeShort : text.localModeShort}</p>
                    </div>
                    <div>
                      <p className="label-sm text-outline">{text.connection}</p>
                      <p className={`body-md font-semibold flex items-center gap-1 ${historySyncMode === 'server' ? 'text-tertiary' : 'text-outline'}`}>
                        {historySyncMode === 'server' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {historySyncMode === 'server' ? text.connected : text.offline}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="label-sm text-outline">{text.backendUrl}</p>
                    <p className="body-md break-all">{apiBaseUrl || window.location.origin}</p>
                  </div>
                  <div>
                    <p className="label-sm text-outline">{text.syncStatus}</p>
                    <p className="body-md">{lastSyncAt ? `${text.upToDate} • ${formatToMinute(lastSyncAt)}` : text.offline}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.dataManagement}</p>
                <button className="w-full py-3 rounded-xl bg-surface-container-low border border-outline-variant/20 label-sm hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  {text.exportHistory}
                </button>
                <button className="w-full py-3 rounded-xl bg-surface-container-low border border-outline-variant/20 label-sm hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {text.syncToServer}
                </button>
                <button className="w-full py-3 rounded-xl bg-surface-container-low border border-outline-variant/20 label-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {text.clearLocalCache}
                </button>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.preferencesProfile}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="label-sm px-2 py-1 rounded-md bg-primary/15 text-primary">{mostIdentifiedLabel}</span>
                    <span className="label-sm px-2 py-1 rounded-md bg-tertiary/15 text-tertiary">{text.highConfidenceRate}: {highConfidenceRate}%</span>
                    <span className="label-sm px-2 py-1 rounded-md bg-surface-container-high text-on-surface-variant">{text.favorites}: 0</span>
                  </div>
                  <div className="space-y-2">
                    <p className="label-sm text-outline">{text.recentSummaries}</p>
                    {history.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-lg bg-surface-container-high p-2">
                        <p className="body-md line-clamp-1">{item.matches?.[0]?.label || 'Unknown'} - {item.matches?.[0]?.confidence || 0}%</p>
                      </div>
                    ))}
                    {!history.length && <p className="body-md text-outline">{text.noRecordsYet}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.environment}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="body-md text-on-surface-variant">{text.device}</p>
                    <p className="body-md flex items-center gap-1">{/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}{currentDevice}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="body-md text-on-surface-variant">{text.cameraGallery}</p>
                    <p className="body-md text-primary">{cameraPermissionLabel}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="body-md text-on-surface-variant">{text.deployment}</p>
                    <p className="body-md">{deploymentLabel}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="label-sm text-outline">{text.security}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="body-md flex items-center gap-2"><Shield className="w-4 h-4" /> {text.sessionActive}</p>
                    <span className="label-sm px-2 py-1 rounded-md bg-primary/20 text-primary">{text.twoFaEnabled}</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <p className="body-md flex items-center gap-2"><Lock className="w-4 h-4" /> {text.teamAccess}</p>
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </section>

              <section className="space-y-3 pb-4">
                <p className="label-sm text-outline">{text.aboutApp}</p>
                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-2">
                  <p className="body-md">{text.appVersion}: v2.1.0</p>
                  <p className="body-md">{text.modelVersion}: v4.2</p>
                  <p className="body-md">{text.buildNumber}: 2026.03.25</p>
                  <p className="body-md text-outline flex items-center gap-1"><Info className="w-4 h-4" /> {text.privacyPolicy}</p>
                </div>
                <button className="w-full py-4 rounded-2xl bg-[#E9A79F] text-[#351d16] label-sm hover:brightness-95 transition-all flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  {text.logout}
                </button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-40 px-4 pb-6 pt-2 bg-background/60 backdrop-blur-xl border-t border-outline-variant/10">
        <div className="max-w-2xl mx-auto flex justify-around items-center">
          <NavItem 
            active={currentView === 'home'} 
            onClick={() => setCurrentView('home')} 
            icon={<Home className={currentView === 'home' ? 'fill-current' : ''} />} 
            label={text.navHome} 
          />
          <NavItem 
            active={currentView === 'scan'} 
            onClick={openScanWorkspace} 
            icon={<Camera />} 
            label={text.navScan} 
          />
          <NavItem 
            active={currentView === 'history'} 
            onClick={() => setCurrentView('history')} 
            icon={<History />} 
            label={text.navHistory} 
          />
          <NavItem 
            active={currentView === 'profile'} 
            onClick={() => setCurrentView('profile')} 
            icon={<User />} 
            label={text.navProfile} 
          />
        </div>
      </nav>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="headline-sm">{previewImage.title}</p>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low">
                <img
                  src={previewImage.src}
                  alt={previewImage.title}
                  className="w-full max-h-[80vh] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 ${active ? 'text-primary scale-110' : 'text-on-surface/60'}`}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="label-sm mt-1">{label}</span>
    </button>
  );
}

function ChoiceRow({
  label,
  options,
  activeKey,
  onSelect,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="p-4 space-y-2">
      <p className="body-md">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeKey === opt.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high/40 transition-colors"
    >
      <p className="body-md text-left">{label}</p>
      <span className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-surface-container-highest'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${enabled ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
