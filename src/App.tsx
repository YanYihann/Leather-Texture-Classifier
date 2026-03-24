/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Home, Camera, History, User, ChevronRight, Verified, Upload, X, Loader2, Zap, Image as ImageIcon, RotateCcw, Play } from 'lucide-react';
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
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanDraftImage, setScanDraftImage] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [frameScale, setFrameScale] = useState(1);
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(historyEndpoint);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.history)) {
            setHistory(data.history.slice(0, MAX_HISTORY_ITEMS));
            return;
          }
        }
      } catch {
        // Fallback to local cache if server is unavailable.
      }

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
    persistHistorySafely(history);
  }, [history]);

  useEffect(() => {
    const validIds = new Set(history.map((item) => item.id));
    setSelectedHistoryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [history]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(UI_LANG_KEY);
    const savedTheme = localStorage.getItem(UI_THEME_KEY);
    if (savedLanguage === 'zh' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
    }
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
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

  const deleteHistoryItem = (id: string) => {
    if (!window.confirm(deleteItemConfirm)) return;
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setSelectedHistoryIds((prev) => prev.filter((v) => v !== id));
    if (lastScan?.id === id) {
      setLastScan(null);
      setCurrentView('home');
    }
    void fetch(`${historyEndpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleSelectAllHistory = () => {
    setSelectedHistoryIds((prev) => (prev.length === history.length ? [] : history.map((item) => item.id)));
  };

  const deleteSelectedHistory = () => {
    if (!selectedHistoryIds.length) return;
    if (!window.confirm(deleteSelectedConfirm)) return;
    const idSet = new Set(selectedHistoryIds);
    setHistory((prev) => prev.filter((item) => !idSet.has(item.id)));
    if (lastScan && idSet.has(lastScan.id)) {
      setLastScan(null);
      setCurrentView('home');
    }
    for (const id of selectedHistoryIds) {
      void fetch(`${historyEndpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    setSelectedHistoryIds([]);
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
      void fetch(historyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan: newScan }),
      });
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
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

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 leather-grain-overlay z-50 pointer-events-none" />

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/20">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBO6xLHQxByw5xmxG8LrFcxDxEUGPDLVAiK204o6hQjJ6_XkhVxRu_2fPtgZ5Jvw9ie8vqIOzlcuL7nLPfgQDr5EfZu9aoKAUKCvO2KjLSfKI8gepVtNG8bqepO61FajgLkymPzeNfWEU8tQb8jXFdEt1q2fI-kePq-Ww3717UNQN9BvJuov9oPYjbEzyO4_a9kJs8PPBWyTL01ebnR1yEzO7_3ivxF2dUGIXM7gwbZ9FOS27rTRC_21W8XU7rv1pKahn3U4rELvuU" 
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
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFbfwe9ns0lhCJ8HDi0ZuYctYJ2Cwc5wF4HpNzul8bnrRheJuMuJ8DGcAfCYUkIM19lXsayQo1W8i2NuHhkkqByaPxKzeWDgJWet5eFx8MLzk0fRuFVC0Hup6cwGgDXh7UF5iwyAFlNJv09vlwLmqMHbX1lzyDJRC_OpkfYSFIh_8FgycUKRaSoOmGGc5PVyaAU3-hXGkgdQsZji2DfkhXNOvLnuc9iyhWlAwGf-hEp59EgO26c2-IVARZw7LOpcL4S5mm7HVOG8c" 
                  alt="Leather Texture" 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-surface-container-lowest/60 backdrop-blur-md border border-outline-variant/10">
                    <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_#e9c349]" />
                    <span className="font-label text-[10px] font-medium uppercase tracking-widest">{text.modelReady}</span>
                  </div>
                  <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight mb-2">{text.heroTitle}</h2>
                  <p className="font-body text-on-surface-variant text-sm max-w-sm leading-relaxed">{text.heroDesc}</p>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={openScanWorkspace}
                  className="w-full py-4 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Camera className="w-5 h-5 fill-current" />
                  {text.scanLeather}
                </button>
                <label className="w-full py-4 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface font-headline font-bold text-lg flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors active:scale-[0.98] cursor-pointer">
                  <Upload className="w-5 h-5" />
                  {text.uploadGallery}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>

              {/* Stats */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">{text.database}</p>
                  <p className="font-headline font-bold text-2xl text-primary">{LEATHER_CATEGORIES}</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">{text.categoriesDesc}</p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-tertiary">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">{text.precision}</p>
                  <p className="font-headline font-bold text-2xl text-tertiary">{AVG_PRECISION}%</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">{text.precisionDesc}</p>
                </div>
              </section>

              {/* Recent Scans */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="font-headline font-bold text-xl tracking-tight">{text.recentScans}</h3>
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
                        <h4 className="font-headline font-bold text-sm">{scan.matches[0].label}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Verified className="w-3.5 h-3.5 text-tertiary fill-current" />
                          <span className="font-body text-xs text-on-surface-variant">{scan.matches[0].confidence}% {text.confidence}</span>
                        </div>
                        <p className="font-body text-[11px] text-outline mt-1">
                          {deviceLabel}: {scan.device || 'Unknown'} | {timeLabel}: {formatToMinute(scan.timestamp)}
                        </p>
                        {scan.note && (
                          <p className="font-body text-[11px] text-on-surface-variant mt-1">
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
                <h2 className="font-headline font-bold text-xl">{text.analysisResult}</h2>
                <div className="w-10" />
              </div>

              <div className="rounded-2xl overflow-hidden aspect-square bg-surface-container-low shadow-xl relative">
                {isScanning && (
                  <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="font-headline font-bold text-primary">{text.analyzing}</p>
                  </div>
                )}
                {lastScan && (
                  <img 
                    src={lastScan.imageUrl} 
                    alt="Scanned" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {lastScan && !isScanning && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="font-label text-[10px] uppercase tracking-widest text-outline">{text.topMatches}</p>
                    <div className="space-y-4">
                      {lastScan.matches.map((match, idx) => (
                        <div key={idx} className="bg-surface-container-low p-4 rounded-xl space-y-3">
                          <div className="flex gap-4">
                            {match.referenceUrl && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-lowest flex-shrink-0">
                                <img 
                                  src={match.referenceUrl} 
                                  alt="Reference" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <div className="flex-grow">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-headline font-bold text-lg">{match.label}</h4>
                                <span className="font-body font-bold text-primary">{match.confidence}%</span>
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
                          {match.description && (
                            <p className="text-xs text-on-surface-variant leading-relaxed">{match.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentView('home')} className="p-2 hover:bg-surface-container-high rounded-lg">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="font-headline font-bold text-2xl">{text.scanHistory}</h2>
                </div>
                <button
                  onClick={() => {
                    if (!history.length) return;
                    if (!window.confirm(text.clearConfirm)) return;
                    setHistory([]);
                    setSelectedHistoryIds([]);
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                    void fetch(historyEndpoint, { method: 'DELETE' });
                  }}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors font-label uppercase tracking-wider text-on-surface-variant"
                >
                  {text.clearHistory}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAllHistory}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"
                >
                  {selectedHistoryIds.length === history.length && history.length > 0 ? clearSelectLabel : selectAllLabel}
                </button>
                <button
                  onClick={deleteSelectedHistory}
                  disabled={!selectedHistoryIds.length}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSelectedLabel} ({selectedHistoryIds.length})
                </button>
              </div>
              
              <div className="space-y-4">
                {history.map((scan) => (
                  <div 
                    key={scan.id}
                    onClick={() => { setLastScan(scan); setCurrentView('result'); }}
                    className="flex items-center gap-4 p-4 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      {getPreviewUrl(scan) ? (
                        <img src={getPreviewUrl(scan)} alt={scan.matches[0].label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-surface-container-highest" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="text-[10px] text-outline uppercase tracking-wider mb-1">
                        {timeLabel}: {formatToMinute(scan.timestamp)}
                      </p>
                      <h4 className="font-headline font-bold text-base">{scan.matches[0].label}</h4>
                      <p className="font-body text-[11px] text-outline mb-1">
                        {deviceLabel}: {scan.device || 'Unknown'}
                      </p>
                      {scan.note && (
                        <p className="font-body text-[11px] text-on-surface-variant mb-1 line-clamp-2">
                          {noteLabel}: {scan.note}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Verified className="w-3.5 h-3.5 text-tertiary fill-current" />
                        <span className="font-body text-xs text-on-surface-variant">{scan.matches[0].confidence}% {text.confidence}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.includes(scan.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleHistorySelection(scan.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-primary"
                          title={deleteSelectedLabel}
                        />
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
                            deleteHistoryItem(scan.id);
                          }}
                          className="text-[10px] px-2 py-1 rounded bg-surface-container-high hover:bg-red-500/20 transition-colors"
                        >
                          {deleteItemLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
      <span className="font-label text-[10px] font-medium uppercase tracking-widest mt-1">{label}</span>
    </button>
  );
}
