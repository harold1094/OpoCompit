describe('legalConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...originalEnv};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the support email for external deletion requests', () => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'soporte@opocompit.test';
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL = 'https://opocompit.test/data-deletion';

    const {deletionRequestUrl} = require('./legalConfig') as typeof import('./legalConfig');

    expect(deletionRequestUrl()).toBe(
      'mailto:soporte@opocompit.test?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20OpoCompit',
    );
  });

  it('falls back to the support form instead of reopening the public deletion page', () => {
    delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    process.env.EXPO_PUBLIC_SUPPORT_URL = 'https://opocompit.test/support';
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL = 'https://opocompit.test/data-deletion';

    const {deletionRequestUrl} = require('./legalConfig') as typeof import('./legalConfig');

    expect(deletionRequestUrl()).toBe('https://opocompit.test/support');
  });
});
