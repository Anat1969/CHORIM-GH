import { useState, type ReactNode } from 'react';
import { ACTIONS, DISCS, actionOf, anchors, pct, promptFor, yearLabel, type analyse, type Hit } from './engine';
import { Rich } from './Rich';
import type { Step } from './App';

type Analysis = ReturnType<typeof analyse>;
type Row = Analysis['rows'][number];
type Shared = { m: Analysis; raw: Analysis; rejected: string[]; setRejected: (f: (x: string[]) => string[]) => void; precision: number; checked: number; go: (s: Step, d?: string | null, a?: string | null) => void };

const FAMILY_ORDER = ['ruach', 'sechel', 'regesh', 'yetzer'];
const CORE = ACTIONS.filter((a) => a.id !== 'other');
const actHe = (id: string) => ACTIONS.find((a) => a.id === id)!.he;
const hitKey = (h: Hit) => `${h.app.id}:${h.dm}`;
const pts = (x: number) => (x * 100).toFixed(1);

/** Every station opens the same way: what the screen says (the insight), and what you do here. */
function Head({ n, kicker, title, sub, aside }: { n: string; kicker: string; title: string; sub: string; aside?: ReactNode }) {
  return (
    <header className="st-head">
      <div className="st-head-text">
        <p className="st-kicker"><span className="num st-n">{n}</span>{kicker}</p>
        <h1 className="st-title"><Rich text={title} /></h1>
        <p className="st-sub"><Rich text={sub} /></p>
      </div>
      {aside && <div className="st-head-aside">{aside}</div>}
    </header>
  );
}

function Example({ label = 'דוגמה מהתיק', children }: { label?: string; children: ReactNode }) {
  return <div className="example"><p className="ex-label">{label}</p>{children}</div>;
}

/* ===== 1. השיטה ===== */
export function MethodPage({ m, raw, precision, checked, go }: Shared) {
  const ex = m.hits.find((h) => h.field === 'מילות מפתח' && h.dm !== 'architecture') || m.hits[0];
  const exRow = ex && m.rows.find((r) => r.d.id === ex.dm)!;
  const top = m.ranked[0];
  const totalHits = m.hits.length;
  return (
    <main className="app-main st st-method">
      <Head n="1" kicker="השיטה · שלושה שלבים"
        title="==מילון גלוי, חשבון פשוט, ובדיקה שלך.=="
        sub={`הכלי מחבר בין **${m.apps.length}** אפליקציות בתיק ל-**${DISCS.length}** גילויים ב-**14** תחומי ידע. כל שלב מוצג כאן על הנתונים האמיתיים.`} />

      <ol className="method-steps">
        <li className="m-step">
          <p className="m-n num">01</p>
          <h2>מיפוי: איזה תחום אפליקציה נוגעת בו</h2>
          <p className="m-what">לכל תחום ידע יש <strong>רשימת מילים</strong>. הכלי מחפש אותן בשם, במילות המפתח, במילים הנרדפות ובתיאור של כל אפליקציה.</p>
          {ex && exRow && (
            <Example>
              <div className="flow">
                <span className="flow-box">{ex.app.n}</span>
                <span className="flow-arrow">נמצאה המילה <mark className="insight">{ex.word}</mark> ב{ex.field}</span>
                <span className="flow-box" style={{ color: exRow.d.color }}>{exRow.d.he}</span>
                <span className="flow-arrow">הפעולה של האפליקציה</span>
                <span className="flow-box">{actHe(actionOf(ex.app.a))}</span>
              </div>
              <p className="ex-out">התוצאה: משבצת אחת שחורה במפה, בשורה <strong>{exRow.d.he}</strong> ובעמודה <strong>{actHe(actionOf(ex.app.a))}</strong>.</p>
            </Example>
          )}
          <p className="m-std">התקן: מילון פתוח ב-<span className="num">src/engine.ts</span>. כל התאמה על המסך מראה את המילה ואת השדה.</p>
        </li>

        <li className="m-step">
          <p className="m-n num">02</p>
          <h2>חישוב: כמה התחום חסר</h2>
          <p className="m-what"><strong>חור</strong> = חלק התחום בידע, פחות חלקו בתיק. התוצאה בנקודות אחוז. חיובי: חסר. שלילי: בנוי מעבר לחלקו.</p>
          <Example label={`דוגמה: ${top.d.he}, החור הגדול`}>
            <div className="calc">
              <p><span>חלק בידע</span><span className="num">{top.k} / {DISCS.length}</span><span className="num calc-v">{pts(top.kShare)}%</span></p>
              <p><span>חלק בתיק</span><span className="num">{top.hits.length} / {totalHits}</span><span className="num calc-v">{pts(top.aShare)}%</span></p>
              <p className="calc-r"><span>החור</span><span /><span className="num calc-v">+{pts(top.gap)}</span></p>
            </div>
            <p className="ex-out"><Rich text={`==${top.d.he} מחזיקה פי ${(top.kShare / Math.max(top.aShare, 0.001)).toFixed(1)} יותר מקום בידע מאשר בתיק.==`} /></p>
          </Example>
          <p className="m-std">ההתאמות נספרות ולא האפליקציות: אפליקציה שנוגעת בשני תחומים נספרת בשניהם.</p>
        </li>

        <li className="m-step">
          <p className="m-n num">03</p>
          <h2>בדיקה: הכלי מודד את הדיוק של עצמו</h2>
          <p className="m-what">ליד כל התאמה יש <strong>"לא שייך"</strong>. התאמה שנדחתה יוצאת מהמפה ומהחישוב, והכלי מציג <strong>דיוק מיפוי</strong>.</p>
          <Example label={checked ? 'הבדיקה שלך עד עכשיו' : 'דוגמה'}>
            <div className="calc">
              <p><span>התאמות שהמילון מצא</span><span /><span className="num calc-v">{raw.hits.length}</span></p>
              <p><span>נדחו בבדיקה</span><span /><span className="num calc-v">{checked || 5}</span></p>
              <p className="calc-r"><span>דיוק המיפוי</span><span /><span className="num calc-v">{pct(checked ? precision : (raw.hits.length - 5) / raw.hits.length)}</span></p>
            </div>
            <p className="ex-out">{checked ? 'הבדיקות נשמרות במכשיר, ואפשר לאפס אותן מכפתור הלוגו.' : 'עוד לא דחית התאמה. הדוגמה מניחה 5 דחיות.'}</p>
          </Example>
          <p className="m-std"><span className="t-bad">המגבלה:</span> מילון מוצא מילים, לא כוונה. אפליקציות עירוניות, אישיות ו-AI אינן תחומי ידע במאגר, ולכן לא מופו.</p>
        </li>
      </ol>

      <section className="museum" aria-label="שכבת ידע">
        <figure className="mu-quote">
          <blockquote>"מגבלים חומר לכלי, אבל החלל הריק שבתוכו הוא שעושה אותו לשימושי."</blockquote>
          <figcaption className="src">לאו דזה Laozi, טאו טה צ'ינג, פרק 11. תרגום חופשי.</figcaption>
        </figure>
        <div className="mu-haiku"><p>מגרש ריק בעיר</p><p>עשב בין שני בתים</p><p>שם יקום הבא</p></div>
        <div className="mu-city">
          <p className="ex-label">דוגמה מהעיר</p>
          <p>בתוכנית מתאר של אשדוד, מגרש <strong>ביעוד עתידי</strong> הוא החלטה, לא כישלון. כך גם כאן: חור הוא מגרש שעוד לא קיבל יעוד.</p>
          <button className="link-btn" onClick={() => go('map')}>לראות את המגרשים במפה</button>
        </div>
      </section>
    </main>
  );
}

/* ===== 2. המפה ===== */
export function MapPage({ m, go, act, setAct }: Shared & { act: string | null; setAct: (a: string | null) => void }) {
  const total = m.rows.length * CORE.length;
  const filled = m.rows.reduce((s, r) => s + r.cells.filter((c) => c.a !== 'other' && c.apps.length).length, 0);
  const arch = m.rows.find((r) => r.d.id === 'architecture')!;
  const holes = m.holes.map((h) => h.d.he).join(' ו');
  const emptyCol = CORE.map((a) => ({ a, n: m.rows.filter((r) => r.cells.find((c) => c.a === a.id)!.apps.length).length })).sort((x, y) => x.n - y.n)[0];
  return (
    <main className="app-main st st-map">
      <Head n="2" kicker="המפה · 14 תחומים × 7 פעולות"
        title={`רק **${filled}** מתוך **${total}** מגרשים בנויים`}
        sub={`שחור: יש אפליקציה. לבן מקווקו: חור. ${holes ? `==${holes} ריקים לגמרי.==` : ''} לחיצה על תחום או על משבצת פותחת את התחום.`}
        aside={
          <div className="facts">
            <p><span className="num fact-v t-bad">{m.holes.length}</span><span>תחומים בלי אף אפליקציה</span></p>
            <p><span className="num fact-v">{pct(arch.aShare)}</span><span>מהתיק באדריכלות, מול {pct(arch.kShare)} מהידע</span></p>
            <p><span className="num fact-v">{emptyCol.n}/14</span><span>תחומים עם {emptyCol.a.he}: הפעולה הנדירה</span></p>
          </div>
        } />

      <section className="nolli" role="grid" aria-label="מפת התיק: תחום ידע מול פעולה">
        <div className="n-head" role="row">
          <span className="n-name n-head-name">תחום ידע</span>
          {CORE.map((a) => <button key={a.id} role="columnheader" className={`n-col press ${act === a.id ? 'is-on' : ''}`} aria-pressed={act === a.id} title="הבלטת הפעולה" onClick={() => setAct(act === a.id ? null : a.id)}>{a.he}</button>)}
          <span className="n-bal-h">ידע מול תיק</span>
        </div>
        {FAMILY_ORDER.map((f) => {
          const list = m.rows.filter((r) => r.d.family === f);
          return (
            <div key={f} className="n-family" style={{ ['--c' as string]: list[0].d.color }}>
              <span className="n-fam-label" style={{ gridRow: `1 / span ${list.length}` }}>{list[0].d.familyHe}</span>
              {list.map((r) => (
                <div key={r.d.id} role="row" className={`n-row ${!r.hits.length ? 'is-hole' : ''}`}>
                  <button className="n-name press" onClick={() => go('domain', r.d.id, null)}>
                    {r.d.he} <span className="num n-count">{r.hits.length}</span>
                  </button>
                  {r.cells.filter((c) => c.a !== 'other').map((c) => (
                    <button key={c.a} role="gridcell" className={`n-cell press ${c.apps.length ? 'built' : 'void'} ${act && act !== c.a ? 'is-mute' : ''}`}
                      aria-label={`${r.d.he}, ${actHe(c.a)}: ${c.apps.length} אפליקציות`}
                      title={c.apps.map((h) => h.app.n).join('\n') || 'חור: לחיצה פותחת על מה לבנות'}
                      onClick={() => go('domain', r.d.id, c.a)}>
                      {c.apps.length > 0 && <i style={{ ['--s' as string]: Math.min(1, 0.45 + c.apps.length * 0.18) }} />}
                      {c.apps.length > 1 && <span className="num">{c.apps.length}</span>}
                    </button>
                  ))}
                  <span className="n-bal" title={`ידע ${pct(r.kShare)} · תיק ${pct(r.aShare)}`}>
                    <span className="bal-k" style={{ width: `${Math.min(100, r.kShare * 400)}%` }} />
                    <span className="bal-a" style={{ width: `${Math.min(100, r.aShare * 400)}%` }} />
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </section>
      <p className="n-legend">
        <span><i className="lg built" /> בנוי: יש אפליקציה. המספר: כמה.</span>
        <span><i className="lg void" /> חור</span>
        <span><i className="lg holering" /> תחום שכולו חור</span>
        <span><i className="lg bal-k" /> חלק התחום בידע</span>
        <span><i className="lg bal-a" /> חלק התחום בתיק</span>
        <span className="lg-how"><strong>איך קוראים:</strong> בשורה של אדריכלות כמעט הכול שחור, והפס השחור ארוך מהצבעוני: <mark className="insight">בנוי מעבר לחלקו בידע.</mark></span>
      </p>
    </main>
  );
}

/* ===== 3. הדירוג ===== */
export function RankPage({ m, go, precision, checked, raw }: Shared) {
  const lack = m.ranked.filter((r) => r.gap > 0);
  const over = m.ranked.filter((r) => r.gap <= 0).reverse();
  const max = Math.max(...m.rows.map((r) => Math.max(r.kShare, r.aShare)));
  const top3 = lack.slice(0, 3).map((r) => r.d.he);
  const Line = ({ r, i, kind }: { r: Row; i: number; kind: 'lack' | 'over' }) => (
    <li>
      <button className={`rk press rk-${kind}`} onClick={() => go('domain', r.d.id, null)}>
        <span className="num rk-i">{i + 1}</span>
        <span className="rk-name" style={{ color: r.d.color }}>{r.d.he}</span>
        <span className="rk-bars">
          <span className="rk-bar k" style={{ width: `${(r.kShare / max) * 100}%`, background: r.d.color }} />
          <span className="rk-bar a" style={{ width: `${(r.aShare / max) * 100}%` }} />
        </span>
        <span className="rk-pair num">{pct(r.kShare)} · {pct(r.aShare)}</span>
        <span className={`num rk-v ${kind === 'lack' ? 't-bad' : 't-good'}`}>{kind === 'lack' ? '+' : ''}{pts(r.gap)}</span>
      </button>
    </li>
  );
  const t = lack[0];
  return (
    <main className="app-main st st-rank">
      <Head n="3" kicker="הדירוג · חלק בידע פחות חלק בתיק"
        title={`==החוסר הגדול: ${top3.join(', ')}.==`}
        sub={`**${lack.length}** תחומים חסרים, ו-**${over.length}** בנויים מעבר לחלקם בידע. לחיצה על שורה פותחת על מה לבנות.`} />
      <div className="rank-grid">
        <section className="rank-col">
          <p className="col-h"><span className="t-bad">חסר</span> · מהגדול לקטן</p>
          <p className="rk-keys"><span><i className="key k" /> בידע</span><span><i className="key a" /> בתיק</span><span>נקודות אחוז</span></p>
          <ol className="rk-list">{lack.map((r, i) => <Line key={r.d.id} r={r} i={i} kind="lack" />)}</ol>
          {!!over.length && <>
            <p className="col-h"><span className="t-good">בנוי מעבר לחלקו</span></p>
            <ol className="rk-list">{over.map((r, i) => <Line key={r.d.id} r={r} i={i} kind="over" />)}</ol>
          </>}
        </section>
        <aside className="rank-aside">
          <div className="card-b">
            <p className="ex-label">איך מגיעים למספר של {t.d.he}</p>
            <div className="calc big">
              <p><span>{t.k} מתוך {DISCS.length} גילויים</span><span className="num calc-v">{pts(t.kShare)}%</span></p>
              <p><span>{t.hits.length} מתוך {m.hits.length} התאמות בתיק</span><span className="num calc-v">−{pts(t.aShare)}%</span></p>
              <p className="calc-r"><span>החור</span><span className="num calc-v t-bad">+{pts(t.gap)}</span></p>
            </div>
            <p className="m-what"><Rich text={`==כל נקודה היא מקום שהידע תופס והתיק לא.==`} /></p>
          </div>
          <div className="card-b">
            <p className="ex-label">דיוק המיפוי, לפי הבדיקה שלך</p>
            <p className="kpi"><span className="num kpi-v">{checked ? pct(precision) : '—'}</span></p>
            <p className="m-what">{checked ? `דחית ${checked} מתוך ${raw.hits.length} התאמות. הדירוג כבר מחושב בלעדיהן.` : 'עוד לא בדקת. פתחי תחום, ולחצי "לא שייך" ליד התאמה שגויה.'}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ===== 4. תחום ופרומפט ===== */
export function DomainPage({ m, rejected, setRejected, sel, setSel, act, setAct }: Shared & { sel: string; setSel: (d: string) => void; act: string | null; setAct: (a: string | null) => void }) {
  const [copied, setCopied] = useState(false);
  const row = m.rows.find((r) => r.d.id === sel) || m.ranked[0];
  const firstEmpty = row.cells.find((c) => c.a !== 'other' && !c.apps.length)?.a || 'diagnose';
  const action = act && act !== 'other' ? act : firstEmpty;
  const cell = row.cells.find((c) => c.a === action)!;
  const base = anchors(row.d.id);
  const prompt = promptFor(row.d, action, row.hits.map((h) => h.app));
  const rank = m.ranked.findIndex((r) => r.d.id === row.d.id) + 1;
  const ordered = FAMILY_ORDER.flatMap((f) => m.rows.filter((r) => r.d.family === f));
  const insight = !row.hits.length ? `==אין בתיק אף אפליקציה ב${row.d.he}.== כל פעולה כאן היא מגרש פנוי.`
    : row.gap > 0 ? `==מקום ${rank} בחוסר: +${pts(row.gap)} נקודות.== ${row.empty} מתוך 7 פעולות ריקות.`
    : `==בנוי מעבר לחלקו בידע (${pts(row.gap)}).== כדאי לבדוק את ההתאמות, ולבנות בתחום אחר.`;
  return (
    <main className="app-main st st-domain">
      <nav className="dom-pick" aria-label="בחירת תחום">
        {ordered.map((r) => (
          <button key={r.d.id} className={`dp press ${!r.hits.length ? 'is-hole' : ''}`} aria-pressed={r.d.id === row.d.id} style={{ ['--c' as string]: r.d.color }} onClick={() => { setSel(r.d.id); setAct(null); }}>{r.d.he}</button>
        ))}
      </nav>
      <Head n="4" kicker={`תחום · משפחת ${row.d.familyHe} · ${row.d.en}`}
        title={row.d.he}
        sub={`**${row.k}** גילויים במאגר, **${row.hits.length}** אפליקציות בתיק. ${insight}`} />

      <div className="dom-cols">
        <section className="dom-col">
          <p className="col-h"><span className="num">א</span> מה כבר יש, לפי פעולה</p>
          <div className="p-actions">
            {CORE.map((a) => {
              const c = row.cells.find((x) => x.a === a.id)!;
              return <button key={a.id} className={`chip press ${c.apps.length ? 'has' : 'hole'}`} aria-pressed={action === a.id} onClick={() => setAct(a.id)}>{a.he}{c.apps.length ? <span className="num"> {c.apps.length}</span> : null}</button>;
            })}
          </div>
          {cell.apps.length ? (
            <ul className="hits">{cell.apps.map((h) => (
              <li key={hitKey(h)} className="hit">
                <div>
                  {h.app.u ? <a href={h.app.u} target="_blank" rel="noreferrer" className="hit-n">{h.app.n}</a> : <span className="hit-n">{h.app.n}</span>}
                  <p className="hit-why">נמצא דרך <mark className="insight">{h.word}</mark> ב{h.field}</p>
                </div>
                <button className="link-btn" onClick={() => setRejected((x) => [...x, hitKey(h)])} title="ההתאמה שגויה: להוציא מהמפה ומהחישוב">לא שייך</button>
              </li>
            ))}</ul>
          ) : (
            <p className="hole-line"><Rich text={`==אין אפליקציה של ${actHe(action)} ב${row.d.he}.== זה המגרש לבנות עליו.`} /></p>
          )}
          <p className="hint">בודקים כל התאמה: המילה שמצאה אותה מסומנת. התאמה שגויה? <strong>"לא שייך"</strong>.</p>
          {rejected.some((k) => k.endsWith(`:${row.d.id}`)) && <button className="link-btn" onClick={() => setRejected((x) => x.filter((k) => !k.endsWith(`:${row.d.id}`)))}>החזרת ההתאמות שדחיתי בתחום הזה</button>}
        </section>

        <section className="dom-col">
          <p className="col-h"><span className="num">ב</span> שלושה גילויים לבנות עליהם</p>
          <ul className="anchors">
            {base.map((d) => (
              <li key={d.id}>
                <p className="an-top"><span className="num">{yearLabel(d.y)}</span> <strong>{d.who.join(' ו') || 'יוצר לא ידוע'}</strong></p>
                <p className="a-t">{d.t}</p>
                <a className="src" href={d.src.u} target="_blank" rel="noreferrer">{d.src.t}</a>
              </li>
            ))}
          </ul>
          <p className="hint">מהחדש לישן, אחד מכל תת־תחום. כל גילוי עם מקור מאומת מעולם נעלם.</p>
        </section>

        <section className="dom-col prompt-col">
          <p className="col-h"><span className="num">ג</span> פרומפט ל-Claude Code · {actHe(action)}</p>
          <pre className="prompt" dir="rtl">{prompt}</pre>
          <button className="btn press dark wide" onClick={() => { navigator.clipboard?.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'הועתק' : 'העתקת הפרומפט'}</button>
        </section>
      </div>
    </main>
  );
}
