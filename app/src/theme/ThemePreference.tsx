/**
 * The appearance setting: System, Dark or Light. Dark is the default.
 *
 * On iOS and Android the choice is applied with Appearance.setColorScheme,
 * so native pieces (tab bar, alerts, keyboard) follow it too, not just our
 * own views. The web follows the setting through useScheme().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

export type ThemePreference = 'system' | 'dark' | 'light';

export const DEFAULT_PREFERENCE: ThemePreference = 'dark';
const KEY = 'hoops:theme:v1';

type State = { preference: ThemePreference; setPreference: (p: ThemePreference) => void };

const ThemeContext = createContext<State | null>(null);

function apply(preference: ThemePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setState] = useState<ThemePreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        const value = isThemePreference(saved) ? saved : DEFAULT_PREFERENCE;
        apply(value);
        if (!cancelled) setState(value);
      })
      .catch(() => apply(DEFAULT_PREFERENCE));
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setState(p);
    apply(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The current setting. Outside the provider (tests), the default. */
export function useThemePreference(): State {
  return useContext(ThemeContext) ?? { preference: DEFAULT_PREFERENCE, setPreference: () => {} };
}
