import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors, type ColorScheme } from './tokens';

const STYLE_ID = 'hoops-tab-bar';

/**
 * The web build's tab bar (expo-router NativeTabs) is a pill fixed to the
 * top of the page, where it covers each screen's title and header buttons.
 * On the web, move it to the bottom like the iPhone tab bar and give it an
 * edge in both modes. The list is matched by its stable ARIA attributes,
 * since the library's class names are hashed.
 */
export function useWebTabBarStyle(scheme: ColorScheme): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const c = colors[scheme];
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `
      [role="tablist"][aria-label="Main"] {
        top: auto !important;
        bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
        border: 1px solid ${c.border};
        box-shadow: 0 6px 20px rgba(0, 0, 0, ${scheme === 'dark' ? 0.5 : 0.12});
      }
      [role="tablist"][aria-label="Main"] [role="tab"][data-state="active"] span {
        font-weight: 600;
      }
    `;
  }, [scheme]);
}

/** NativeTabs colors for the web pill; native tab bars keep the system look. */
export function webTabColors(scheme: ColorScheme) {
  if (Platform.OS !== 'web') return {};
  const c = colors[scheme];
  return {
    backgroundColor: c.surface,
    indicatorColor: c.background,
    labelStyle: { default: { color: c.textSecondary }, selected: { color: c.accent } },
  };
}
