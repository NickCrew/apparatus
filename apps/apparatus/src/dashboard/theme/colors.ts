/**
 * Apparatus "Command Center" Color Palette
 * Designed for high-contrast dark mode interfaces.
 */

export const colors = {
  // Primary: Professional Teal/Cyan
  primary: {
    DEFAULT: '#00C4A7',
    50: '#E0F9F6',
    100: '#B3EFEC',
    200: '#80E4DD',
    300: '#4DD9CE',
    400: '#26D1C3',
    500: '#00C4A7', // Main Brand
    600: '#00A38E',
    700: '#008375',
    800: '#00625C',
    900: '#004242',
    950: '#002121',
  },

  // Semantic Colors
  success: {
    DEFAULT: '#00FF94', // Neon Green
    50: '#E0FFE9',
    100: '#B3FFD6',
    200: '#80FFC2',
    300: '#4DFFAD',
    400: '#26FF9E',
    500: '#00FF94',
    600: '#00CC76',
    700: '#009959',
    800: '#00663B',
    900: '#00331E',
  },

  warning: {
    DEFAULT: '#FFB800', // Amber
    50: '#FFF7E0',
    100: '#FFEDB3',
    200: '#FFE380',
    300: '#FFD94D',
    400: '#FFCF26',
    500: '#FFB800',
    600: '#CC9300',
    700: '#996E00',
    800: '#664A00',
    900: '#332500',
  },

  danger: {
    DEFAULT: '#E11D48', // Crimson/Rose
    50: '#FDF2F4',
    100: '#FBE1E6',
    200: '#F7AFBD',
    300: '#F27D94',
    400: '#EE4B6B',
    500: '#E11D48',
    600: '#B91C3F',
    700: '#911636',
    800: '#69102D',
    900: '#410A24',
    950: '#19050E',
  },

  info: {
    DEFAULT: '#00A3FF', // Sky Blue
    50: '#E0F4FF',
    100: '#B3E3FF',
    200: '#80D2FF',
    300: '#4DC1FF',
    400: '#26B2FF',
    500: '#00A3FF',
    600: '#0082CC',
    700: '#006299',
    800: '#004166',
    900: '#002133',
  },

  // Neutral Colors - Deep, bluish grays for "Space" feel
  neutral: {
    50: '#F5F7FA',
    100: '#EBEFF5',
    200: '#DDE4ED',
    300: '#C9D3E0',
    400: '#9BA9BF',
    500: '#708099',
    600: '#4D5B70',
    700: '#323C4D',
    800: '#1F2633',
    900: '#131720',
    950: '#0A0C11', // Almost Black
  },
  
  // Specific UI Surfaces
  surface: {
    DEFAULT: '#131720',
    muted: '#1F2633',
    highlight: '#323C4D',
    panel: '#0A0C11',
    border: '#323C4D',
  }
} as const;

export type Colors = typeof colors;
export type PrimaryShade = keyof typeof colors.primary;
export type SemanticColor = 'success' | 'warning' | 'danger' | 'info';
