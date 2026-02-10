/**
 * Detect if text is primarily RTL (Hebrew, Arabic, Persian, etc.)
 */
export function isRTLText(text: string): boolean {
  const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const rtlMatches = (text.match(rtlChars) || []).length;
  const latinChars = /[a-zA-Z]/g;
  const latinMatches = (text.match(latinChars) || []).length;
  return rtlMatches > latinMatches;
}
