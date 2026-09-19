const DEFAULT_ENVIRONMENT = 'development';

export function getEnvironmentFilePath(): string {
  const environment = process.env.NODE_ENV ?? DEFAULT_ENVIRONMENT;

  return environment === DEFAULT_ENVIRONMENT ? '.env' : `.env.${environment}`;
}
