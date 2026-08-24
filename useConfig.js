import { useContext } from 'react';
import { ConfigContext } from './contexts.js';

export function useConfig() {
  return useContext(ConfigContext);
}
