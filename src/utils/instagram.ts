/**
 * Instagram username utilities
 * Handles normalization and validation of Instagram usernames/handles
 */

/**
 * Normalizes an Instagram handle to just the username
 * Accepts various formats:
 * - username
 * - @username
 * - https://instagram.com/username
 * - http://instagram.com/username
 * - https://www.instagram.com/username
 * 
 * @param input - Raw Instagram handle input
 * @returns Normalized username (without @ or URL) or empty string
 */
export function normalizeInstagramHandle(input: string | null | undefined): string {
  if (!input) return '';
  
  let normalized = input.trim();
  
  // Remove @ prefix if present
  if (normalized.startsWith('@')) {
    normalized = normalized.substring(1);
  }
  
  // Extract username from URL if full Instagram URL is provided
  if (normalized.includes('instagram.com/')) {
    const urlMatch = normalized.match(/instagram\.com\/([^/?#]+)/);
    if (urlMatch && urlMatch[1]) {
      normalized = urlMatch[1];
    }
  }
  
  // Final trim
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Validates an Instagram username format
 * Instagram usernames can only contain:
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - Periods (.)
 * - Underscores (_)
 * 
 * And must be between 1 and 30 characters
 * 
 * @param username - Instagram username to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateInstagramHandle(username: string): {
  isValid: boolean;
  error?: string;
} {
  // Empty is valid (allows clearing the field)
  if (!username || username.trim() === '') {
    return { isValid: true };
  }
  
  const trimmed = username.trim();
  
  // Check length
  if (trimmed.length > 30) {
    return {
      isValid: false,
      error: 'Instagram username must be 30 characters or less',
    };
  }
  
  // Check format: only letters, numbers, periods, and underscores
  const validFormat = /^[a-zA-Z0-9._]+$/;
  if (!validFormat.test(trimmed)) {
    return {
      isValid: false,
      error: 'Instagram username can only contain letters, numbers, periods, and underscores',
    };
  }
  
  return { isValid: true };
}

/**
 * Checks if an Instagram handle is valid after normalization
 * Convenience function that combines normalization and validation
 * 
 * @param input - Raw Instagram handle input
 * @returns Object with isValid flag, normalized username, and optional error message
 */
export function isValidInstagramHandle(input: string): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeInstagramHandle(input);
  const validation = validateInstagramHandle(normalized);
  
  return {
    isValid: validation.isValid,
    normalized,
    error: validation.error,
  };
}

/**
 * Generates the full Instagram profile URL from a username
 * 
 * @param username - Instagram username (already normalized)
 * @returns Full Instagram profile URL
 */
export function getInstagramProfileUrl(username: string): string {
  const normalized = normalizeInstagramHandle(username);
  if (!normalized) return '';
  
  return `https://instagram.com/${normalized}`;
}
