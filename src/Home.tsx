import { useState } from 'react';
import { ACTIONS, DISCS, type analyse } from './engine';
import { Rich } from './Rich';

type Analysis = ReturnType<typeof analyse>;
const FAMILY_ORDER = ['ruach', 'sechel', 'regesh', 'yetzer'];
const CORE = ACTIONS.filter((a) => a.id !== 'other');

/** A town plan in the manner of Nolli: every knowledge domain is a street block, every action a plot. Built is black, open is white. */
export default function Home({ m, live, open, go, to }: { m: Analysis; live: string; open: (d: string, a?: string) => void; go: () => void; to: (s: 'map' | 'rank') => void }) {
  const [hover, setHover] = useState<{ d: string; a: string } | null>(null);
  const [lg, setLg] = useState<'built' | 'void' | 'hole' | null>(null);
  const rows = FAMILY_ORDER.flatMap((f) => m.rows.filter((r) => r.d.family === f));
  const total = rows.length * CORE.length;
  const filled = rows.reduce((s, r) => s + r.cells.filter((c) => c.a !== 'other' && c.apps.length).length, 0);
  const top = m.ranked[0];
  const W = 1000, H = 560, L = 150, T = 40, R = 30, B = 40;
  const cw = (W - L - R) / CORE.length, rh = (H - T - B) / rows.length;
  const hovRow = hover ? rows.find((r) => r.d.id === hover.d) : null;
  const hovCell = hovRow?.cells.find((c) => c.a === hover!.a);

  return (
    <main className="app-main home">
      <section className="h-hero">
        <p className="h-kicker">החורים בתיק · {m.apps.length} אפליקציות · {DISCS.length} גילויים · {live}</p>
        <h1 className="h-title"><span className="num">{m.holes.length}</span> תחומי ידע <mark className="insight">בלי אף אפליקציה</mark></h1>
        <p className="h-explain"><Rich text={`מתוך **${total}** שילובים של תחום ופעולה, **${filled}** בנויים. הלבן במפה הוא לא ריק: הוא **המקום הבא לבנות**.`} /></p>
        <div className="h-tones">
          <p className="h-tone t-problem"><b>בעיה</b><span>תיק נבנה לפי הצורך של היום. מה שלא בנינו, לא רואים.</span></p>
          <p className="h-tone t-solution"><b>פתרון</b><span>התיק מול כל מפת הידע. כל חור מגיע עם גילויים לבנות עליהם ועם פרומפט מוכן.</span></p>
          <p className="h-tone t-insight"><b>תובנה</b><span><mark className="insight">כמו בעיר: המגרש הפנוי הוא העתודה.</mark></span></p>
        </div>
        <div className="h-cta">
          <button className="btn press go" onClick={go}>מתחילים: איך זה עובד</button>
          <button className="btn press" onClick={() => open(top.d.id)}>ישר לחור הגדול: {top.d.he}</button>
        </div>
      </section>

      <section className="h-stage" aria-label="תוכנית עיר: תחומי ידע ופעולות">
        <svg className="obj nolli-plan" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img">
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#D8D6D0" strokeWidth="1.2" /></pattern>
          </defs>
          {CORE.map((a, j) => (
            <text key={a.id} x={W - L - j * cw - cw / 2} y={T - 14} textAnchor="middle" className="col-t">{a.he}</text>
          ))}
          {rows.map((r, i) => {
            const y = T + i * rh;
            const hole = !r.hits.length;
            return (
              <g key={r.d.id}>
                <text x={W - L + 12} y={y + rh / 2 + 5} className={`row-t ${hole ? 'hole' : ''}`} style={{ fill: hole ? undefined : r.d.color }}>{r.d.he}</text>
                {r.cells.filter((c) => c.a !== 'other').map((c, j) => {
                  const x = W - L - (j + 1) * cw;
                  const n = c.apps.length;
                  const kind = n ? 'built' : hole ? 'hole' : 'void';
                  const pad = n ? Math.max(3, 14 - n * 3) : 3;
                  const dim = (hover && (hover.d !== r.d.id && hover.a !== c.a)) || (lg !== null && lg !== kind);
                  return (
                    <g key={c.a} className={`plot k-${kind} ${dim ? 'is-dim' : ''}`} onMouseEnter={() => setHover({ d: r.d.id, a: c.a })} onMouseLeave={() => setHover(null)} onClick={() => open(r.d.id, c.a)}>
                      <rect x={x + 2} y={y + 2} width={cw - 4} height={rh - 4} className="lot" fill={n ? '#fff' : 'url(#hatch)'} />
                      {n > 0 && <rect x={x + pad} y={y + pad * 0.6} width={cw - pad * 2} height={rh - pad * 1.2} className="bldg" style={{ animationDelay: `${(i * 7 + j) * 7}ms` }} />}
                      {kind === 'hole' && <rect x={x + 4} y={y + 4} width={cw - 8} height={rh - 8} className="hole-ring" style={{ animationDelay: `${j * 160}ms` }} />}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* north arrow and scale bar, as on a plan */}
          <g className="plan-mark" transform={`translate(${L - 120}, ${H - 26})`}>
            <path d="M0,0 L8,-22 L16,0 L8,-6 Z" /><text x="8" y="14" textAnchor="middle">צ</text>
            <rect x="36" y="-8" width="30" height="6" /><rect x="66" y="-8" width="30" height="6" className="w" /><text x="36" y="10">0</text><text x="96" y="10" textAnchor="end">{CORE.length} פעולות</text>
          </g>
        </svg>
        {hovRow && hovCell && (
          <div className="h-hover" dir="rtl">
            <strong>{hovRow.d.he}</strong> · {ACTIONS.find((a) => a.id === hovCell.a)!.he}
            <div>{hovCell.apps.length ? hovCell.apps.slice(0, 4).map((h) => h.app.n).join(' · ') : <>מגרש פנוי. <span className="num">{hovRow.k}</span> גילויים מחכים בתחום.</>}</div>
          </div>
        )}
        <div className="h-legend">
          <span className={`lg ${lg === 'built' ? 'is-on' : ''}`} onMouseEnter={() => setLg('built')} onMouseLeave={() => setLg(null)}><i className="sw" style={{ background: '#1A1A18' }} />בנוי: יש אפליקציה</span>
          <span className={`lg ${lg === 'void' ? 'is-on' : ''}`} onMouseEnter={() => setLg('void')} onMouseLeave={() => setLg(null)}><i className="sw hatch-sw" />מגרש פנוי</span>
          <span className={`lg ${lg === 'hole' ? 'is-on' : ''}`} onMouseEnter={() => setLg('hole')} onMouseLeave={() => setLg(null)}><i className="sw" style={{ boxShadow: 'inset 0 0 0 2px #A3261E' }} />תחום שכולו פנוי</span>
          <span className="lg dim-note">הבניין גדל עם מספר האפליקציות. לחיצה על מגרש פותחת אותו.</span>
        </div>
      </section>

      <nav className="h-route" aria-label="המסלול">
        {[
          { n: '1', t: 'השיטה', d: 'מילון, חשבון ובדיקה, עם דוגמה חיה', go: go },
          { n: '2', t: 'המפה', d: `${filled} מתוך ${total} מגרשים בנויים`, go: () => to('map') },
          { n: '3', t: 'הדירוג', d: <>החוסר הגדול: {top.d.he}, <span className="num">+{(top.gap * 100).toFixed(1)}</span></>, go: () => to('rank') },
          { n: '4', t: 'תחום ופרומפט', d: 'על מה לבנות, ופרומפט מוכן', go: () => open(top.d.id) },
        ].map((s) => (
          <button key={s.n} className="h-step press" onClick={s.go}>
            <span className="num h-step-n">{s.n}</span><strong>{s.t}</strong><span className="d">{s.d}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
