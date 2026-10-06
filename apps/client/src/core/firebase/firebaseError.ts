export type FirebaseFailureKind = 'offline' | 'session-expired' | 'recoverable';

export function firebaseFailureKind(error: unknown): FirebaseFailureKind {
  const code = firebaseErrorCode(error);
  if (
    code === 'unavailable' ||
    code === 'network-request-failed' ||
    code === 'timeout'
  ) {
    return 'offline';
  }
  if (
    code === 'unauthenticated' ||
    code === 'user-token-expired' ||
    code === 'invalid-user-token' ||
    code === 'user-disabled'
  ) {
    return 'session-expired';
  }

  const message = error instanceof Error ? error.message : '';
  if (/failed to fetch|network request failed|networkerror|offline/i.test(message)) {
    return 'offline';
  }
  return 'recoverable';
}

export function readableFirebaseError(error: unknown): string {
  const code = firebaseErrorCode(error);
  if (code) {
    const messages: Record<string, string> = {
      unauthenticated: 'La sesión ha caducado. Vuelve a iniciar sesión.',
      'user-token-expired': 'La sesión ha caducado. Vuelve a iniciar sesión.',
      'invalid-user-token': 'La sesión ya no es válida. Vuelve a iniciar sesión.',
      'user-disabled': 'Esta cuenta está desactivada.',
      'failed-precondition': 'La operación no está disponible en su estado actual.',
      'deadline-exceeded': 'La partida ha caducado. Empieza una nueva.',
      'not-found': 'No se ha encontrado el contenido solicitado.',
      'already-exists': 'Ya existe un registro activo con esos datos.',
      'invalid-argument': 'Revisa los datos introducidos.',
      'permission-denied': 'No tienes permisos para completar esta operación.',
      'resource-exhausted': 'Has alcanzado el límite permitido para esta operación.',
      aborted: 'Los datos han cambiado. Actualiza y vuelve a intentarlo.',
      unavailable: 'No hay conexión con el servicio. Conservamos tus últimos datos.',
      'network-request-failed': 'No hay conexión. Comprueba tu red y vuelve a intentarlo.',
      timeout: 'La conexión está tardando demasiado. Vuelve a intentarlo.',
      'email-already-in-use': 'Ese correo ya está asociado a otra cuenta.',
      'credential-already-in-use': 'Esa cuenta ya está vinculada a otro usuario.',
      'invalid-credential': 'El correo o la contraseña no son correctos.',
      'invalid-email': 'Introduce un correo electrónico válido.',
      'weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
      'popup-closed-by-user': 'Se cerró el acceso con Google antes de terminar.',
      'popup-blocked': 'El navegador ha bloqueado la ventana de acceso con Google.',
      'google-oauth-not-configured': 'Google todavía no está configurado para esta versión Android.',
      'play-services-not-available': 'Actualiza Google Play Services para continuar.',
      'operation-not-supported-in-this-environment': 'Google no está disponible en esta plataforma.',
    };
    return messages[code] ?? 'No se pudo completar la operación con Firebase.';
  }

  if (firebaseFailureKind(error) === 'offline') {
    return 'No hay conexión. Comprueba tu red y vuelve a intentarlo.';
  }
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
}

function firebaseErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return String((error as {code: unknown}).code)
    .replace('functions/', '')
    .replace('auth/', '');
}
