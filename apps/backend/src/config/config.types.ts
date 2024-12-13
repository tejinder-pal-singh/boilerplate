export interface AppConfig {
  port: number;
  env: string;
  apiPrefix: string;
  swaggerEnabled: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface VaultConfig {
  address: string;
  token: string;
  secretPath: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  jaegerEndpoint?: string;
}

export interface Config {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  vault: VaultConfig;
  telemetry: TelemetryConfig;
}
