export function assertEnvironment(environment = process.env) {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !environment[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (environment.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
}