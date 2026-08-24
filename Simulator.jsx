import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar.jsx';
import "./Simulator.css";
import pull from "./sweat-evolutif.png";
import pullBack from "./sweatdos.png";
import maskPng from "./mask.png";
import { usePrices } from "./usePrices.js";
import { useConfig } from "./useConfig.js";
import PositionIcon from "./PositionIcon.jsx";

// Tableau de bord local (dashboardtest) : ne fonctionne que si le client ouvre le site
// depuis la même machine que le serveur du tableau de bord.
const DASHBOARD_ORDERS_URL = 'http://localhost:3000/api/orders';

const DELIVERY_DEFS = [
  { id: 'terrestre', label: 'Voie terrestre', icon: '🚛', delay: '~30 jours'      },
  { id: 'maritime',  label: 'Voie maritime',  icon: '🚢', delay: 'Délai variable' },
  { id: 'aerienne',  label: 'Voie aérienne',  icon: '✈️', delay: '~15 jours'     },
];

function calcUnitPrice(pricesConfig, technique, qty) {
  const config = pricesConfig[technique];
  if (!config) return 0;
  if (config[`equal${qty}`] !== undefined) return config[`equal${qty}`];
  const aboveMatch = Object.entries(config)
    .filter(([k]) => /^above\d+$/.test(k))
    .map(([k, v]) => ({ min: parseInt(k.replace('above', '')), price: v }))
    .sort((a, b) => b.min - a.min)
    .find(r => qty >= r.min);
  if (aboveMatch) return aboveMatch.price;
  const belowMatch = Object.entries(config)
    .filter(([k]) => /^below\d+$/.test(k))
    .map(([k, v]) => ({ max: parseInt(k.replace('below', '')), price: v }))
    .sort((a, b) => a.max - b.max)
    .find(r => qty < r.max);
  if (belowMatch) return belowMatch.price;
  return config.base;
}


const isColorDark = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
};

// Rendu SVG du pull avec filtre SVG — immunise le logo HTML de tout effet de compositing CSS
const parseCssFilter = (f = '') => {
  const n = (name, def) => { const m = f.match(new RegExp(`${name}\\(([^)]+)\\)`)); return m ? parseFloat(m[1]) : def; };
  return {
    grayscale:  n('grayscale', 0),
    brightness: n('brightness', 1),
    saturate:   n('saturate', 1),
    hueRotate:  (() => { const m = f.match(/hue-rotate\(([^)]+)deg\)/); return m ? parseFloat(m[1]) : 0; })(),
    contrast:   n('contrast', 1),
  };
};

const HoodieSVG = ({ src, colorFilter, width = 320, height = 240, filterId }) => {
  const { grayscale, brightness, saturate, hueRotate, contrast } = parseCssFilter(colorFilter);
  const satVal = (1 - grayscale) * saturate;
  const ci = (1 - contrast) / 2;
  return (
    <svg width={width} height={height} style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values={satVal} result="s1"/>
          <feComponentTransfer in="s1" result="s2">
            <feFuncR type="linear" slope={brightness}/>
            <feFuncG type="linear" slope={brightness}/>
            <feFuncB type="linear" slope={brightness}/>
          </feComponentTransfer>
          <feColorMatrix type="hueRotate" values={hueRotate} in="s2" result="s3"/>
          <feComponentTransfer in="s3">
            <feFuncR type="linear" slope={contrast} intercept={ci}/>
            <feFuncG type="linear" slope={contrast} intercept={ci}/>
            <feFuncB type="linear" slope={contrast} intercept={ci}/>
          </feComponentTransfer>
        </filter>
      </defs>
      <image href={src} x="0" y="0" width={width} height={height} filter={`url(#${filterId})`} preserveAspectRatio="xMidYMid meet"/>
    </svg>
  );
};

const HoodieViewer = ({ color, logoFront, logoBack, slots = [], technique }) => {
  const hasChest = slots.some(s => s !== 'back');
  const hasBack  = slots.includes('back');
  const onlyFront = hasChest && !hasBack;
  const onlyBack  = hasBack  && !hasChest;
  const [showBack, setShowBack] = useState(onlyBack);
  const [flipClass, setFlipClass] = useState('');

  const flipTo = (toBack) => {
    if (toBack === showBack || flipClass) return;
    const dir = toBack ? 'left' : 'right';
    setFlipClass(`flip-out-${dir}`);
    setTimeout(() => {
      setShowBack(toBack);
      setFlipClass(`flip-in-${dir}`);
      setTimeout(() => setFlipClass(''), 320);
    }, 260);
  };

  const showFaceBtn = !onlyBack;
  const showDosBtn  = !onlyFront;
  const frontVisible = onlyBack  ? false : !showBack;
  const backVisible  = onlyFront ? false : showBack || onlyBack;

  const broderie = technique === 'broderie';
  const logoStyle = broderie
    ? { filter: 'url(#emb-sim) contrast(1.04) brightness(0.93) saturate(0.82)' }
    : {};

  return (
    <div className="hoodie-viewer">

      {/* Filtre SVG broderie */}
      {broderie && (
        <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
          <defs>
            <filter id="emb-sim" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.65 0.45" numOctaves="3" seed="6" stitchTiles="stitch" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.7" xChannelSelector="R" yChannelSelector="G" result="textured"/>
              <feDropShadow dx="0.4" dy="0.5" stdDeviation="0.25" floodColor="#000" floodOpacity="0.15" in="textured"/>
            </filter>
          </defs>
        </svg>
      )}

      <div className={`hoodie-scene${flipClass ? ` ${flipClass}` : ''}`}>
        {/* ── Pulls colorisés via CSS filter sur l'img (logos séparés, pas de mix-blend) ── */}
        <div className={`hoodie-face${frontVisible ? ' hoodie-face--visible' : ''}`}>
          <div className="hoodie-img-container">
            <img src={pull} alt="Face avant" style={{ filter: color.filter }} />
            <div className="hoodie-color-overlay hoodie-color-overlay--multiply" style={{
              background: color.hex,
              maskImage: `url(${maskPng})`,
              WebkitMaskImage: `url(${maskPng})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }} />
          </div>
        </div>

        <div className={`hoodie-face${backVisible ? ' hoodie-face--visible' : ''}`}>
          <div className="hoodie-img-container">
            <img src={pullBack} alt="Face arrière" style={{ filter: color.filter }} />
            <div className="hoodie-color-overlay hoodie-color-overlay--multiply" style={{
              background: color.hex,
              maskImage: `url(${pullBack})`,
              WebkitMaskImage: `url(${pullBack})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }} />
          </div>
        </div>

        {/* ── Logos dans une branche DOM séparée, sans aucun filtre parent ── */}
        <div className="hoodie-logo-scene">
          <div className="hoodie-logo-ref">
            {logoFront && (
              <div className={`hoodie-logo-zone hoodie-logo-zone--chest${frontVisible ? ' hoodie-logo-zone--visible' : ''}`}>
                <img src={logoFront} alt="Logo cœur" style={logoStyle} />
              </div>
            )}
            {logoBack && (
              <div className={`hoodie-logo-zone hoodie-logo-zone--back${backVisible ? ' hoodie-logo-zone--visible' : ''}`}>
                <img src={logoBack} alt="Logo dos" style={logoStyle} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showFaceBtn && showDosBtn && (
        <div className="hoodie-view-toggle">
          <button
            className={`hoodie-view-btn${!showBack ? ' active' : ''}`}
            onClick={() => flipTo(false)}
          >Face</button>
          <button
            className={`hoodie-view-btn${showBack ? ' active' : ''}`}
            onClick={() => flipTo(true)}
          >Dos</button>
        </div>
      )}
    </div>
  );
};

const DynamicPaginationDots = ({ colors, scrollTrackRef }) => {
  const [currentDot, setCurrentDot] = useState(0);

  const updateCurrentDot = () => {
    if (!scrollTrackRef.current) return;
    const scrollLeft = scrollTrackRef.current.scrollLeft;
    const scrollWidth = scrollTrackRef.current.scrollWidth;
    const clientWidth = scrollTrackRef.current.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    let scrollProgress;
    if (scrollLeft >= maxScroll * 0.9) {
      scrollProgress = 1;
    } else {
      scrollProgress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    }
    const dotIndex = Math.floor(scrollProgress * 6);
    setCurrentDot(Math.min(5, dotIndex));
  };

  React.useEffect(() => {
    const track = scrollTrackRef.current;
    if (track) {
      track.addEventListener('scroll', updateCurrentDot, { passive: true });
      return () => track.removeEventListener('scroll', updateCurrentDot);
    }
  }, [scrollTrackRef]);

  return (
    <div className="pagination-dots">
      {[...Array(6)].map((_, index) => (
        <div key={index} className={`dot ${index === currentDot ? 'active' : ''}`} />
      ))}
    </div>
  );
};

const ColorSwipeContainer = ({ children, scrollTrackRef }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Molette de souris : redirige le scroll vertical en scroll horizontal du carrousel.
  // La cible suit l'entrée instantanément (pas de retard), mais la position affichée est
  // lissée par un seul loop rAF — contrairement au CSS scroll-behavior:smooth, ce loop ne
  // relance pas une animation concurrente à chaque tick de molette, donc pas d'accumulation.
  const wheelTargetRef = useRef(null);
  const wheelRafRef = useRef(null);

  React.useEffect(() => {
    const track = scrollTrackRef.current;
    if (!track) return;

    const ease = () => {
      const target = wheelTargetRef.current;
      const diff = target - track.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        track.scrollLeft = target;
        wheelRafRef.current = null;
        return;
      }
      track.scrollLeft += diff * 0.2;
      wheelRafRef.current = requestAnimationFrame(ease);
    };

    const onWheel = (e) => {
      if (track.scrollWidth <= track.clientWidth) return;
      e.preventDefault();
      const maxScroll = track.scrollWidth - track.clientWidth;
      const base = wheelTargetRef.current ?? track.scrollLeft;
      wheelTargetRef.current = Math.max(0, Math.min(maxScroll, base + e.deltaY));
      if (wheelRafRef.current === null) wheelRafRef.current = requestAnimationFrame(ease);
    };

    track.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      track.removeEventListener('wheel', onWheel);
      if (wheelRafRef.current !== null) cancelAnimationFrame(wheelRafRef.current);
    };
  }, [scrollTrackRef]);

  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove  = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 50 && scrollTrackRef.current) {
      const scrollLeft = scrollTrackRef.current.scrollLeft;
      const clientWidth = scrollTrackRef.current.clientWidth;
      if (distance > 50) {
        scrollTrackRef.current.scrollTo({ left: scrollLeft + clientWidth * 0.8, behavior: 'smooth' });
      } else {
        scrollTrackRef.current.scrollTo({ left: Math.max(0, scrollLeft - clientWidth * 0.8), behavior: 'smooth' });
      }
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }} className="color-swipe-wrapper">
      {children}
    </div>
  );
};

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M5 12L10 17L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Couleur du check adaptatif selon la luminosité du fond
const getCheckColor = (hex) => isColorDark(hex) ? 'white' : '#1a1a1a';

// Quantité éditable au clic, en plus des boutons +/-
const SizeQtyInput = ({ value, onCommit }) => {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  React.useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    const n = parseInt(text, 10);
    onCommit(Number.isNaN(n) ? 0 : Math.max(0, n));
  };

  return (
    <input
      type="number"
      className="qty-val qty-val--input"
      value={text}
      min="0"
      onFocus={() => setFocused(true)}
      onChange={e => setText(e.target.value)}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
    />
  );
};

// Bouton +/- avec appui long : un tap = un pas, un maintien répète en accélérant
const HoldButton = ({ className, onTick, children }) => {
  const startTimerRef = useRef(null);
  const repeatTimerRef = useRef(null);
  const startedAtRef = useRef(0);
  const heldRef = useRef(false);

  const stop = () => {
    clearTimeout(startTimerRef.current);
    clearTimeout(repeatTimerRef.current);
    startTimerRef.current = null;
    repeatTimerRef.current = null;
  };

  // Montée en puissance sur ~1s : démarre doucement (peu de changement au début),
  // puis s'accélère de plus en plus vite — courbe quadratique, pas un saut brutal.
  const scheduleNext = () => {
    const heldMs = Date.now() - startedAtRef.current;
    const progress = Math.min(1, heldMs / 1000);
    const eased = progress * progress;
    const delay = 200 - (200 - 35) * eased;
    repeatTimerRef.current = setTimeout(() => { onTick(); scheduleNext(); }, delay);
  };

  const start = () => {
    stop();
    heldRef.current = false;
    startedAtRef.current = Date.now();
    startTimerRef.current = setTimeout(() => { heldRef.current = true; scheduleNext(); }, 300);
  };

  React.useEffect(() => stop, []);

  return (
    <button
      type="button"
      className={className}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onClick={() => { if (!heldRef.current) onTick(); heldRef.current = false; }}
    >
      {children}
    </button>
  );
};

function Simulator() {
  const { prices: pricesConfig } = usePrices();
  const { config: appConfigLive } = useConfig();
  const POSITIONS = appConfigLive.positions;
  const colors = appConfigLive.colors;
  const SIZES = appConfigLive.sizes;
  const DELIVERY_OPTIONS = DELIVERY_DEFS.map(d => ({ ...d, price: pricesConfig.delivery[d.id] ?? 0 }));
  const [step, setStep] = useState(1);
  const [selectedColors, setSelectedColors] = useState([colors[0]]);
  const [isSwipingOut, setIsSwipingOut] = useState(false);
  const [isSwipingBack, setIsSwipingBack] = useState(false);

  // Design global
  const [logoPosition, setLogoPosition] = useState(null);   // 'coeur'|'dos'|'coeur-dos'|'sans-logo'
  const [technique, setTechnique] = useState(null);          // 'flocage'|'broderie'
  const [templateFront, setTemplateFront] = useState(null);  // URL logo cœur (template)
  const [templateBack, setTemplateBack] = useState(null);    // URL logo dos (template)

  // Ajustements par coloris
  // 'template' = hérite du design global (défaut)
  // 'custom'   = logo spécifique à ce coloris
  // 'sans-logo'= aucun marquage pour ce coloris
  const [perColorMode, setPerColorMode] = useState({});   // { colorId: 'template'|'custom'|'sans-logo' }
  const [customFronts, setCustomFronts] = useState({});   // { colorId: URL }
  const [customBacks, setCustomBacks] = useState({});     // { colorId: URL }

  const [uploadingSlot, setUploadingSlot] = useState(null); // { type: string, colorId?: string }
  const [sizes, setSizes] = useState({});
  const [activeColorId, setActiveColorId] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [clientPrenom, setClientPrenom] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientVille, setClientVille] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [orderSent, setOrderSent] = useState(false);

  const totalSteps = 5;
  const MIN_UNITS = pricesConfig.minimum_units ?? 25;
  const [showMinWarning, setShowMinWarning] = useState(false);
  const [showLogoWarning, setShowLogoWarning] = useState(false);

  const navigate = useNavigate();
  const scrollTrackRef = useRef(null);
  const fileInputRef = useRef(null);

  const isBusy = isSwipingOut || isSwipingBack;
  const activeColor = selectedColors.find(c => c.id === activeColorId) ?? selectedColors[0];
  const activePosition = POSITIONS.find(p => p.id === logoPosition);
  const _slots      = activePosition?.slots ?? [];
  const hasFrontPos = _slots.some(s => s !== 'back');
  const hasBackPos  = _slots.includes('back');
  const activeColorMode = perColorMode[activeColor.id] ?? 'template';

  // Résout le logo effectif pour un coloris (template ou override)
  const getEffectiveFront = (colorId) => {
    const mode = perColorMode[colorId] ?? 'template';
    if (mode === 'sans-logo') return null;
    if (mode === 'custom')    return customFronts[colorId] ?? null;
    return templateFront;
  };
  const getEffectiveBack = (colorId) => {
    const mode = perColorMode[colorId] ?? 'template';
    if (mode === 'sans-logo') return null;
    if (mode === 'custom')    return customBacks[colorId] ?? null;
    return templateBack;
  };

  // Coloris pour lesquels un logo requis (cœur et/ou dos) n'a pas été importé
  const getMissingLogoColors = () => {
    if (!hasFrontPos && !hasBackPos) return [];
    return selectedColors
      .map(c => {
        if ((perColorMode[c.id] ?? 'template') === 'sans-logo') return null;
        const missingFront = hasFrontPos && !getEffectiveFront(c.id);
        const missingBack  = hasBackPos  && !getEffectiveBack(c.id);
        if (!missingFront && !missingBack) return null;
        const sides = [missingFront && 'cœur', missingBack && 'dos'].filter(Boolean).join(' et ');
        return { id: c.id, label: c.label, sides };
      })
      .filter(Boolean);
  };

  const handleNextStep = () => {
    if (step === 3 && getMissingLogoColors().length > 0) {
      setShowLogoWarning(true);
      return;
    }
    if (step === 4 && totalUnits < MIN_UNITS) {
      setShowMinWarning(true);
      return;
    }
    if (!isBusy && step < totalSteps) {
      setIsSwipingOut(true);
      setTimeout(() => {
        setStep(prev => prev + 1);
        setIsSwipingOut(false);
      }, 1300);
    }
  };

  const handlePrevStep = () => {
    if (!isBusy && step > 1) {
      setIsSwipingBack(true);
      setTimeout(() => {
        setStep(prev => prev - 1);
        setIsSwipingBack(false);
      }, 1300);
    }
  };

  const toggleColor = (color) => {
    setSelectedColors(prev =>
      prev.some(c => c.id === color.id)
        ? prev.length > 1 ? prev.filter(c => c.id !== color.id) : prev
        : [...prev, color]
    );
  };

  const updateSize = (size, delta) => {
    setSizes(prev => ({
      ...prev,
      [activeColor.id]: {
        ...(prev[activeColor.id] || {}),
        [size]: Math.max(0, (prev[activeColor.id]?.[size] ?? 0) + delta)
      }
    }));
  };

  const setSizeValue = (size, value) => {
    setSizes(prev => ({
      ...prev,
      [activeColor.id]: { ...(prev[activeColor.id] || {}), [size]: Math.max(0, value) }
    }));
  };

  const triggerUpload = (slot) => {
    setUploadingSlot(slot);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingSlot) return;
    const url = URL.createObjectURL(file);
    const { type, colorId } = uploadingSlot;
    if (type === 'template-front')       setTemplateFront(url);
    else if (type === 'template-back')   setTemplateBack(url);
    else if (type === 'custom-front')    setCustomFronts(prev => ({ ...prev, [colorId]: url }));
    else if (type === 'custom-back')     setCustomBacks(prev => ({ ...prev, [colorId]: url }));
    e.target.value = '';
  };

  const totalUnits = Object.values(sizes).reduce(
    (total, colorSizes) => total + Object.values(colorSizes).reduce((a, b) => a + b, 0),
    0
  );

  const unitPrice = calcUnitPrice(pricesConfig, technique, totalUnits);
  const deliveryOption = DELIVERY_OPTIONS.find(d => d.id === delivery);
  const deliveryCost = totalUnits * (deliveryOption?.price ?? 0);
  const grandTotal = totalUnits * unitPrice + deliveryCost;

  const buildOrderSummary = () => {
    const parts = selectedColors.map(c => {
      const colorSizes = sizes[c.id] || {};
      const sizeStr = SIZES.filter(s => (colorSizes[s] ?? 0) > 0).map(s => `${colorSizes[s]}x${s}`).join(', ');
      return sizeStr ? `${c.label} (${sizeStr})` : null;
    }).filter(Boolean).join(' — ');
    const techLabel = appConfigLive.techniques.find(t => t.id === technique)?.label ?? '';
    return `${parts} · ${techLabel} · ${activePosition?.label ?? ''} · Livraison ${deliveryOption?.label ?? ''}`;
  };

  const hasContactMethod = clientPhone.trim() || clientEmail.trim();
  const isPhoneValid = (v) => /^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v.trim());
  const isEmailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const phoneOk = !clientPhone.trim() || isPhoneValid(clientPhone);
  const emailOk = !clientEmail.trim() || isEmailValid(clientEmail);

  const handleSubmitOrder = async () => {
    if (!clientNom.trim() || !clientPrenom.trim() || !hasContactMethod || !phoneOk || !emailOk || !delivery || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(DASHBOARD_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: clientNom.trim(),
          prenom: clientPrenom.trim(),
          telephone: clientPhone.trim(),
          email: clientEmail.trim(),
          ville: clientVille.trim(),
          instagram: clientInstagram.trim(),
          produit: buildOrderSummary(),
          montant: `${grandTotal}€`,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setOrderSent(true);
    } catch {
      setSubmitError("Impossible d'envoyer la commande pour le moment. Réessaie, ou contacte-nous directement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnySlot   = hasFrontPos || hasBackPos;
  const step2Blocked = !logoPosition || (hasAnySlot && !technique);
  const step3Blocked = false;

  // Supprime le logo spécifique d'un coloris (revient au design principal)
  const clearCustomFront = (colorId) => setCustomFronts(prev => { const n = { ...prev }; delete n[colorId]; return n; });
  const clearCustomBack  = (colorId) => setCustomBacks(prev =>  { const n = { ...prev }; delete n[colorId]; return n; });

  // Zone d'upload unifiée : selon le mode, édite le template ou le logo spécifique du coloris
  const getUploadSlot = (side) => {
    if (activeColorMode === 'custom') return { type: `custom-${side}`, colorId: activeColor.id };
    return { type: `template-${side}` };
  };
  const getDisplayLogo = (side) => {
    const template = side === 'front' ? templateFront : templateBack;
    const custom   = side === 'front' ? customFronts[activeColor.id] : customBacks[activeColor.id];
    if (activeColorMode === 'custom') return custom ?? null; // zone vide si pas encore de logo spécifique
    return template;
  };
  const hasCustomOverride = (side) =>
    activeColorMode === 'custom' &&
    (side === 'front' ? customFronts[activeColor.id] : customBacks[activeColor.id]);

  return (
    <div className="app">
      <ProgressBar step={step} setStep={setStep} totalSteps={totalSteps} />

      <div className="content-wrapper">
        <div className="content">
          <div key={step} className={`step-card ${isSwipingOut ? 'swipe-out' : ''} ${isSwipingBack ? 'swipe-out-back' : ''}`}>

            {/* ── ÉTAPE 1 : Couleurs ── */}
            {step === 1 && (
              <>
                <div className="tinder-pull-container">
                  <div className="pull-wrapper">
                    <div className="pull">
                      <img src={pull} alt="Pull" crossOrigin="anonymous" style={{ filter: activeColor.filter }} />
                    </div>
                    <div aria-hidden className="color-overlay" style={{ background: activeColor.hex }} />
                    <div aria-hidden className="reflect-overlay" />
                  </div>
                </div>

                <h2>Choisissez vos couleurs</h2>
                <p>Sélectionnez la couleur de vos sweats à capuche.</p>

                <ColorSwipeContainer scrollTrackRef={scrollTrackRef}>
                  <div className="color-scroll-container">
                    <div className="color-scroll-track" ref={scrollTrackRef}>
                      {colors.map((color) => (
                        <div key={color.id} className="color-option">
                          <button
                            type="button"
                            className={`color-button ${selectedColors.some(c => c.id === color.id) ? 'active' : ''}`}
                            style={{ backgroundColor: color.hex }}
                            onClick={() => { toggleColor(color); setActiveColorId(color.id); }}
                          >
                            {selectedColors.some(c => c.id === color.id) && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12L10 17L20 7" stroke={getCheckColor(color.hex)} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"/>
                              </svg>
                            )}
                          </button>
                          <span className="color-label">{color.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ColorSwipeContainer>

                <DynamicPaginationDots colors={colors} scrollTrackRef={scrollTrackRef} />
              </>
            )}

            {/* ── ÉTAPE 2 : Position + Technique ── */}
            {step === 2 && (
              <>
                <h2>Position du logo</h2>
                <p>Où souhaitez-vous faire apparaître votre logo ?</p>

                <div className="position-list">
                  {POSITIONS.map(pos => (
                    <div
                      key={pos.id}
                      className={`position-card ${logoPosition === pos.id ? 'active' : ''}`}
                      onClick={() => setLogoPosition(pos.id)}
                    >
                      <div className="position-icon"><PositionIcon slots={pos.slots ?? []} /></div>
                      <div className="position-info">
                        <strong>{pos.label}</strong>
                        <small>{pos.desc}</small>
                      </div>
                      <div className={`position-check ${logoPosition === pos.id ? 'checked' : ''}`}>
                        {logoPosition === pos.id && <CheckIcon />}
                      </div>
                    </div>
                  ))}
                </div>

                {logoPosition && hasAnySlot && (
                  <>
                    <h2 style={{ marginTop: '1.2rem' }}>Technique de marquage</h2>
                    <p>Comment souhaitez-vous que votre logo soit appliqué ?</p>
                    <div className="position-list">
                      {appConfigLive.techniques.map(tech => (
                        <div key={tech.id}
                          className={`position-card ${technique === tech.id ? 'active' : ''}`}
                          onClick={() => setTechnique(tech.id)}>
                          <div className="position-info">
                            <strong>{tech.label}</strong>
                            <small>{tech.desc}</small>
                          </div>
                          <div className={`position-check ${technique === tech.id ? 'checked' : ''}`}>
                            {technique === tech.id && <CheckIcon />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── ÉTAPE 3 : Technique + Design ── */}
            {step === 3 && (
              <>
                {logoPosition && !hasAnySlot ? (
                  <>
                    <h2>Sans logo</h2>
                    <p>Vous avez choisi de ne pas ajouter de marquage sur vos pulls.</p>
                  </>
                ) : (
                  <>
                    <h2>Votre design</h2>
                    <p>Importez vos logos et ajustez par coloris si besoin.</p>

                    {/* Sélecteur coloris + mode (seulement si plusieurs couleurs) */}
                    {selectedColors.length > 1 && (
                      <>
                        <div className="per-color-separator" />
                        <p className="logo-section-label">Coloris</p>
                        <p className="per-color-hint">
                          Par défaut, le même design s'applique à tous les coloris.
                        </p>

                        <div className="color-badge-row">
                          {selectedColors.map(c => (
                            <div key={c.id}
                              className={`color-badge-dot${activeColor.id === c.id ? ' active-color' : ''}`}
                              style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #ddd' : 'none' }}
                              onClick={() => setActiveColorId(c.id)}
                            />
                          ))}
                          <span className="color-badge-label">{activeColor.label}</span>
                        </div>

                        <div className="position-list">
                          {[
                            { id: 'template',  label: 'Design principal', desc: 'Même logo pour tous les coloris' },
                            { id: 'custom',    label: 'Logo spécifique',  desc: 'Logo différent pour ce coloris' },
                            { id: 'sans-logo', label: 'Sans logo',        desc: 'Aucun marquage pour ce coloris' },
                          ].map(mode => (
                            <div key={mode.id}
                              className={`position-card ${activeColorMode === mode.id ? 'active' : ''}`}
                              onClick={() => setPerColorMode(prev => ({ ...prev, [activeColor.id]: mode.id }))}>
                              <div className="position-info">
                                <strong>{mode.label}</strong>
                                <small>{mode.desc}</small>
                              </div>
                              <div className={`position-check ${activeColorMode === mode.id ? 'checked' : ''}`}>
                                {activeColorMode === mode.id && <CheckIcon />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* ── Zone d'upload unifiée ──
                        - Mode "template" : édite le logo partagé (template)
                        - Mode "custom"   : édite le logo de ce coloris,
                          affiche le template en fallback si pas encore de logo spécifique */}
                    {activeColorMode !== 'sans-logo' && (
                      <>
                        {hasFrontPos && (() => {
                          const logo   = getDisplayLogo('front');
                          const custom = hasCustomOverride('front');
                          return (
                            <>
                              <p className="logo-section-label">
                                Logo cœur{' '}
                                {custom
                                  ? <span className="specific-tag">{activeColor.label}</span>
                                  : <span className="optional-tag">facultatif</span>}
                              </p>
                              {logo ? (
                                <div className="logo-preview-wrapper">
                                  <img src={logo} alt="Logo cœur" className="logo-preview-img" />
                                  <button className="logo-change-btn" type="button"
                                    onClick={() => triggerUpload(getUploadSlot('front'))}>
                                    Changer de logo
                                  </button>
                                  {custom && (
                                    <button className="logo-reset-btn" type="button"
                                      onClick={() => clearCustomFront(activeColor.id)}>
                                      ↩ Revenir au design principal
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="upload-area" onClick={() => triggerUpload(getUploadSlot('front'))}>
                                    <div className="upload-icon">📁</div>
                                    <strong>Appuyez pour importer votre logo</strong>
                                    <p>PNG, JPG ou SVG — si vous l'avez déjà</p>
                                  </div>
                                  <p className="no-design-note">Pas encore de design ? Vous pourrez l'envoyer ultérieurement.</p>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {hasBackPos && (() => {
                          const logo   = getDisplayLogo('back');
                          const custom = hasCustomOverride('back');
                          return (
                            <>
                              <p className="logo-section-label">
                                Logo dos{' '}
                                {custom
                                  ? <span className="specific-tag">{activeColor.label}</span>
                                  : <span className="optional-tag">facultatif</span>}
                              </p>
                              {logo ? (
                                <div className="logo-preview-wrapper">
                                  <img src={logo} alt="Logo dos" className="logo-preview-img" />
                                  <button className="logo-change-btn" type="button"
                                    onClick={() => triggerUpload(getUploadSlot('back'))}>
                                    Changer de logo
                                  </button>
                                  {custom && (
                                    <button className="logo-reset-btn" type="button"
                                      onClick={() => clearCustomBack(activeColor.id)}>
                                      ↩ Revenir au design principal
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="upload-area" onClick={() => triggerUpload(getUploadSlot('back'))}>
                                    <div className="upload-icon">📁</div>
                                    <strong>Appuyez pour importer le logo dos</strong>
                                    <p>PNG, JPG ou SVG — si vous l'avez déjà</p>
                                  </div>
                                  {!hasFrontPos && (
                                    <p className="no-design-note">Pas encore de design ? Vous pourrez l'envoyer ultérieurement.</p>
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}

                    {/* Aperçu simulateur */}
                    <HoodieViewer
                      key={logoPosition}
                      color={activeColor}
                      logoFront={getEffectiveFront(activeColor.id)}
                      logoBack={getEffectiveBack(activeColor.id)}
                      slots={activePosition?.slots ?? []}
                      technique={technique}
                    />
                  </>
                )}

                <input ref={fileInputRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleLogoFileChange} />
              </>
            )}

            {/* ── ÉTAPE 4 : Répartition des tailles ── */}
            {step === 4 && (
              <>
                <h2>Répartition des tailles</h2>
                <p>Indiquez le nombre de pulls par taille.</p>

                <div className="color-badge-row">
                  {selectedColors.map(c => (
                    <div
                      key={c.id}
                      className={`color-badge-dot${activeColor.id === c.id ? ' active-color' : ''}`}
                      style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #ddd' : 'none' }}
                      onClick={() => setActiveColorId(c.id)}
                    />
                  ))}
                  <span className="color-badge-label">{activeColor.label}</span>
                </div>

                <div className="size-list">
                  {SIZES.map(size => (
                    <div key={size} className="size-row">
                      <span className="size-tag">{size}</span>
                      <div className="qty-ctrl">
                        <HoldButton className="qty-btn qty-btn--minus" onTick={() => updateSize(size, -1)}>−</HoldButton>
                        <SizeQtyInput value={sizes[activeColor.id]?.[size] ?? 0} onCommit={(n) => setSizeValue(size, n)} />
                        <HoldButton className="qty-btn qty-btn--plus" onTick={() => updateSize(size, 1)}>+</HoldButton>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="size-total-row">
                  <span>Total</span>
                  <strong>{totalUnits} pull{totalUnits !== 1 ? 's' : ''}</strong>
                </div>
              </>
            )}

            {/* ── ÉTAPE 5 : Livraison + Total ── */}
            {step === 5 && (
              <>
                <h2>Votre pull</h2>
                <p>Glissez pour visualiser l'avant et l'arrière.</p>

                <h2>Livraison</h2>
                <p>Choisissez votre mode de livraison.</p>

                <div className="recap-colors">
                  {selectedColors.map(c => {
                    const colorSizes = sizes[c.id] || {};
                    const colorTotal = Object.values(colorSizes).reduce((a, b) => a + b, 0);
                    if (colorTotal === 0) return null;
                    return (
                      <div key={c.id} className="recap-color-block">
                        <div className="recap-color-header">
                          <div className="recap-color-dot" style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #ddd' : 'none' }} />
                          <span className="recap-color-name">{c.label}</span>
                          <span className="recap-color-total">{colorTotal} pull{colorTotal !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="recap-sizes">
                          {SIZES.filter(s => (colorSizes[s] ?? 0) > 0).map(s => (
                            <div key={s} className="recap-size-chip">
                              <span className="recap-size-label">{s}</span>
                              <span className="recap-size-qty">×{colorSizes[s]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sim-delivery-list">
                  {DELIVERY_OPTIONS.map(opt => (
                    <div
                      key={opt.id}
                      className={`sim-delivery-card ${delivery === opt.id ? 'active' : ''}`}
                      onClick={() => setDelivery(opt.id)}
                    >
                      <div className="sim-delivery-icon">{opt.icon}</div>
                      <div className="sim-delivery-info">
                        <strong>{opt.label}</strong>
                        <small>{opt.delay}</small>
                      </div>
                      <div className="sim-delivery-price">{opt.price === 0 ? 'Inclus' : `+${opt.price}€/pull`}</div>
                      <div className={`sim-delivery-check ${delivery === opt.id ? 'checked' : ''}`}>
                        {delivery === opt.id && <CheckIcon />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="total-summary">
                  <div className="total-line">
                    <span>{totalUnits} pull{totalUnits !== 1 ? 's' : ''} × {unitPrice}€</span>
                    <span>{totalUnits * unitPrice}€</span>
                  </div>
                  <div className="total-line">
                    <span>Livraison {delivery && deliveryOption?.price > 0 ? `(${totalUnits} × ${deliveryOption.price}€)` : ''}</span>
                    <span>{delivery ? (deliveryCost === 0 ? 'Inclus' : `${deliveryCost}€`) : '—'}</span>
                  </div>
                  <div className="total-line total-line--grand">
                    <strong>Total</strong>
                    <strong className="total-amount">{delivery ? `${grandTotal}€` : '—'}</strong>
                  </div>
                </div>

                <h2 style={{ marginTop: '1.2rem' }}>Vos coordonnées</h2>
                <p>Pour qu'on puisse te recontacter au sujet de ta commande.</p>
                <input
                  type="text"
                  className="client-info-input"
                  placeholder="Prénom"
                  value={clientPrenom}
                  onChange={e => setClientPrenom(e.target.value)}
                />
                <input
                  type="text"
                  className="client-info-input"
                  placeholder="Nom"
                  value={clientNom}
                  onChange={e => setClientNom(e.target.value)}
                />
                <input
                  type="tel"
                  className={`client-info-input${!phoneOk ? ' client-info-input--invalid' : ''}`}
                  placeholder="Téléphone"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                />
                {!phoneOk && <p className="input-error-text">Numéro de téléphone invalide (ex: 06 12 34 56 78).</p>}
                <input
                  type="email"
                  className={`client-info-input${!emailOk ? ' client-info-input--invalid' : ''}`}
                  placeholder="Email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                />
                {!emailOk && <p className="input-error-text">Adresse email invalide.</p>}
                <input
                  type="text"
                  className="client-info-input"
                  placeholder="Ville"
                  value={clientVille}
                  onChange={e => setClientVille(e.target.value)}
                />
                <input
                  type="text"
                  className="client-info-input"
                  placeholder="Compte Instagram (optionnel)"
                  value={clientInstagram}
                  onChange={e => setClientInstagram(e.target.value)}
                />
                <p className="per-color-hint" style={{ marginTop: '-2px' }}>Téléphone ou email requis (au moins un des deux).</p>
                {submitError && <p className="submit-error-text">{submitError}</p>}
              </>
            )}

          </div>{/* fin step-card */}

          <button
            className="next-button"
            onClick={step === totalSteps ? handleSubmitOrder : handleNextStep}
            disabled={
              isBusy ||
              (step === 2 && step2Blocked) ||
              (step === 3 && step3Blocked) ||
              (step === totalSteps && (!delivery || !clientNom.trim() || !clientPrenom.trim() || !hasContactMethod || !phoneOk || !emailOk || isSubmitting))
            }
          >
            {step === totalSteps ? (isSubmitting ? 'Envoi en cours…' : 'Envoyer ma commande →') : 'Étape suivante'}
          </button>

          {step > 1 && (
            <button className="prev-button" onClick={handlePrevStep} disabled={isBusy}>
              ← Étape précédente
            </button>
          )}

        </div>
      </div>

      {showMinWarning && (
        <div className="min-warning-overlay" onClick={() => setShowMinWarning(false)}>
          <div className="min-warning-popup" onClick={e => e.stopPropagation()}>
            <div className="min-warning-icon">🛒</div>
            <h3 className="min-warning-title">Quantité minimale non atteinte</h3>
            <p className="min-warning-body">
              Nous produisons en petite série à partir de <strong>{MIN_UNITS} pulls minimum</strong>.
              Il vous manque encore <strong>{MIN_UNITS - totalUnits} pull{MIN_UNITS - totalUnits > 1 ? 's' : ''}</strong> pour valider votre commande.
            </p>
            <button className="min-warning-btn" onClick={() => setShowMinWarning(false)}>
              Compris, je complète ma commande
            </button>
          </div>
        </div>
      )}

      {showLogoWarning && (() => {
        const missing = getMissingLogoColors();
        return (
          <div className="min-warning-overlay" onClick={() => setShowLogoWarning(false)}>
            <div className="min-warning-popup" onClick={e => e.stopPropagation()}>
              <div className="min-warning-icon">🎨</div>
              <h3 className="min-warning-title">Logo manquant</h3>
              <p className="min-warning-body">
                Il manque un logo pour {missing.map((m, i) => (
                  <React.Fragment key={m.id}>
                    {i > 0 && ', '}
                    <strong>{m.label}</strong> (<strong>{m.sides}</strong>)
                  </React.Fragment>
                ))}.
                Importez votre logo, ou choisissez « Sans logo » pour {missing.length > 1 ? 'ces coloris' : 'ce coloris'} avant de continuer.
              </p>
              <button className="min-warning-btn" onClick={() => setShowLogoWarning(false)}>
                Compris, j'ajoute mon logo
              </button>
            </div>
          </div>
        );
      })()}

      {orderSent && (
        <div className="min-warning-overlay">
          <div className="min-warning-popup">
            <div className="min-warning-icon">✅</div>
            <h3 className="min-warning-title">Commande envoyée !</h3>
            <p className="min-warning-body">
              Merci, ta commande a bien été transmise. On te recontacte rapidement.
            </p>
            <button className="min-warning-btn" onClick={() => navigate('/')}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Simulator;
