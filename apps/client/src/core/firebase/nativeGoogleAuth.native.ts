let configuredClientId: string | null = null;

function authError(code: string, message: string): Error {
  return Object.assign(new Error(message), {code});
}

function googleWebClientId(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId?.endsWith('.apps.googleusercontent.com')) {
    throw authError(
      'auth/google-oauth-not-configured',
      'Falta configurar el cliente OAuth web de Google para Android.',
    );
  }
  return clientId;
}

export async function getNativeGoogleIdToken(): Promise<string> {
  const google = await import('react-native-nitro-google-signin');
  const clientId = googleWebClientId();

  if (configuredClientId !== clientId) {
    google.GoogleOneTapSignIn.configure({
      autoSelectOnSignIn: false,
      offlineAccess: false,
      webClientId: clientId,
    });
    configuredClientId = clientId;
  }

  try {
    await google.GoogleOneTapSignIn.checkPlayServices();
    let response = await google.GoogleOneTapSignIn.signIn();

    if (google.isNoSavedCredentialFoundResponse(response)) {
      response = await google.GoogleOneTapSignIn.createAccount();
    }
    if (google.isNoSavedCredentialFoundResponse(response)) {
      response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
    }
    if (google.isCancelledResponse(response)) {
      throw authError('auth/popup-closed-by-user', 'Se canceló el acceso con Google.');
    }
    if (!google.isSuccessResponse(response) || !response.data.idToken) {
      throw authError('auth/invalid-credential', 'Google no devolvió una credencial válida.');
    }
    return response.data.idToken;
  } catch (error) {
    if (!google.isErrorWithCode(error)) throw error;
    if (error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw authError(
        'auth/play-services-not-available',
        'Actualiza Google Play Services para continuar.',
      );
    }
    if (error.code === google.statusCodes.DEVELOPER_ERROR) {
      throw authError(
        'auth/google-oauth-not-configured',
        'La firma SHA-1 o el cliente OAuth de Android no coinciden.',
      );
    }
    if (error.code === google.statusCodes.SIGN_IN_CANCELLED) {
      throw authError('auth/popup-closed-by-user', 'Se canceló el acceso con Google.');
    }
    throw error;
  }
}

export async function signOutNativeGoogle(): Promise<void> {
  const google = await import('react-native-nitro-google-signin');
  try {
    await google.GoogleOneTapSignIn.signOut();
  } catch {
    // Firebase sign-out must still complete if Google has no cached native session.
  }
}
