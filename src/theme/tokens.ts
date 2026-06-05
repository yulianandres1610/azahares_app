// Design tokens portados de index.html (:root). Fuente única de verdad de color/forma.
export const colors = {
  navy900: '#0d1b3d',
  navy700: '#1e3a8a',
  navy500: '#3b5bbf',
  accent: '#6488e0',
  success: '#10b981',
  amber: '#f59e0b',
  error: '#f43f5e',

  ink: '#101d3b',
  ink70: 'rgba(16,29,59,0.72)',
  ink60: 'rgba(16,29,59,0.62)',
  ink50: 'rgba(16,29,59,0.52)',
  ink40: 'rgba(16,29,59,0.40)',
  ink30: 'rgba(16,29,59,0.26)',
  line: 'rgba(16,29,59,0.10)',

  surface: '#ffffff',
  bg: '#eef2f8',
  // tonos translúcidos sobre navy (para tarjetas glass en pantallas oscuras)
  glassDark: 'rgba(255,255,255,0.10)',
  glassDarkBd: 'rgba(255,255,255,0.18)',
  glassLight: 'rgba(255,255,255,0.74)',

  white: '#ffffff',
} as const;

// Degradados navy (usados con expo-linear-gradient).
export const gradients = {
  navy: ['#1e3a8a', '#3b5bbf'] as const,
  navyDeep: ['#0d1b3d', '#1c2f63'] as const,
  navyDeepStops: { colors: ['#0d1b3d', '#1c2f63'] as const, locations: [0.05, 0.85] as const },
  sky: ['#3b5bbf', '#0d1b3d'] as const,
};

export const radius = {
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// Sombras (iOS). Aproximación de --shadow-card / --shadow-sm.
export const shadows = {
  sm: {
    shadowColor: '#101d3b',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  card: {
    shadowColor: '#101d3b',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
};

export const fonts = {
  serif: 'Newsreader_600SemiBold',
  serifRegular: 'Newsreader_400Regular',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemibold: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
  sansExtra: 'HankenGrotesk_800ExtraBold',
};

// Helper: color mix aproximado para fondos translúcidos de un color sobre transparente.
export function alpha(hex: string, a: number): string {
  // soporta #rrggbb
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
