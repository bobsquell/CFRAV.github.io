const HOODIE_BODY = "M13 47 L13 26 L4 30 L2 17 L13 13 C11 4 17 2 24 2 C31 2 37 4 35 13 L46 17 L44 30 L35 26 L35 47 Z";
const COLLAR_FRONT = "M13 13 C15 20 19 22 24 22 C29 22 33 20 35 13";
const COLLAR_BACK  = "M13 13 C16 11 20 10 24 10 C28 10 32 11 35 13";
const ACCENT = "#e1b12c";

const SLOT_DEFS = {
  'chest-left':   { cx: 19, cy: 31 },
  'chest-center': { cx: 24, cy: 31 },
  'chest-right':  { cx: 29, cy: 31 },
  'sleeve-left':  { cx: 7,  cy: 27 },
  'sleeve-right': { cx: 41, cy: 27 },
};

export default function PositionIcon({ slots = [] }) {
  const chestSlots = slots.filter(s => SLOT_DEFS[s]);
  const hasBack    = slots.includes('back');
  const hasAny     = chestSlots.length > 0 || hasBack;
  const hasFront   = chestSlots.length > 0;

  const r = chestSlots.length <= 1 ? 5.5 : chestSlots.length === 2 ? 4 : 3;

  return (
    <svg width="48" height="52" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={HOODIE_BODY} fill="#f0f0f0" stroke="#c8c8c8" strokeWidth="1.5" strokeLinejoin="round"/>

      <path d={hasFront || !hasAny ? COLLAR_FRONT : COLLAR_BACK}
        stroke="#c8c8c8" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>

      {!hasAny && (
        <>
          <line x1="17" y1="35" x2="31" y2="21" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="17" y1="21" x2="31" y2="35" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      )}

      {chestSlots.map(s => (
        <circle key={s} cx={SLOT_DEFS[s].cx} cy={SLOT_DEFS[s].cy} r={r} fill={ACCENT}/>
      ))}

      {hasBack && hasFront && (
        <rect x="17" y="23" width="13" height="16" rx="2"
          fill="rgba(225,177,44,0.15)" stroke={ACCENT} strokeWidth="1.4" strokeDasharray="2.5 1.5"/>
      )}
      {hasBack && !hasFront && (
        <rect x="16" y="24" width="16" height="18" rx="2.5" fill={ACCENT} opacity="0.92"/>
      )}
    </svg>
  );
}
