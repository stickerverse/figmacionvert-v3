/**
 * Trusted Types Helper
 *
 * Provides a centralized way to create TrustedHTML objects to satisfy
 * strict Content Security Policies (CSP) that require Trusted Types.
 */

// Define Trusted Types types locally since they might not be in the global scope
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (
        name: string,
        rules: {
          createHTML?: (input: string) => string;
          createScript?: (input: string) => string;
          createScriptURL?: (input: string) => string;
        }
      ) => TrustedTypePolicy;
      defaultPolicy?: TrustedTypePolicy;
      getAttributeType?: (tagName: string, attribute: string) => string;
    };
  }
}

interface TrustedTypePolicy {
  createHTML: (input: string) => any;
  createScript: (input: string) => any;
  createScriptURL: (input: string) => any;
  name: string;
}

let policy: TrustedTypePolicy | null = null;
const POLICY_NAME = "figma-convert-policy";

/**
 * Gets or creates a Trusted Types policy.
 * Tries to use existing default policy or creates a new one.
 */
function getPolicy(): TrustedTypePolicy | null {
  if (policy) return policy;

  if (typeof window === "undefined" || !window.trustedTypes) {
    return null;
  }

  try {
    // Try to reuse default policy if available
    if (window.trustedTypes.defaultPolicy) {
      policy = window.trustedTypes.defaultPolicy;
      return policy;
    }

    // Create our policy
    policy = window.trustedTypes.createPolicy(POLICY_NAME, {
      createHTML: (string: string) => string, // Pass-through policy (identity)
      createScript: (string: string) => string,
      createScriptURL: (string: string) => string,
    });
  } catch (e) {
    console.warn("[CSP] Failed to create Trusted Types policy:", e);
    // Fallback: try to find if our policy already exists (e.g. from another bundle)
    // Unfortunately there's no getPolicy API, so we just have to fail gracefully
  }

  return policy;
}

/**
 * Converts a string to TrustedHTML if Trusted Types are supported/enforced.
 * Returns the original string if Trusted Types are not available.
 *
 * @param html The HTML string to sanitize/wrap
 * @returns TrustedHTML object or original string
 */
export function createTrustedHTML(html: string): string | any {
  const p = getPolicy();
  if (p) {
    try {
      return p.createHTML(html);
    } catch (e) {
      console.warn("[CSP] Failed to create TrustedHTML, returning string:", e);
      return html;
    }
  }
  return html;
}
