import { useContext } from 'react';
import { AppContext, type AppState } from '../lib/appContext';

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside the booted App');
  return ctx;
}
