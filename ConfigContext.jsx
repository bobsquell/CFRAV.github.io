import { useState, useEffect } from 'react';
import { ConfigContext } from './contexts.js';
import initialConfig from './config.json';

const LS_KEY = 'cfrav_config';

function loadInitial() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return initialConfig;
}

export function ConfigProvider({ children }) {
  const [config, setConfigState] = useState(loadInitial);

  // Sync depuis les autres onglets
  useEffect(() => {
    const handler = (e) => {
      if (e.key === LS_KEY && e.newValue) {
        try { setConfigState(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setLiveConfig = (newConfig) => {
    setConfigState(newConfig);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newConfig)); } catch {}
  };

  const saveConfig = async (newConfig) => {
    setLiveConfig(newConfig);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig, null, 2),
      });
    } catch {}
  };

  return (
    <ConfigContext.Provider value={{ config, setLiveConfig, saveConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}
