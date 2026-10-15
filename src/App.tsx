import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Database, Download, Expand, FlaskConical, FolderOpen, History, ImagePlus, LayoutDashboard, LoaderCircle, Menu, Moon, Search, Settings2, ShieldCheck, Star, Sun, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import materials from './data/materials';
import { publicAsset } from './services/assets';
import { classifyLeather, referenceUrl, request } from './services/api';
import { downloadJson, resizeImage } from './services/images';
import { browserInference, browserSupported, type InferenceProgress } from './services/browser';
import type { ScanResult } from './types';

type View = 'overview' | 'classify' | 'archive' | 'history' | 'settings';
type Language = 'en' | 'zh';
type Material = typeof materials[number];
type Health = { modelAvailable: boolean; provider?: string };
type Translator = (en: string, zh: string) => string;
const views: View[] = ['overview', 'classify', 'archive', 'history', 'settings'];
const storageKey = 'leather_history';
const initialView = () => views.includes(location.hash.slice(1) as View) ? location.hash.slice(1) as View : 'overview';
function readStored<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function saveStored(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Preferences remain usable for this session. */ } }
function validScans(value: unknown): ScanResult[] { return Array.isArray(value) ? value.filter(scan => scan && typeof scan.id === 'string' && Number.isFinite(scan.timestamp) && Math.abs(scan.timestamp) < 8640000000000000 && Array.isArray(scan.matches) && scan.matches.length && scan.matches.every((match: { label?: string; confidence?: number }) => match && typeof match.label === 'string' && Number.isFinite(match.confidence) && match.confidence! >= 0 && match.confidence! <= 100) && typeof scan.imageUrl === 'string' && (!scan.note || typeof scan.note === 'string')).slice(0, 30) : []; }
function saveHistory(scans: ScanResult[]) {
  let items = scans.slice(0, 30);
  while (items.length) {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); return items.length === scans.length; }
    catch { items = items.slice(0, items.length - 1); }
  }
  try { localStorage.setItem(storageKey, '[]'); } catch { return false; }
  return scans.length === 0;
}
const featured = ['Leather_24', 'Leather_172', 'Leather_06', 'Leather_100'].map(id => materials.find(material => material.id === id)).filter(Boolean) as Material[];

function Dialog({ children, title, close, className = '' }: { children: ReactNode; title: string; close: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`dialog ${className}`} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-label={title}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Close / 关闭" onClick={close}><X size={20} /></button></div>{children}
  </dialog>;
}

function MaterialVisual({ t, open }: { t: Translator; open: (image: string, title: string) => void }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const x = useMotionValue(0), y = useMotionValue(0);
  const panX = useSpring(x, { stiffness: 80, damping: 24 }), panY = useSpring(y, { stiffness: 80, damping: 24 });
  const src = active < 0 ? publicAsset('/images/leather-study.webp') : featured[active].image;
  const label = active < 0 ? t('Leather macro study', '皮革微距展示') : featured[active].id;
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = setInterval(() => setActive(value => (value + 1) % featured.length), 5500);
    return () => clearInterval(timer);
  }, [playing, reduced]);
  const step = (direction: number) => setActive(value => (value + direction + featured.length) % featured.length);
  return <div className="material-visual">
    <div className="visual-stage" onPointerMove={event => {
      if (reduced || event.pointerType !== 'mouse') return;
      const box = event.currentTarget.getBoundingClientRect();
      x.set(((event.clientX - box.left) / box.width - .5) * -22);
      y.set(((event.clientY - box.top) / box.height - .5) * -22);
    }} onPointerLeave={() => { x.set(0); y.set(0); }}>
      <AnimatePresence initial={false} mode="sync"><motion.img key={src} src={src} srcSet={active < 0 ? `${publicAsset('/images/leather-study-small.webp')} 900w, ${publicAsset('/images/leather-study.webp')} 1536w` : undefined} sizes="(max-width: 699px) 90vw, (max-width: 959px) 75vw, 50vw" alt={label} className="hero-material" fetchPriority="high" width="1536" height="1024" style={{ x: reduced ? 0 : panX, y: reduced ? 0 : panY }} initial={{ opacity: .4 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .12 : .45 }} /></AnimatePresence>
      <div className="sample-target" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="visual-caption"><span>{active < 0 ? t('Illustrative material study', '材质展示影像') : t('Dataset reference', '数据集参考样本')}</span><span>{active < 0 ? 'MACRO / 01' : featured[active].id}</span></div>
      <button className="visual-expand icon-button" aria-label={t('Enlarge material image', '放大材质图像')} onClick={() => open(src, label)}><Expand size={18} /></button>
    </div>
    <div className="specimen-controls"><div><strong>{label}</strong></div><div className="sample-selector">
      <button className="icon-button" aria-label={t('Previous specimen', '上一个样本')} onClick={() => step(-1)}><ChevronLeft size={18} /></button>
      {featured.slice(0, 3).map((material, index) => <button key={material.id} className={`sample-thumb ${active === index ? 'selected' : ''}`} aria-label={`${t('View', '查看')} ${material.id}`} aria-pressed={active === index} onClick={() => setActive(index)}><img src={material.thumbnail} alt="" width="48" height="48" /></button>)}
      <button className="icon-button" aria-label={t('Next specimen', '下一个样本')} onClick={() => step(1)}><ChevronRight size={18} /></button>
    </div></div>
    {!reduced && <button className="text-button visual-play" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? t('Pause specimen sequence', '暂停样本轮播') : t('Play specimen sequence', '播放样本轮播')}<ArrowRight size={14} /></button>}
  </div>;
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [language, setLanguage] = useState<Language>(() => readStored('leathermind_language', 'en'));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStored('leathermind_theme', 'dark'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [scans, setScans] = useState<ScanResult[]>(() => validScans(readStored(storageKey, [])));
  const [syncMode, setSyncMode] = useState<'server' | 'local'>('local');
  const [loaded, setLoaded] = useState(false);
  const [autoSave, setAutoSave] = useState<boolean>(() => readStored('leathermind_auto_save', true));
  const [draft, setDraft] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'confidence' | 'name'>('newest');
  const [archiveQuery, setArchiveQuery] = useState('');
  const [archivePage, setArchivePage] = useState(0);
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [favorites, setFavorites] = useState<string[]>(() => readStored('leathermind_favorites', []));
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [inferenceProgress, setInferenceProgress] = useState<InferenceProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const preparationRef = useRef(0);
  const cameraRequestRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);
  const t: Translator = (en, zh) => language === 'en' ? en : zh;
  const date = (timestamp: number) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
  const labels: Record<View, string> = { overview: t('Overview', '首页'), classify: t('Classification', '识别工作台'), archive: t('Material archive', '材质档案'), history: t('Scan history', '识别历史'), settings: t('Preferences', '应用偏好') };
  const navIcons = { overview: LayoutDashboard, classify: FlaskConical, archive: Database, history: History, settings: Settings2 };
  const navigate = (target: View) => { if (target !== view) location.hash = target; setMenuOpen(false); };
  const openPreview = (src: string, title: string) => setPreview({ src, title });
  const stopCamera = () => { cameraRequestRef.current++; streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraStream(null); setCameraLoading(false); };
  const cancelAnalysis = () => { requestRef.current?.abort(); requestRef.current = null; setBusy(false); };

  useEffect(() => {
    const listener = () => setView(initialView());
    window.addEventListener('hashchange', listener);
    return () => { window.removeEventListener('hashchange', listener); preparationRef.current++; cameraRequestRef.current++; streamRef.current?.getTracks().forEach(track => track.stop()); requestRef.current?.abort(); };
  }, []);
  useEffect(() => {
    if (previousView.current !== view) { window.scrollTo({ top: 0, behavior: 'instant' }); headingRef.current?.focus({ preventScroll: true }); }
    previousView.current = view;
    if (view !== 'classify') { stopCamera(); cancelAnalysis(); }
    setMenuOpen(false);
  }, [view]);
  useEffect(() => { document.documentElement.dataset.theme = theme; saveStored('leathermind_theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN'; document.title = t('LeatherMind | Leather Texture Classification', '革识 | 皮革纹理分类'); saveStored('leathermind_language', language); }, [language]);
  useEffect(() => { saveStored('leathermind_favorites', favorites); }, [favorites]);
  useEffect(() => { saveStored('leathermind_auto_save', autoSave); }, [autoSave]);
  useEffect(() => {
    if (browserInference) {
      const controller = new AbortController();
      fetch(publicAsset('/models/leather-resnet50-v1.onnx'), { method: 'HEAD', signal: controller.signal }).then(response => setHealth({ modelAvailable: response.ok && !response.headers.get('Content-Type')?.includes('text/html') && browserSupported(), provider: 'browser' })).catch(() => setHealth(null)).finally(() => setHealthChecked(true));
      setLoaded(true);
      return () => controller.abort();
    }
    const controller = new AbortController();
    request<Health>('/api/health', { signal: controller.signal }).then(setHealth).catch(() => setHealth(null)).finally(() => setHealthChecked(true));
    request<{ history: ScanResult[] }>('/api/history', { signal: controller.signal }).then(data => {
      if (!Array.isArray(data.history)) return;
      setScans(local => [...new Map([...validScans(data.history), ...local].map(scan => [scan.id, scan])).values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30));
      setSyncMode('server');
    }).catch(() => setSyncMode('local')).finally(() => setLoaded(true));
    const timeout = setTimeout(() => controller.abort(), 12000);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  useEffect(() => { if (loaded && !saveHistory(scans)) setNotice(t('Browser storage is full. Some older records could not be retained. Export your history to keep a copy.', '浏览器存储空间不足，部分旧记录未能保留。请导出历史记录备份。')); }, [scans, loaded]);
  useEffect(() => { if (videoRef.current && cameraStream) { videoRef.current.srcObject = cameraStream; void videoRef.current.play().catch(() => setNotice(t('Camera preview could not start. Please upload a photo instead.', '相机预览无法启动，请改为上传图片。'))); } }, [cameraStream]);
  useEffect(() => { if (!busy) return; setElapsed(0); const timer = setInterval(() => setElapsed(value => value + 1), 1000); return () => clearInterval(timer); }, [busy]);
  useEffect(() => { setSelectedIds(ids => ids.filter(id => scans.some(scan => scan.id === id))); }, [scans]);

  async function prepareFile(file?: File) {
    if (!file || busy || preparing) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setNotice(t('Choose a JPG, PNG or WebP image.', '请选择 JPG、PNG 或 WebP 图片。')); return; }
    if (file.size > 15 * 1024 * 1024) { setNotice(t('This image exceeds 15 MB. Choose a smaller file.', '图片超过 15 MB，请选择较小的文件。')); return; }
    const token = ++preparationRef.current;
    setPreparing(true); setNotice(''); stopCamera();
    try { const image = await resizeImage(file); if (token !== preparationRef.current) return; setDraft(image); setFileName(file.name); setResult(null); setMatchIndex(0); navigate('classify'); }
    catch { setNotice(t('This image could not be read. Choose another JPG, PNG or WebP file.', '无法读取图片，请选择其他 JPG、PNG 或 WebP 文件。')); }
    finally { if (token === preparationRef.current) setPreparing(false); }
  }
  async function startCamera() {
    navigate('classify'); setNotice(''); setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) { setNotice(t('Camera capture needs a secure connection and a supported browser. You can still upload an image.', '拍照需要安全连接和支持相机的浏览器，也可以上传图片。')); return; }
    stopCamera(); const token = ++cameraRequestRef.current; setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      if (token !== cameraRequestRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream; setCameraStream(stream); setDraft(null); setZoom(1);
    } catch (error) { if (token === cameraRequestRef.current) setNotice(t('Camera access failed. Allow camera permission in your browser, or upload an image.', '相机无法访问。请在浏览器中允许相机权限，或改为上传图片。')); }
    finally { if (token === cameraRequestRef.current) setCameraLoading(false); }
  }
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) { setNotice(t('The camera is still initializing. Please try again.', '相机仍在初始化，请稍后再试。')); return; }
    const aspect = 4 / 3;
    let width = video.videoWidth, height = video.videoHeight;
    if (width / height > aspect) width = height * aspect; else height = width / aspect;
    width /= zoom; height /= zoom;
    const canvas = document.createElement('canvas'); canvas.width = Math.min(1536, Math.round(width)); canvas.height = Math.round(canvas.width / aspect);
    const context = canvas.getContext('2d'); if (!context) return;
    context.drawImage(video, (video.videoWidth - width) / 2, (video.videoHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
    setDraft(canvas.toDataURL('image/jpeg', .9)); setFileName(t('Camera capture', '相机拍摄')); stopCamera();
  }
  async function analyze() {
    if (!draft || busy || preparing) return;
    const image = draft;
    const controller = new AbortController(); requestRef.current = controller; setBusy(true); setInferenceProgress(null); setNotice(''); setResult(null);
    const timeout = setTimeout(() => controller.abort('timeout'), browserInference ? 300000 : 90000);
    try {
      const response = await classifyLeather(image, controller.signal, setInferenceProgress);
      const thumbnail = await resizeImage(image, 512, .76);
      if (controller.signal.aborted) return;
      const scan: ScanResult = { id: crypto.randomUUID(), timestamp: Date.now(), imageUrl: thumbnail, matches: response.matches, source: response.source || 'local', device: /Mobi/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop' };
      setResult(scan); setMatchIndex(0); setHealth({ modelAvailable: true, provider: scan.source }); setHealthChecked(true);
      if (autoSave) {
        setScans(items => [scan, ...items].slice(0, 30));
        if (syncMode === 'server') try { await request('/api/history', { method: 'POST', body: JSON.stringify({ scan }), signal: controller.signal }); }
        catch { setSyncMode('local'); setNotice(t('The result is saved on this browser. Shared history is currently unavailable.', '结果已保存在此浏览器，共享历史暂时不可用。')); }
      }
    } catch (error) {
      if (controller.signal.aborted) { if (controller.signal.reason === 'timeout') setNotice(t('Analysis timed out. Please retry or choose a smaller image.', '分析超时，请重试或选择较小的图片。')); }
      else setNotice(t(`Analysis could not complete. ${error instanceof Error ? error.message : 'Please try again.'}`, '分析未完成，请确认识别服务已连接后重试。'));
    } finally { clearTimeout(timeout); if (requestRef.current === controller) { requestRef.current = null; setBusy(false); } }
  }
  async function deleteScans(ids: string[]) {
    setDeleteIds(null);
    if (syncMode === 'server') {
      try { await Promise.all(ids.map(id => request(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' }))); }
      catch { setNotice(t('Shared deletion did not complete. Refresh history before trying again.', '共享记录删除未完成，请刷新历史后再试。')); void refreshHistory(); return; }
    }
    setScans(items => items.filter(scan => !ids.includes(scan.id))); setSelectedIds([]);
  }
  async function refreshHistory() {
    if (browserInference) { setScans(validScans(readStored(storageKey, []))); setNotice(t('Browser records refreshed.', '浏览器记录已刷新。')); return; }
    try { const data = await request<{ history: ScanResult[] }>('/api/history'); if (!Array.isArray(data.history)) throw new Error(); setScans(validScans(data.history)); setSyncMode('server'); }
    catch { setSyncMode('local'); setNotice(t('Shared history is unavailable. Your browser records are still available.', '共享历史暂时不可用，此浏览器的记录仍可使用。')); }
  }
  async function updateNote(scan: ScanResult, note: string) {
    const clean = note.trim().slice(0, 300); if (clean === (scan.note || '')) return;
    setScans(items => items.map(item => item.id === scan.id ? { ...item, note: clean } : item));
    if (result?.id === scan.id) setResult(value => value ? { ...value, note: clean } : value);
    if (syncMode === 'server') try { await request(`/api/history/${encodeURIComponent(scan.id)}`, { method: 'PATCH', body: JSON.stringify({ note: clean }) }); }
    catch { setSyncMode('local'); setNotice(t('Your note was saved locally. Shared sync is unavailable.', '备注已保存在本地，共享同步暂时不可用。')); }
  }
  const filteredScans = useMemo(() => scans.filter(scan => `${scan.matches.map(match => match.label).join(' ')} ${scan.note || ''} ${new Date(scan.timestamp).toISOString().slice(0, 10)}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'confidence' ? b.matches[0].confidence - a.matches[0].confidence : sort === 'name' ? a.matches[0].label.localeCompare(b.matches[0].label) : b.timestamp - a.timestamp), [scans, query, sort]);
  const filteredMaterials = useMemo(() => materials.filter(material => material.id.toLowerCase().includes(archiveQuery.toLowerCase()) && (archiveFilter !== 'favorites' || favorites.includes(material.id))), [archiveQuery, archiveFilter, favorites]);
  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / 12));
  useEffect(() => { setArchivePage(0); }, [archiveQuery, archiveFilter]);
  useEffect(() => { setArchivePage(page => Math.min(page, pageCount - 1)); }, [pageCount]);
  const toggleFavorite = (id: string) => setFavorites(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  const currentMatch = result?.matches[matchIndex];
  const reference = currentMatch ? referenceUrl(currentMatch.referenceUrl) || materials.find(material => material.id === currentMatch.label)?.image : null;
  const status = !healthChecked ? t('Checking model', '检查模型中') : health?.modelAvailable ? browserInference ? t('On-device inference', '浏览器本地推理') : t('Inference connected', '推理服务已连接') : t('Inference unavailable', '推理服务未连接');

  const materialCard = (material: Material) => <article className="material-card" key={material.id}>
    <button className="material-image" onClick={() => openPreview(material.image, material.id)} aria-label={`${t('Enlarge', '放大')} ${material.id}`}><img src={material.thumbnail} srcSet={`${material.thumbnail} 360w, ${material.image} 640w`} sizes="(max-width: 699px) 43vw, (max-width: 959px) 32vw, 24vw" alt={`${material.id} ${t('leather reference texture', '皮革参考纹理')}`} loading="lazy" width="640" height="640" /><span><Expand size={18} /></span></button>
    <div className="material-meta"><div><strong>{material.id}</strong><span>{material.samples} {t(material.samples === 1 ? 'reference image' : 'reference images', '张参考图像')}</span></div><button className={`icon-button favorite ${favorites.includes(material.id) ? 'selected' : ''}`} aria-label={`${favorites.includes(material.id) ? t('Unfavorite', '取消收藏') : t('Favorite', '收藏')} ${material.id}`} aria-pressed={favorites.includes(material.id)} onClick={() => toggleFavorite(material.id)}><Star size={18} /></button></div>
  </article>;
  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <a href="#main" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>{t('Skip to content', '跳转到主要内容')}</a>
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label={t('Primary navigation', '主要导航')}>
      <a className="brand" href="#overview" onClick={() => setMenuOpen(false)}><img src="/favicon.svg" width="38" height="38" alt="" /><span>LeatherMind<small>{t('Material intelligence', '皮革材质识别')}</small></span></a>
      <nav>{views.map(target => { const Icon = navIcons[target]; return <a key={target} href={`#${target}`} onClick={() => setMenuOpen(false)} className={`nav-item ${view === target ? 'active' : ''}`} aria-current={view === target ? 'page' : undefined}><Icon size={19} /><span>{labels[target]}</span>{view === target && <span className="nav-active-mark" />}</a>; })}</nav>
      <div className="sidebar-bottom"><div className="sidebar-study"><FlaskConical size={19} /><span>{t('Reference collection', '参考样本集合')}<strong>{materials.length} {t('texture classes', '个纹理类别')}</strong></span></div>
        <div className="sidebar-controls"><button onClick={() => setLanguage(value => value === 'en' ? 'zh' : 'en')} aria-label={t('Switch to Chinese', 'Switch to English')}><span>{language === 'en' ? 'EN' : '中'}</span><span>{language === 'en' ? '中文' : 'English'}</span></button><button className="icon-button" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('Switch to light theme', '切换浅色主题') : t('Switch to dark theme', '切换深色主题')}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button></div>
        <a className="repository-link" href="https://github.com/YanYihann/Leather-Texture-Classifier" target="_blank" rel="noreferrer">{t('Research repository', '研究项目仓库')}<ArrowUpRight size={15} /></a>
      </div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" aria-label={t('Close navigation', '关闭导航')} onClick={() => setMenuOpen(false)} />}
    <div className="main-shell"><header className="topbar"><div className="topbar-location"><button className="icon-button mobile-menu" aria-label={t('Open navigation', '打开导航')} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Menu size={20} /></button><span>LeatherMind</span><span className="breadcrumb-slash">/</span><strong>{labels[view]}</strong></div><div className="connection-status"><span className={`status-dot ${health?.modelAvailable ? 'online' : ''}`} />{status}</div></header>
      <main id="main" tabIndex={-1} className={`main-content view-${view}`}>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('Upload a leather image', '上传皮革图片')} onChange={event => { void prepareFile(event.target.files?.[0]); event.target.value = ''; }} />
        {notice && <div className="notice" role="alert"><CircleHelp size={19} /><span>{notice}</span><button className="icon-button" aria-label={t('Dismiss message', '关闭提示')} onClick={() => setNotice('')}><X size={18} /></button></div>}
        {view === 'overview' && <>
          <section className="overview-hero"><div className="hero-copy"><h1 ref={headingRef} tabIndex={-1}>{language === 'en' ? <>Leather<br />Texture<br /><span>Classification.</span></> : <>皮革纹理<br /><span>智能分类。</span></>}</h1>
            <p className="hero-description">{t('Image-based material identification. Compare ranked predictions with a collection of 203 reference classes.', '基于图像的皮革材质识别。对照 203 个参考类别，分析模型候选结果。')}</p>
            <div className="hero-actions"><button className="button primary" onClick={() => { navigate('classify'); inputRef.current?.click(); }} disabled={preparing}>{preparing ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}{t('Upload a sample', '上传样本')}<ArrowUpRight size={18} /></button><button className="button secondary" onClick={() => void startCamera()}><Camera size={18} />{t('Use camera', '相机拍摄')}</button></div>
            <div className="hero-method"><span><ShieldCheck size={17} />{t('Top-3 candidate comparison', 'Top-3 候选对比')}</span><span><FolderOpen size={17} />{t('Reference-backed analysis', '参考样本对照分析')}</span></div>
            <button className="text-button hero-library-link" onClick={() => navigate('archive')}>{t('Explore the material archive', '浏览材质档案')}<ArrowDown size={16} /></button>
          </div><MaterialVisual t={t} open={openPreview} /></section>
          <section className="featured-section"><div className="section-head"><h2>{t('Reference materials', '参考材质')}</h2><button className="text-button" onClick={() => navigate('archive')}>{t('View collection', '查看集合')}<ArrowUpRight size={18} /></button></div><div className="material-grid featured-grid">{featured.map(materialCard)}</div></section>
          <section className="workflow-section"><h2>{t('From image to identification', '从图像到识别结果')}</h2><div className="workflow-list">{[[Upload, 'Upload or capture', '上传或拍摄', 'Use a well-lit close-up with the texture in focus.', '使用光线均匀、纹理清晰的近摄图像。'], [FlaskConical, 'Classify the texture', '分类纹理', 'The model ranks the three strongest candidate classes.', '模型按置信度返回三个最匹配的类别。'], [Database, 'Compare and document', '比对与记录', 'Inspect reference images and annotate your results.', '对照参考图像并为识别结果添加备注。']].map(([Icon, en, zh, descEn, descZh], index) => { const StepIcon = Icon as typeof Upload; return <div className="workflow-step" key={index}><StepIcon size={22} /><h3>{t(en as string, zh as string)}</h3><p>{t(descEn as string, descZh as string)}</p></div>; })}</div></section>
          {scans.length > 0 && <section className="recent-section"><div className="section-head"><h2>{t('Recent classifications', '最近识别')}</h2><button className="text-button" onClick={() => navigate('history')}>{t('View history', '查看历史')}<ArrowUpRight size={18} /></button></div>{scans.slice(0, 3).map(scan => <button className="recent-row" key={scan.id} onClick={() => { setResult(scan); setDraft(scan.imageUrl); setMatchIndex(0); navigate('classify'); }}><img src={scan.imageUrl} alt="" width="64" height="64" /><strong>{scan.matches[0].label}</strong><span>{date(scan.timestamp)}</span><span className="confidence-value">{scan.matches[0].confidence.toFixed(2)}%</span><ArrowUpRight size={18} /></button>)}</section>}
        </>}

        {view === 'classify' && <>
          <div className="page-heading"><h1 ref={headingRef} tabIndex={-1}>{t('Texture classification', '纹理分类')}</h1><p>{t('Upload a sample, run inference, and inspect the three highest-ranked reference classes.', '上传样本、运行推理，对照置信度最高的三个参考类别。')}</p></div>
          <div className="classification-layout"><section className="workspace-panel"><div className="panel-head"><h2>{t('Input specimen', '输入样本')}</h2><span>{draft ? t('Ready for analysis', '可开始分析') : t('Image acquisition', '图像采集')}</span></div>
            <div className={`input-stage ${draft || cameraStream ? 'has-image' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) event.currentTarget.classList.add('drag-over'); }} onDragLeave={event => event.currentTarget.classList.remove('drag-over')} onDrop={event => { event.preventDefault(); event.currentTarget.classList.remove('drag-over'); void prepareFile(event.dataTransfer.files[0]); }}>
              {cameraStream ? <><video ref={videoRef} autoPlay muted playsInline style={{ transform: `scale(${zoom})` }} /><div className="camera-reticle" aria-hidden="true" /></> : draft ? <><button className="input-preview" onClick={() => openPreview(draft, fileName || t('Input specimen', '输入样本'))}><img src={draft} alt={t('Uploaded leather specimen', '已上传的皮革样本')} /><span><ZoomIn size={18} />{t('Inspect image', '查看图像')}</span></button>{busy && <div className="scan-indicator" aria-hidden="true" />}</> : <div className="upload-empty"><ImagePlus size={44} strokeWidth={1.2} /><h3>{t('Add a leather sample', '添加皮革样本')}</h3><p>{t('Drag an image here, or select a file.', '将图片拖入此处，或选择文件。')}</p><button className="button primary" onClick={() => inputRef.current?.click()} disabled={preparing || cameraLoading}>{preparing ? <LoaderCircle size={18} className="spin" /> : <Upload size={18} />}{t('Choose image', '选择图片')}</button><button className="text-button" onClick={() => void startCamera()} disabled={cameraLoading}>{cameraLoading ? <LoaderCircle size={16} className="spin" /> : <Camera size={16} />}{t('Capture with camera', '使用相机拍摄')}</button><span className="file-formats">JPG / PNG / WEBP · {t('Up to 15 MB', '最大 15 MB')}</span></div>}
            </div>
            {cameraStream ? <div className="camera-controls"><label><ZoomIn size={17} />{t('Zoom', '缩放')}<input type="range" min="1" max="3" step=".1" value={zoom} onChange={event => setZoom(Number(event.target.value))} /><span>{zoom.toFixed(1)}×</span></label><div><button className="button secondary" onClick={stopCamera}>{t('Close camera', '关闭相机')}</button><button className="button primary" onClick={capture}><Camera size={18} />{t('Capture sample', '拍摄样本')}</button></div></div> : <div className="input-toolbar"><span>{fileName || t('No image selected', '尚未选择图片')}</span>{draft && <button className="text-button" disabled={busy || preparing} onClick={() => { setDraft(null); setResult(null); setFileName(''); }}>{t('Remove', '移除')}<X size={15} /></button>}</div>}
            {!cameraStream && <div className="analysis-actions"><button className="button secondary" disabled={busy || preparing} onClick={() => inputRef.current?.click()}><Upload size={18} />{t('Replace image', '更换图片')}</button>{busy ? <button className="button secondary" onClick={cancelAnalysis}>{t('Cancel analysis', '取消分析')}<X size={18} /></button> : <button className="button primary" onClick={() => void analyze()} disabled={!draft || preparing}><FlaskConical size={18} />{t('Run classification', '开始分类')}<ArrowRight size={18} /></button>}</div>}
          </section>
          <section className="results-panel" aria-live="polite"><div className="panel-head"><h2>{t('Analysis results', '分析结果')}</h2><span>TOP 3</span></div>
            {busy ? <div className="analysis-wait"><LoaderCircle size={34} className="spin" /><h3>{inferenceProgress?.stage === 'download' ? t('Loading classification model', '正在加载分类模型') : inferenceProgress?.stage === 'initialize' ? t('Initializing model', '正在初始化模型') : t('Running inference', '正在运行推理')}</h3><p>{inferenceProgress?.stage === 'download' ? t('The model loads on first use and is cached on this device when storage permits.', '首次使用需下载模型，存储空间允许时会缓存在此设备。') : t('Extracting texture features and ranking candidate classes.', '正在提取纹理特征并计算候选类别。')}</p>{inferenceProgress?.stage === 'download' && <div className="download-progress"><progress aria-label={t('Model download progress', '模型下载进度')} value={inferenceProgress.received} max={inferenceProgress.total} /><span>{((inferenceProgress.received || 0) / 1000000).toFixed(1)} / {((inferenceProgress.total || 0) / 1000000).toFixed(1)} MB</span></div>}<span>{elapsed}s {t('elapsed', '已等待')}{elapsed >= 20 ? t(' · First inference may take longer.', ' · 首次推理可能需要更久。') : ''}</span></div> : result ? <>
              <div className="result-summary"><span>{t('Highest-ranked class', '最匹配类别')}</span><h3>{result.matches[0].label}</h3><strong>{result.matches[0].confidence.toFixed(2)}<small>%</small></strong><span>{t('Model confidence', '模型置信度')}</span></div>
              <div className="match-list" role="group" aria-label={t('Compare classification candidates', '对比分类候选')}>
                {result.matches.map((match, index) => <button key={`${match.label}-${index}`} className={`match-option ${index === matchIndex ? 'selected' : ''}`} aria-pressed={index === matchIndex} onClick={() => setMatchIndex(index)}><span className="rank">{String(index + 1).padStart(2, '0')}</span><strong>{match.label}</strong><span>{match.confidence.toFixed(2)}%</span><ChevronRight size={17} /></button>)}
              </div>
              <div className="reference-head"><h3>{t('Reference comparison', '参考图对比')}</h3><span>{currentMatch?.label}</span></div><div className="comparison-images"><button onClick={() => openPreview(draft || result.imageUrl, t('Input specimen', '输入样本'))}><img src={result.imageUrl} alt={t('Input specimen', '输入样本')} /><span>{t('Input specimen', '输入样本')}</span></button>{reference ? <button onClick={() => openPreview(reference, currentMatch!.label)}><img src={reference} alt={`${currentMatch?.label} ${t('reference', '参考图')}`} onError={event => { const fallback = materials.find(material => material.id === currentMatch?.label)?.image; if (fallback && event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback; else event.currentTarget.style.visibility = 'hidden'; }} /><span>{t('Reference specimen', '参考样本')}</span></button> : <div className="reference-missing">{t('No reference image for this candidate.', '此候选没有参考图像。')}</div>}</div>
              <p className="result-caveat">{t('Confidence is the model’s probability for a class, not a verified measure of material composition or accuracy.', '置信度表示模型对类别的预测概率，不等同于材质成分或经验证的准确率。')}</p>
              <button className="button secondary export-result" onClick={() => downloadJson(result, `leathermind-${result.id}.json`)}><Download size={17} />{t('Export result', '导出结果')}</button>
            </> : <div className="result-empty"><FlaskConical size={40} strokeWidth={1.2} /><h3>{t('Awaiting a specimen', '等待样本')}</h3><p>{t('Your candidate classes and reference comparison will appear here after classification.', '分类完成后，此处会显示候选类别与参考图对比。')}</p><div className="capture-guidance"><h4>{t('For a reliable input', '图像采集建议')}</h4><p>{t('Use diffuse light. Keep the image sharp. Fill the frame with one material and avoid seams or labels.', '使用均匀散射光，保持对焦清晰，让单一材质填满画面，并避开接缝和标签。')}</p></div></div>}
          </section></div>
        </>}

        {view === 'archive' && <><div className="page-heading"><h1 ref={headingRef} tabIndex={-1}>{t('Material archive', '材质档案')}</h1><p>{t('Browse the reference specimens used by the texture classifier. Identifiers represent dataset classes.', '浏览纹理分类器的真实参考样本。编号对应数据集中的类别。')}</p></div><div className="filter-toolbar"><label className="search-input"><Search size={18} /><span className="visually-hidden">{t('Search material identifier', '搜索材质编号')}</span><input value={archiveQuery} onChange={event => setArchiveQuery(event.target.value)} placeholder={t('Search class identifier…', '搜索类别编号…')} /></label><div className="segmented-control"><button aria-pressed={archiveFilter === 'all'} className={archiveFilter === 'all' ? 'selected' : ''} onClick={() => setArchiveFilter('all')}>{t('All materials', '全部材质')}</button><button aria-pressed={archiveFilter === 'favorites'} className={archiveFilter === 'favorites' ? 'selected' : ''} onClick={() => setArchiveFilter('favorites')}><Star size={15} />{t('Favorites', '收藏')}</button></div><span className="filter-count">{filteredMaterials.length} {t('classes', '个类别')}</span></div>{filteredMaterials.length ? <><div className="material-grid archive-grid">{filteredMaterials.slice(archivePage * 12, archivePage * 12 + 12).map(materialCard)}</div><div className="pagination"><span>{t('Page', '页')} {archivePage + 1} / {pageCount}</span><button className="button secondary" disabled={archivePage === 0} onClick={() => { setArchivePage(page => page - 1); headingRef.current?.scrollIntoView(); }}><ChevronLeft size={17} />{t('Previous', '上一页')}</button><button className="button secondary" disabled={archivePage + 1 >= pageCount} onClick={() => { setArchivePage(page => page + 1); headingRef.current?.scrollIntoView(); }}>{t('Next', '下一页')}<ChevronRight size={17} /></button></div></> : <div className="empty-state"><Search size={32} /><h2>{t('No specimens found', '未找到样本')}</h2><p>{archiveFilter === 'favorites' ? t('Favorite a specimen using the star next to its identifier.', '点击样本编号旁的星标添加收藏。') : t('Try another class identifier or clear the search.', '请尝试其他类别编号或清空搜索。')}</p><button className="button secondary" onClick={() => { setArchiveQuery(''); setArchiveFilter('all'); }}>{t('Show all materials', '显示全部材质')}</button></div>}</>}

        {view === 'history' && <><div className="page-heading"><h1 ref={headingRef} tabIndex={-1}>{t('Scan history', '识别历史')}</h1><p>{t('Review classifications, annotate findings, and export your records.', '回顾分类结果，添加研究备注，并导出识别记录。')}</p></div><div className="history-heading-controls"><span className="storage-label"><FolderOpen size={17} />{syncMode === 'server' ? t('Shared archive + browser cache', '共享档案与浏览器缓存') : t('Stored in this browser', '存储在此浏览器')} · {scans.length} {t('records', '条记录')}</span><div><button className="button secondary" onClick={() => void refreshHistory()}>{t('Refresh', '刷新')}</button><button className="button secondary" disabled={!scans.length} onClick={() => downloadJson(scans, 'leathermind-history.json')}><Download size={17} />{t('Export all', '导出全部')}</button></div></div><div className="filter-toolbar"><label className="search-input"><Search size={18} /><span className="visually-hidden">{t('Search history', '搜索历史')}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search class, note or date…', '搜索类别、备注或日期…')} /></label><label className="sort-control">{t('Sort by', '排序')}<select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="newest">{t('Most recent', '最近时间')}</option><option value="confidence">{t('Confidence', '置信度')}</option><option value="name">{t('Class identifier', '类别编号')}</option></select></label></div>
          {scans.length > 0 && <div className="selection-toolbar"><label><input type="checkbox" checked={filteredScans.length > 0 && filteredScans.every(scan => selectedIds.includes(scan.id))} onChange={event => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...filteredScans.map(scan => scan.id)])] : selectedIds.filter(id => !filteredScans.some(scan => scan.id === id)))} />{t('Select visible results', '选择可见结果')}</label><button className="text-button danger-text" disabled={!selectedIds.length} onClick={() => setDeleteIds(selectedIds)}><Trash2 size={16} />{t('Delete selected', '删除所选')} {selectedIds.length ? `(${selectedIds.length})` : ''}</button></div>}
          {filteredScans.length ? <div className="history-list">{filteredScans.map(scan => <article className="history-item" key={scan.id}><div className="history-item-main"><label className="record-checkbox"><span className="visually-hidden">{t('Select', '选择')} {scan.matches[0].label} {date(scan.timestamp)}</span><input type="checkbox" checked={selectedIds.includes(scan.id)} onChange={event => setSelectedIds(items => event.target.checked ? [...items, scan.id] : items.filter(id => id !== scan.id))} /></label><button className="history-thumbnail" onClick={() => openPreview(scan.imageUrl, scan.matches[0].label)}><img src={scan.imageUrl} alt={`${scan.matches[0].label} ${t('scan', '识别图像')}`} width="88" height="88" loading="lazy" /></button><button className="history-result-link" onClick={() => { setResult(scan); setDraft(scan.imageUrl); setFileName(t('Saved specimen', '已保存样本')); setMatchIndex(0); navigate('classify'); }}><h2>{scan.matches[0].label}</h2><span>{date(scan.timestamp)} · {scan.device || t('Unspecified device', '未记录设备')}</span></button><div className="history-confidence"><strong>{scan.matches[0].confidence.toFixed(2)}%</strong><span>{t('confidence', '置信度')}</span></div><button className="icon-button danger-text" aria-label={`${t('Delete record', '删除记录')} ${scan.matches[0].label}`} onClick={() => setDeleteIds([scan.id])}><Trash2 size={17} /></button></div><label className="note-field"><span>{t('Research note', '研究备注')}</span><input key={`${scan.id}-${scan.note || ''}`} defaultValue={scan.note || ''} maxLength={300} placeholder={t('Add a note about this specimen…', '添加样本备注…')} onBlur={event => void updateNote(scan, event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label></article>)}</div> : <div className="empty-state"><History size={36} /><h2>{scans.length ? t('No matching records', '没有匹配记录') : t('No classifications yet', '尚无分类记录')}</h2><p>{scans.length ? t('Try another class, note or date.', '请尝试其他类别、备注或日期。') : t('Run your first classification to begin a specimen archive.', '运行首次分类，开始建立样本记录。')}</p><button className="button primary" onClick={() => scans.length ? setQuery('') : navigate('classify')}>{scans.length ? t('Clear search', '清空搜索') : t('Classify a sample', '识别样本')}<ArrowRight size={17} /></button></div>}
        </>}

        {view === 'settings' && <><div className="page-heading"><h1 ref={headingRef} tabIndex={-1}>{t('Preferences', '应用偏好')}</h1><p>{t('Configure your workspace, language and result storage.', '配置工作台主题、语言与识别结果存储。')}</p></div><div className="settings-list"><section><h2>{t('Workspace', '工作台')}</h2><div className="setting-row"><label htmlFor="theme-select">{t('Appearance', '外观')}<span>{t('The material archive supports dark and light themes.', '材质档案支持深色与浅色主题。')}</span></label><select id="theme-select" value={theme} onChange={event => setTheme(event.target.value as typeof theme)}><option value="dark">{t('Dark', '深色')}</option><option value="light">{t('Light', '浅色')}</option></select></div><div className="setting-row"><label htmlFor="language-select">{t('Interface language', '界面语言')}<span>{t('English is the default for new sessions.', '新用户默认使用英文界面。')}</span></label><select id="language-select" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="zh">中文</option></select></div></section><section><h2>{t('Recognition records', '识别记录')}</h2><div className="setting-row"><label htmlFor="autosave">{t('Automatically save results', '自动保存结果')}<span>{t('Store successful classifications in your scan history.', '将成功分类的结果保存到识别历史。')}</span></label><input id="autosave" type="checkbox" className="switch" checked={autoSave} onChange={event => setAutoSave(event.target.checked)} /></div><div className="setting-row"><div>{t('Storage location', '存储位置')}<span>{syncMode === 'server' ? t('Records are shared with other visitors to this service and cached in your browser.', '记录与此服务的其他访问者共享，并缓存在此浏览器中。') : t('Records are available on this browser only.', '记录仅在此浏览器中可用。')}</span></div><button className="button secondary" onClick={() => navigate('history')}>{t('Manage records', '管理记录')}<ArrowUpRight size={16} /></button></div></section><section><h2>{t('Model information', '模型信息')}</h2><div className="model-information"><p><span>{t('Reference classes', '参考类别')}</span><strong>{materials.length}</strong></p><p><span>{t('Classification method', '分类方法')}</span><strong>ResNet50</strong></p><p><span>{t('Service connection', '服务连接')}</span><strong>{status}</strong></p></div><p className="setting-explanation">{t('Dataset class identifiers are reference labels. They do not independently establish a leather’s commercial name, chemical composition or quality grade.', '数据集类别编号是参考标签，不能独立确定皮革的商业名称、化学成分或质量等级。')}</p></section></div></>}
      </main><footer className="footer"><span>LeatherMind <span className="footer-separator">/</span> {t('Leather texture classification', '皮革纹理分类')}</span><span>{t('Reference-based material analysis', '基于参考样本的材质分析')}</span></footer>
    </div>
    {preview && <Dialog title={preview.title} close={() => setPreview(null)} className="image-dialog"><img src={preview.src} alt={preview.title} /></Dialog>}
    {deleteIds && <Dialog title={t('Delete classification records?', '删除识别记录？')} close={() => setDeleteIds(null)}><p>{t(`Delete ${deleteIds.length} record${deleteIds.length === 1 ? '' : 's'}${syncMode === 'server' ? ' from the shared archive and this browser' : ' from this browser'}? This cannot be undone.`, `删除${syncMode === 'server' ? '共享档案与此浏览器中的' : '此浏览器中的'} ${deleteIds.length} 条记录？此操作无法撤销。`)}</p><div className="dialog-actions"><button className="button secondary" onClick={() => setDeleteIds(null)}>{t('Keep records', '保留记录')}</button><button className="button danger" onClick={() => void deleteScans(deleteIds)}><Trash2 size={17} />{t('Delete records', '删除记录')}</button></div></Dialog>}
  </div></MotionConfig>;
}
