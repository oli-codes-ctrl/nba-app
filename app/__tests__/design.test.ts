import { initials } from '@/components/Avatar';
import { DEFAULT_PREFERENCE, isThemePreference } from '@/theme/ThemePreference';
import { percentileColor, percentileScale } from '@/theme/tokens';

describe('avatars', () => {
  it('uses first and last initials, skipping suffixes and punctuation', () => {
    expect(initials('Luka Dončić')).toBe('LD');
    expect(initials('Walter Clayton Jr.')).toBe('WC');
    expect(initials('P.J. Washington')).toBe('PW');
    expect(initials('Jaren Jackson Jr.')).toBe('JJ');
    expect(initials('Nikola Đurišić')).toBe('NĐ');
    expect(initials('Nenê')).toBe('NE');
    expect(initials('')).toBe('?');
  });
});

describe('percentile colors', () => {
  it('splits 0-100 into five cold-to-hot steps', () => {
    for (const scheme of ['dark', 'light'] as const) {
      const s = percentileScale[scheme];
      expect(percentileColor(scheme, 0)).toBe(s[0]);
      expect(percentileColor(scheme, 19.9)).toBe(s[0]);
      expect(percentileColor(scheme, 50)).toBe(s[2]);
      expect(percentileColor(scheme, 80)).toBe(s[4]);
      expect(percentileColor(scheme, 100)).toBe(s[4]);
      expect(percentileColor(scheme, -5)).toBe(s[0]);
    }
  });
});

describe('appearance setting', () => {
  it('defaults to dark and only accepts the three choices', () => {
    expect(DEFAULT_PREFERENCE).toBe('dark');
    expect(['system', 'dark', 'light'].every(isThemePreference)).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});
