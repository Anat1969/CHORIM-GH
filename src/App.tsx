import { useEffect, useMemo, useState } from 'react';
import { APP_OF_APP, SNAPSHOT, SNAPSHOT_DATE, analyse, loadLive, type App as AppT, type Hit } from './engine';
import Home from './Home';
import { DomainPage, MapPage, MethodPage, RankPage } from './Stations';

const KEY = 'chorim.rejected.v1';
const loadRejected = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const hitKey = (h: Hit) => `${h.app.id}:${h.dm}`;

/** The route of the app: an entrance and four stations, one idea per screen. */
export const STEPS = [
  { id: 'home', n: '', he: 'פתיחה', why: 'מה חסר בתיק' },
  { id: 'method', n: '1', he: 'השיטה', why: 'איך הכלי מוצא חור' },
  { id: 'map', n: '2', he: 'המפה', why: 'תחום מול פעולה' },
  { id: 'rank', n: '3', he: 'הדירוג', why: 'איפה החוסר הגדול' },
  { id: 'domain', n: '4', he: 'תחום ופרומפט', why: 'על מה לבנות' },
] as const;
export type Step = (typeof STEPS)[number]['id'];

const readHash = () => {
  const [path, q] = location.hash.replace(/^#\/?/, '').split('?');
  const sp = new URLSearchParams(q || '');
  const d = sp.get('d'), a = sp.get('a');
  let step = (STEPS.find((s) => s.id === path)?.id || 'home') as Step;
  if (d && step !== 'domain') step = 'domain'; // old links: #/map?d=x opened the domain beside the map
  return { step, d, a };
};

export default function App() {
  const init = readHash();
  const [apps, setApps] = useState<AppT[]>(SNAPSHOT);
  const [live, setLive] = useState<'loading' | 'live' | 'snapshot'>('loading');
  const [rejected, setRejected] = useState<string[]>(loadRejected);
  const [step, setStep] = useState<Step>(init.step);
  const [sel, setSel] = useState<string | null>(init.d);
  const [act, setAct] = useState<string | null>(init.a);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadLive().then((x) => { if (x && x.length) { setApps(x); setLive('live'); } else setLive('snapshot'); }); }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(rejected)); setSaved(true); const t = setTimeout(() => setSaved(false), 1200); return () => clearTimeout(t); } catch { /* */ } }, [rejected]);
  useEffect(() => {
    const sp = new URLSearchParams();
    if (step === 'domain' && sel) sp.set('d', sel);
    if ((step === 'domain' || step === 'map') && act) sp.set('a', act);
    history.replaceState(null, '', `#/${step === 'home' ? '' : step}${sp.toString() ? '?' + sp : ''}`);
  }, [step, sel, act]);
  useEffect(() => { const f = () => { const h = readHash(); setStep(h.step); setSel(h.d); setAct(h.a); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { document.querySelector('.app-main')?.scrollTo?.(0, 0); scrollTo(0, 0); }, [step]);

  const raw = useMemo(() => analyse(apps), [apps]);
  // human check: a rejected match leaves the map, and the share kept is the tool's measured precision
  const m = useMemo(() => {
    const rej = new Set(rejected);
    const r = analyse(raw.apps);
    r.rows.forEach((row) => {
      row.hits = row.hits.filter((h) => !rej.has(hitKey(h)));
      row.cells.forEach((c) => { c.apps = c.apps.filter((h) => !rej.has(hitKey(h))); });
      row.empty = row.cells.filter((c) => !c.apps.length && c.a !== 'other').length;
    });
    const total = r.rows.reduce((s, x) => s + x.hits.length, 0) || 1;
    r.rows.forEach((row) => { row.aShare = row.hits.length / total; row.gap = row.kShare - row.aShare; });
    r.hits = r.rows.flatMap((x) => x.hits);
    r.holes = r.rows.filter((x) => !x.hits.length);
    r.ranked = r.rows.slice().sort((a, b) => b.gap - a.gap);
    return r;
  }, [raw, rejected]);
  const checked = rejected.length;
  const precision = raw.hits.length ? (raw.hits.length - checked) / raw.hits.length : 1;
  const liveLabel = live === 'live' ? 'נתונים חיים' : live === 'snapshot' ? `תמונה מ-${SNAPSHOT_DATE}` : 'טוען';

  const go = (s: Step, d?: string | null, a?: string | null) => { setStep(s); if (d !== undefined) setSel(d); if (a !== undefined) setAct(a); };
  const idx = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[idx - 1], next = STEPS[idx + 1];

  useEffect(() => {
    const el = document.querySelector('ai-menu') as (HTMLElement & { items?: unknown; status?: string }) | null;
    if (!el) return;
    el.items = [
      { label: 'העתקת קישור למסך הזה', onSelect: () => navigator.clipboard?.writeText(location.href) },
      { label: 'איפוס הבדיקות שלי', onSelect: () => setRejected([]) },
      { label: 'תיק העבודות', onSelect: () => open(APP_OF_APP, '_blank') },
    ];
    el.status = saved ? 'נשמר' : liveLabel;
  });

  const shared = { m, raw, rejected, setRejected, precision, checked, go };

  return (
    <div className="app-shell keep-mobile route-shell">
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}><img src="/icon.svg" alt="" /><span>החורים בתיק</span></a>
          <nav className="tabs steps" aria-label="תחנות">
            {STEPS.filter((s) => s.id !== 'home').map((s) => (
              <button key={s.id} className="tab step-tab" aria-current={step === s.id ? 'page' : undefined} onClick={() => go(s.id)}>
                <span className="num step-n">{s.n}</span>{s.he}
              </button>
            ))}
          </nav>
          <div className="bar-end">
            <button className="icon-btn press" aria-label="איך זה עובד" title="איך זה עובד: השיטה ודוגמאות" onClick={() => go('method')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
            </button>
            <ai-menu chat="https://claude.ai/code/session_01UBnSCMKgXaDm7dt8DD2yKe"></ai-menu>
          </div>
        </div>
      </header>

      <div className="station" key={step}>
        {step === 'home' && <Home m={m} live={liveLabel} open={(d, a) => go('domain', d, a || null)} go={() => go('method')} to={(s) => go(s)} />}
        {step === 'method' && <MethodPage {...shared} />}
        {step === 'map' && <MapPage {...shared} act={act} setAct={setAct} />}
        {step === 'rank' && <RankPage {...shared} />}
        {step === 'domain' && <DomainPage {...shared} sel={sel || m.ranked[0].d.id} act={act} setAct={setAct} setSel={setSel} />}
      </div>

      <footer className="stepbar" aria-label="ניווט בין התחנות">
        <div className="stepbar-in">
          {prev ? <button className="btn press step-prev" onClick={() => go(prev.id)}><span aria-hidden>→</span> {prev.n && <span className="num">{prev.n}</span>} {prev.he}</button> : <span className="step-prev" />}
          <div className="step-mid">
            <span className="step-dots" aria-hidden>{STEPS.map((s, i) => <i key={s.id} className={i === idx ? 'on' : i < idx ? 'past' : ''} />)}</span>
            <span className={`src-state s-${live}`}>{live === 'live' ? <>נתונים חיים · <span className="num">{apps.length}</span> אפליקציות</> : live === 'snapshot' ? <>תמונת מצב מ-<span className="num">{SNAPSHOT_DATE}</span> · <span className="num">{apps.length}</span> אפליקציות</> : 'טוען את התיק'}</span>
          </div>
          {next ? <button className="btn press step-next" onClick={() => go(next.id)}>{next.n && <span className="num">{next.n}</span>} {next.he}: {next.why} <span aria-hidden>←</span></button> : <span className="step-next" />}
        </div>
      </footer>
    </div>
  );
}
