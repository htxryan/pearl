export type ColorToken =
  | 'background'
  | 'foreground'
  | 'muted'
  | 'muted-foreground'
  | 'border'
  | 'primary'
  | 'primary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'destructive'
  | 'ring'
  | 'info'
  | 'info-foreground'
  | 'success'
  | 'success-foreground'
  | 'warning'
  | 'warning-foreground'
  | 'danger'
  | 'danger-foreground'
  | 'surface'
  | 'surface-raised';

export interface ThemeDefinition {
  id: string;
  name: string;
  colorScheme: 'light' | 'dark';
  colors: Record<ColorToken, string>;
}

export const COLOR_TOKENS: readonly ColorToken[] = [
  'background',
  'foreground',
  'muted',
  'muted-foreground',
  'border',
  'primary',
  'primary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'ring',
  'info',
  'info-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'danger',
  'danger-foreground',
  'surface',
  'surface-raised',
] as const;
