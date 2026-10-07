const optionalValue = (value: string | undefined) => value?.trim() || null;

export const legalConfig = {
  owner: optionalValue(process.env.EXPO_PUBLIC_LEGAL_OWNER) ?? 'OpoCompit',
  supportEmail: optionalValue(process.env.EXPO_PUBLIC_SUPPORT_EMAIL),
  supportUrl: optionalValue(process.env.EXPO_PUBLIC_SUPPORT_URL),
  privacyUrl: optionalValue(process.env.EXPO_PUBLIC_PRIVACY_URL),
  termsUrl: optionalValue(process.env.EXPO_PUBLIC_TERMS_URL),
  accountDeletionUrl: optionalValue(process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL),
};

export function supportContactUrl() {
  if (legalConfig.supportEmail) {
    const subject = encodeURIComponent('Soporte OpoCompit');
    return `mailto:${legalConfig.supportEmail}?subject=${subject}`;
  }
  return legalConfig.supportUrl;
}

export function deletionRequestUrl() {
  if (legalConfig.accountDeletionUrl) return legalConfig.accountDeletionUrl;
  if (legalConfig.supportEmail) {
    const subject = encodeURIComponent('Solicitud de eliminación de cuenta OpoCompit');
    return `mailto:${legalConfig.supportEmail}?subject=${subject}`;
  }
  return legalConfig.supportUrl;
}
