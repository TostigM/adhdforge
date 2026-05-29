/**
 * User Display Name Resolution
 * ──────────────────────────────────────────────────────────────────────────────
 * Resolution order per doc 01 §2.5:
 *   1. users.display_name (if explicitly set)
 *   2. OAuth-provided name from auth_methods.metadata.name_at_provider
 *   3. Email local part, capitalised
 *   4. "you" as final fallback
 *
 * Used everywhere the UI greets the user. Never template display name into
 * possessive form — always use "your" for possessives.
 */

interface UserForDisplayName {
  name?: string | null;          // users.display_name
  email?: string | null;
}

export function getUserAddressName(user: UserForDisplayName): string {
  // 1. Explicit display name
  if (user.name?.trim()) {
    return user.name.trim();
  }

  // 2. OAuth name is stored in auth_methods.metadata — caller can pass it
  //    via the oauthName parameter if available at call site.

  // 3. Email local part, capitalised
  if (user.email) {
    const localPart = user.email.split('@')[0] ?? '';
    if (localPart.length > 0) {
      return capitalize(localPart.replace(/[._+-]/g, ' '));
    }
  }

  // 4. Final fallback
  return 'you';
}

/**
 * Overload: when OAuth name is available at call site (e.g. from metadata).
 */
export function getUserAddressNameWithOAuth(
  user: UserForDisplayName,
  oauthName?: string | null,
): string {
  if (user.name?.trim()) return user.name.trim();
  if (oauthName?.trim()) return oauthName.trim();
  return getUserAddressName(user);
}

function capitalize(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}
