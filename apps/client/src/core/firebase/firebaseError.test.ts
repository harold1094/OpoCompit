import {firebaseFailureKind, readableFirebaseError} from './firebaseError';

describe('Firebase recovery errors', () => {
  test('recognizes callable and auth network failures', () => {
    expect(firebaseFailureKind({code: 'functions/unavailable'})).toBe('offline');
    expect(firebaseFailureKind({code: 'auth/network-request-failed'})).toBe('offline');
    expect(readableFirebaseError({code: 'auth/network-request-failed'})).toContain('conexión');
  });

  test('recognizes expired and invalid sessions', () => {
    expect(firebaseFailureKind({code: 'functions/unauthenticated'})).toBe('session-expired');
    expect(firebaseFailureKind({code: 'auth/user-token-expired'})).toBe('session-expired');
    expect(readableFirebaseError({code: 'auth/user-token-expired'})).toContain('sesión');
  });

  test('keeps validation failures local to their operation', () => {
    expect(firebaseFailureKind({code: 'functions/invalid-argument'})).toBe('recoverable');
    expect(readableFirebaseError({code: 'functions/invalid-argument'})).toBe(
      'Revisa los datos introducidos.',
    );
  });

  test('detects browser fetch failures without a Firebase code', () => {
    expect(firebaseFailureKind(new Error('Failed to fetch'))).toBe('offline');
  });

  test('explains native Google configuration failures', () => {
    expect(readableFirebaseError({code: 'auth/google-oauth-not-configured'})).toContain(
      'no está configurado',
    );
    expect(readableFirebaseError({code: 'auth/play-services-not-available'})).toContain(
      'Google Play Services',
    );
  });
});
