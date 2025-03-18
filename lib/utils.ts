import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp as a relative time string (e.g., "2 minutes ago")
 */
export function formatTimeAgo(timestamp: string | Date | null): string {
  if (!timestamp) return 'Never'
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

/**
 * Extract username from LinkedIn profile URL
 * Handles various LinkedIn URL formats:
 * - https://linkedin.com/in/username
 * - https://www.linkedin.com/in/username/
 * - linkedin.com/somecode/username
 */
export function extractLinkedInUsername(url: string): string {
  // Remove protocol and www if present
  const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '')
  
  // Split by slashes and find the username part
  const parts = cleanUrl.split('/')
  // Get the last non-empty part
  const username = parts.filter(Boolean).pop() || ''
  
  return username
}

/**
 * Sanitizes a username or profile URL for display
 * Handles Instagram and LinkedIn URLs/usernames
 * 
 * @param username - Raw username or URL
 * @param platform - 'instagram' or 'linkedin'
 * @returns Sanitized username for display
 */
export function sanitizeUsername(username: string, platform: 'instagram' | 'linkedin'): string {
  if (!username) return username;
  
  if (platform === 'instagram') {
    // Handle Instagram username formats
    if (username.includes('instagram.com')) {
      return username.split('/').pop()?.replace('@', '') || username;
    }
    return username.replace('@', '');
  } else {
    // Handle LinkedIn URL formats with regex
    if (username.includes('linkedin.com')) {
      // Extract username from linkedin.com/in/username or other LinkedIn URL formats
      const match = username.match(/linkedin\.com\/in\/([^\/\?\&]+)/i);
      return match ? match[1] : username;
    }
    return username;
  }
}
