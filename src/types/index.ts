export type ViewMode = 'split' | 'preview' | 'code';

export type DeviceViewport = 'responsive' | 'mobile' | 'tablet' | 'laptop';

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  content: string;
  timestamp: string;
}

export interface AppTemplate {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  category: 'productivity' | 'landing' | 'utility' | 'dashboard' | 'portfolio';
  code: string;
}
