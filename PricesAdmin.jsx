import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePrices } from './usePrices.js';
import { useConfig } from './useConfig.js';
import PositionIcon from './PositionIcon.jsx';
import { ALL_SLOTS } from './positionSlots.js';
import './PricesAdmin.css';

function useDebounceWrite(value, url, delay = 1200) {
  const timerRef = useRef(null);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value, null, 2),
      }).catch(() => {});
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [value]);
}

function hexToFilter(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  const brightness = (0.4 + 0.6 * l).toFixed(2);
  const contrast = (1 + (1 - l) * 0.4).toFixed(2);
  return `grayscale(1) brightness(${brightness}) saturate(1) hue-rotate(0deg) contrast(${contrast})`;
}

function slugify(label) {
  return label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function makeColorId(existing, label) {
  const base = slugify(label) || 'couleur';
  let id = base, n = 2;
  while (existing.some(c => c.id === id)) id = `${base}-${n++}`;
  return id;
}

function ColorsSection({ colors, onChange }) {
  const setLabel = (idx, label) =>
    onChange(colors.map((c, i) => i === idx ? { ...c, label } : c));

  const setHex = (idx, hex) =>
    onChange(colors.map((c, i) => i === idx ? { ...c, hex, filter: hexToFilter(hex) } : c));

  const addColor = () => {
    const label = 'Nouvelle couleur';
    const hex = '#9CA3AF';
    onChange([...colors, { id: makeColorId(colors, label), label, hex, filter: hexToFilter(hex) }]);
  };

  const removeColor = (idx) => onChange(colors.filter((_, i) => i !== idx));

  return (
    <div className="pa-section">
      <h3 className="pa-section-title">Couleurs</h3>
      <div className="pa-colors-list">
        {colors.map((c, idx) => (
          <div key={c.id} className="pa-color-row">
            <label className="pa-color-swatch" style={{ backgroundColor: c.hex }}>
              <input type="color" value={c.hex} onChange={e => setHex(idx, e.target.value)} />
            </label>
            <input className="pa-input pa-input--full" placeholder="Nom"
              value={c.label} onChange={e => setLabel(idx, e.target.value)} />
            <button className="pa-btn-remove" onClick={() => removeColor(idx)} title="Supprimer">✕</button>
          </div>
        ))}
      </div>
      <button className="pa-btn-add" onClick={addColor}>+ Ajouter une couleur</button>
    </div>
  );
}

const RULE_TYPES = ['above', 'below', 'equal'];

function parseRules(config) {
  return Object.entries(config)
    .filter(([k]) => /^(above|below|equal)\d+$/.test(k))
    .map(([k, price]) => {
      const type = k.match(/^(above|below|equal)/)[1];
      const n    = parseInt(k.replace(type, ''));
      return { type, n, price };
    })
    .sort((a, b) => a.n - b.n);
}

function rulesToObj(rules) {
  const obj = {};
  rules.forEach(r => { obj[`${r.type}${r.n}`] = Number(r.price); });
  return obj;
}

function TechniqueSection({ label, data, onChange }) {
  const rules = parseRules(data);

  const setBase = (v) => onChange({ ...data, base: Number(v) });

  const setRule = (idx, updated) => {
    const next = [...rules];
    next[idx] = updated;
    onChange({ base: data.base, ...rulesToObj(next) });
  };

  const addRule = () => {
    const next = [...rules, { type: 'above', n: 0, price: data.base }];
    onChange({ base: data.base, ...rulesToObj(next) });
  };

  const removeRule = (idx) => {
    const next = rules.filter((_, i) => i !== idx);
    onChange({ base: data.base, ...rulesToObj(next) });
  };

  return (
    <div className="pa-section">
      <h3 className="pa-section-title">{label}</h3>

      <div className="pa-row">
        <span className="pa-label">Prix de base</span>
        <div className="pa-input-group">
          <input type="number" className="pa-input pa-input--sm" value={data.base}
            onChange={e => setBase(e.target.value)} min="0" step="0.5" />
          <span className="pa-unit">€ / pull</span>
        </div>
      </div>

      <div className="pa-rules-header">
        <span className="pa-col-type">Type</span>
        <span className="pa-col-n">Quantité</span>
        <span className="pa-col-price">Prix (€)</span>
      </div>

      {rules.map((r, idx) => (
        <div key={idx} className="pa-rule-row">
          <select className="pa-select" value={r.type}
            onChange={e => setRule(idx, { ...r, type: e.target.value })}>
            {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" className="pa-input pa-input--sm" value={r.n}
            onChange={e => setRule(idx, { ...r, n: parseInt(e.target.value) || 0 })} min="0" />
          <input type="number" className="pa-input pa-input--sm" value={r.price}
            onChange={e => setRule(idx, { ...r, price: parseFloat(e.target.value) || 0 })} min="0" step="0.5" />
          <button className="pa-btn-remove" onClick={() => removeRule(idx)} title="Supprimer">✕</button>
        </div>
      ))}

      <button className="pa-btn-add" onClick={addRule}>+ Ajouter une règle</button>
    </div>
  );
}

function PositionsSection({ positions, onChange }) {
  const setField = (idx, field, val) => {
    const next = positions.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    onChange(next);
  };

  const toggleSlot = (idx, slot) => {
    const slots = positions[idx].slots ?? [];
    const next = slots.includes(slot) ? slots.filter(s => s !== slot) : [...slots, slot];
    setField(idx, 'slots', next);
  };

  const addPosition = () => {
    onChange([...positions, { id: `pos-${Date.now()}`, label: 'Nouvelle position', desc: '', slots: [] }]);
  };

  const removePosition = (idx) => onChange(positions.filter((_, i) => i !== idx));

  return (
    <div className="pa-section">
      <h3 className="pa-section-title">Emplacements de logo</h3>

      {positions.map((pos, idx) => (
        <div key={pos.id} className="pa-pos-row">
          <div className="pa-pos-icon">
            <PositionIcon slots={pos.slots ?? []} />
          </div>
          <div className="pa-pos-fields">
            <input className="pa-input pa-input--full" placeholder="Label"
              value={pos.label} onChange={e => setField(idx, 'label', e.target.value)} />
            <input className="pa-input pa-input--full" placeholder="Description"
              value={pos.desc} onChange={e => setField(idx, 'desc', e.target.value)} />
            <div className="pa-slot-checks">
              {ALL_SLOTS.map(({ id, label }) => (
                <label key={id} className="pa-slot-label">
                  <input type="checkbox" checked={(pos.slots ?? []).includes(id)}
                    onChange={() => toggleSlot(idx, id)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <button className="pa-btn-remove" onClick={() => removePosition(idx)} title="Supprimer">✕</button>
        </div>
      ))}

      <button className="pa-btn-add" onClick={addPosition}>+ Ajouter un emplacement</button>
    </div>
  );
}

export default function PricesAdmin() {
  const { prices, setLivePrices } = usePrices();
  const { config, setLiveConfig } = useConfig();

  // Auto-save debounced : écrit dans le fichier 1.2s après le dernier changement
  useDebounceWrite(prices, '/api/prices');
  useDebounceWrite(config, '/api/config');

  const updatePrices    = (next) => setLivePrices(next);
  const updatePositions = (nextPositions) => setLiveConfig({ ...config, positions: nextPositions });
  const updateColors    = (nextColors) => setLiveConfig({ ...config, colors: nextColors });

  const setTechnique = (key, data) => updatePrices({ ...prices, [key]: data });
  const setDelivery  = (key, val)  => updatePrices({ ...prices, delivery: { ...prices.delivery, [key]: Number(val) } });
  const setMinUnits  = (val)       => updatePrices({ ...prices, minimum_units: parseInt(val) || 0 });

  return (
    <div className="pa-page">
      <div className="pa-card">
        <div className="pa-header">
          <h2 className="pa-title">Configuration</h2>
          <Link to="/simulateur" className="pa-link-sim">Voir le simulateur →</Link>
        </div>

        <ColorsSection colors={config.colors ?? []} onChange={updateColors} />

        <PositionsSection positions={config.positions ?? []} onChange={updatePositions} />

        <TechniqueSection label="Broderie" data={prices.broderie}
          onChange={d => setTechnique('broderie', d)} />
        <TechniqueSection label="Flocage"  data={prices.flocage}
          onChange={d => setTechnique('flocage', d)} />

        <div className="pa-section">
          <h3 className="pa-section-title">Livraison</h3>
          {Object.entries(prices.delivery).map(([k, v]) => (
            <div key={k} className="pa-row">
              <span className="pa-label pa-label--cap">{k}</span>
              <div className="pa-input-group">
                <input type="number" className="pa-input pa-input--sm" value={v}
                  onChange={e => setDelivery(k, e.target.value)} min="0" step="0.5" />
                <span className="pa-unit">€ / pull</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pa-section">
          <h3 className="pa-section-title">Commande minimale</h3>
          <div className="pa-row">
            <span className="pa-label">Minimum</span>
            <div className="pa-input-group">
              <input type="number" className="pa-input pa-input--sm" value={prices.minimum_units}
                onChange={e => setMinUnits(e.target.value)} min="1" />
              <span className="pa-unit">pulls</span>
            </div>
          </div>
        </div>

        <p className="pa-hint">Les modifications sont sauvegardées automatiquement.</p>
      </div>
    </div>
  );
}
