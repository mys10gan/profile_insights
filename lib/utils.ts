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
