/**
 * AutoLink Plugin for Lexical Editor
 * 
 * Automatically converts URLs and email addresses into clickable links
 * as the user types.
 */

import { AutoLinkPlugin as LexicalAutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { createLinkMatcherWithRegExp } from '@lexical/link';

// URL pattern matching http://, https://
const URL_REGEX = /https?:\/\/[^\s]+/i;

// URL pattern matching www. without protocol
const WWW_URL_REGEX = /www\.[^\s]+/i;

// Email pattern matching
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

// Create matchers using the regex patterns
const MATCHERS = [
  // Match http:// and https:// URLs
  createLinkMatcherWithRegExp(URL_REGEX, (text) => text),
  
  // Match www. URLs and prepend https://
  createLinkMatcherWithRegExp(WWW_URL_REGEX, (text) => `https://${text}`),
  
  // Match email addresses and prepend mailto:
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => `mailto:${text}`),
];

/**
 * AutoLinkPlugin component
 * 
 * Uses Lexical's built-in AutoLinkPlugin to automatically convert
 * URLs and email addresses into clickable links as the user types.
 * 
 * Features:
 * - Auto-detects URLs with http:// or https://
 * - Auto-detects URLs starting with www. and prepends https://
 * - Auto-detects email addresses and adds mailto: protocol
 * - Won't auto-link inside existing links
 */
export default function AutoLinkPlugin(): JSX.Element {
  return <LexicalAutoLinkPlugin matchers={MATCHERS} />;
}
