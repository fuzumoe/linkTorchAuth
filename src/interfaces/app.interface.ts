export interface AppConfig {
    port: number;
    nodeEnv: string;
    appName: string;
    appDescription: string;
    apiBasePrefix: string;
    apiVersion: string;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    openApiUrl: string;
    openApiJsonUrl: string;
    redocUrl: string;
}
