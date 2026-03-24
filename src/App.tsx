/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, Camera, History, User, Settings, ChevronRight, Verified, Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanResult, MOCK_SCANS, LEATHER_CATEGORIES, AVG_PRECISION } from './types';
import { classifyLeather } from './services/gemini';

type View = 'home' | 'scan' | 'history' | 'profile' | 'result';
const HISTORY_STORAGE_KEY = 'leather_history';
const MAX_HISTORY_ITEMS = 30;
const MAX_PERSISTED_ITEMS = 30;

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

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    persistHistorySafely(history);
  }, [history]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setCurrentView('scan');
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access to scan leather.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const captureImage = async () => {
    const video = document.querySelector('video');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg');
    
    stopCamera();
    setIsScanning(true);
    setCurrentView('result');

    try {
      const matches = await classifyLeather(base64);
      const historyImage = await createThumbnailDataUrl(base64);
      const newScan: ScanResult = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        imageUrl: historyImage,
        matches
      };
      setLastScan(newScan);
      setHistory(prev => [newScan, ...prev].slice(0, MAX_HISTORY_ITEMS));
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsScanning(true);
      setCurrentView('result');
      
      try {
        const matches = await classifyLeather(base64);
        const historyImage = await createThumbnailDataUrl(base64);
        const newScan: ScanResult = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          imageUrl: historyImage,
          matches
        };
        setLastScan(newScan);
        setHistory(prev => [newScan, ...prev].slice(0, MAX_HISTORY_ITEMS));
      } catch (err) {
        console.error("Classification error:", err);
      } finally {
        setIsScanning(false);
      }
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
          <h1 className="font-headline font-extrabold text-primary tracking-tighter text-xl">Digital Artisan</h1>
        </div>
        <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
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
                    <span className="font-label text-[10px] font-medium uppercase tracking-widest">Model Ready: AI-driven analysis online.</span>
                  </div>
                  <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight mb-2">Leather Texture Classifier</h2>
                  <p className="font-body text-on-surface-variant text-sm max-w-sm leading-relaxed">Identify leather materials across {LEATHER_CATEGORIES} categories with AI precision.</p>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={startCamera}
                  className="w-full py-4 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Camera className="w-5 h-5 fill-current" />
                  Scan Leather
                </button>
                <label className="w-full py-4 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface font-headline font-bold text-lg flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors active:scale-[0.98] cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Upload from Gallery
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>

              {/* Stats */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Database</p>
                  <p className="font-headline font-bold text-2xl text-primary">{LEATHER_CATEGORIES}</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">Leather categories cataloged.</p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-tertiary">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Precision</p>
                  <p className="font-headline font-bold text-2xl text-tertiary">{AVG_PRECISION}%</p>
                  <p className="font-body text-[11px] text-on-surface-variant leading-tight">Average AI confidence score.</p>
                </div>
              </section>

              {/* Recent Scans */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="font-headline font-bold text-xl tracking-tight">Recent Scans</h3>
                    <p className="font-body text-xs text-outline">Your previous material classifications</p>
                  </div>
                  <button 
                    onClick={() => setCurrentView('history')}
                    className="text-primary font-label text-xs uppercase font-semibold tracking-wider hover:underline"
                  >
                    View All
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
                          <span className="font-body text-xs text-on-surface-variant">{scan.matches[0].confidence}% confidence</span>
                        </div>
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
              className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden"
            >
              <div className="relative flex-1 min-h-0">
                <video 
                  autoPlay 
                  playsInline 
                  ref={(el) => { if (el && cameraStream) el.srcObject = cameraStream; }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-primary/50 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />
                  </div>
                </div>
                <button 
                  onClick={() => { stopCamera(); setCurrentView('home'); }}
                  className="absolute top-10 left-6 p-2 bg-black/50 rounded-full text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div
                className="flex-none bg-background/95 backdrop-blur-sm flex items-center justify-center py-4"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <button 
                  onClick={captureImage}
                  className="w-16 h-16 rounded-full border-4 border-primary p-1"
                >
                  <div className="w-full h-full rounded-full bg-primary" />
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
                <h2 className="font-headline font-bold text-xl">Analysis Result</h2>
                <div className="w-10" />
              </div>

              <div className="rounded-2xl overflow-hidden aspect-square bg-surface-container-low shadow-xl relative">
                {isScanning && (
                  <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="font-headline font-bold text-primary">Analyzing Texture...</p>
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
                    <p className="font-label text-[10px] uppercase tracking-widest text-outline">Top Matches</p>
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
                    Done
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
                  <h2 className="font-headline font-bold text-2xl">Scan History</h2>
                </div>
                <button
                  onClick={() => {
                    if (!history.length) return;
                    if (!window.confirm('Clear all saved scan history?')) return;
                    setHistory([]);
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                  }}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors font-label uppercase tracking-wider text-on-surface-variant"
                >
                  Clear History
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
                        {new Date(scan.timestamp).toLocaleDateString()}
                      </p>
                      <h4 className="font-headline font-bold text-base">{scan.matches[0].label}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Verified className="w-3.5 h-3.5 text-tertiary fill-current" />
                        <span className="font-body text-xs text-on-surface-variant">{scan.matches[0].confidence}% confidence</span>
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
            label="Home" 
          />
          <NavItem 
            active={currentView === 'scan'} 
            onClick={startCamera} 
            icon={<Camera />} 
            label="Scan" 
          />
          <NavItem 
            active={currentView === 'history'} 
            onClick={() => setCurrentView('history')} 
            icon={<History />} 
            label="History" 
          />
          <NavItem 
            active={currentView === 'profile'} 
            onClick={() => setCurrentView('profile')} 
            icon={<User />} 
            label="Profile" 
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
