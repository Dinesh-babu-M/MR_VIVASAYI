import { getAppConfig, saveAppConfig } from '../lib/dbManager';

export interface Settings {
  id?: string;
  dataSource?: string;
  apiBaseUrl?: string;
  featureToggles?: {
    pushNotifications?: boolean;
    mobileLoadingAnimation?: boolean;
    cms?: boolean;
    offlineMode?: boolean;
    analytics?: boolean;
    whatsappChat?: boolean;
  };
  theme?: string;
  version?: string;
  maintenanceMode?: boolean;
  allowedRoles?: string[];
  [key: string]: any;
}

export class SettingsService {
  async getSettings(): Promise<Settings> {
    const config = await getAppConfig();
    return config as Settings;
  }

  async saveSettings(settings: Settings): Promise<void> {
    saveAppConfig(settings as any);
  }
}
