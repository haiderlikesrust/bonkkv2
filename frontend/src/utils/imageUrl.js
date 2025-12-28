/**
 * Image URL Utility
 * Converts relative image URLs to absolute URLs using the API base URL
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

/**
 * Get absolute image URL
 * If the URL is already absolute (starts with http:// or https://), return as-is
 * Otherwise, prepend the API base URL
 */
export function getImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }

  // If already absolute URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If relative URL starting with /, prepend API base URL
  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  // Otherwise, assume it's relative to API base
  return `${API_BASE_URL}/${imageUrl}`;
}

