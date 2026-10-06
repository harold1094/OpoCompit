export async function getNativeGoogleIdToken(): Promise<string> {
  throw Object.assign(new Error('El acceso nativo con Google no está disponible en esta plataforma.'), {
    code: 'auth/operation-not-supported-in-this-environment',
  });
}

export async function signOutNativeGoogle(): Promise<void> {}
