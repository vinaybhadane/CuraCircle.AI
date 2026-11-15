/**
 * Sanitizes notification and alert text by stripping raw HTML, embedded CSS stylesheets,
 * script tags, and HTML entities so user-facing notifications display clean, human-readable text.
 */
export function cleanNotificationText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // 1. Remove style, script, and head tags and their entire contents
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');

  // 2. Remove CSS selectors and rule blocks that may have leaked without tags (e.g. "body { ... } .card { ... }")
  text = text.replace(/(?:^|\s)(?:body|\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+)\s*\{[^}]*\}/gi, ' ');

  // 3. Remove any remaining isolated curly-brace blocks
  text = text.replace(/\{[^}]*\}/g, ' ');

  // 4. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 5. Replace common HTML entities with clean typography
  text = text
    .replace(/&bull;/gi, '•')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // 6. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
