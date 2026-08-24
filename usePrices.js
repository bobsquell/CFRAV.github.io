import { useContext } from 'react';
import { PricesContext } from './contexts.js';

export function usePrices() {
  return useContext(PricesContext);
}
