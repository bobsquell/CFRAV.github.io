import { useState, useEffect } from 'react';
import { PricesContext } from './contexts.js';
import initialPrices from './prices.json';

const LS_KEY = 'cfrav_prices';

function loadInitial() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return initialPrices;
}

export function PricesProvider({ children }) {
  const [prices, setPricesState] = useState(loadInitial);

  // Sync depuis les autres onglets
  useEffect(() => {
    const handler = (e) => {
      if (e.key === LS_KEY && e.newValue) {
        try { setPricesState(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setLivePrices = (newPrices) => {
    setPricesState(newPrices);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newPrices)); } catch {}
  };

  const savePrices = async (newPrices) => {
    setLivePrices(newPrices);
    try {
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrices, null, 2),
      });
    } catch {}
  };

  return (
    <PricesContext.Provider value={{ prices, setLivePrices, savePrices }}>
      {children}
    </PricesContext.Provider>
  );
}
