/* =====================================================
   config.js v6.0 — Update API_URL after each deployment
   ===================================================== */
const APP_CONFIG = {
  API_URL:       'https://script.google.com/macros/s/AKfycbzjJm5Alj6RdkuCdpY1knfpM0e4-HdpeW6PGfl91LgBkbsIKZmf1EBA_tSXgRIXhoKz/exec',
  APP_NAME:      'Shawarmer IT Operations',
  VERSION:       '6.0',
  POLL_INTERVAL: 30000,
  MAX_RETRIES:   2,
  RETRY_DELAY:   1000,
  LAST_TAB:      'dashboard',
};

/* Simple password hash — must match Apps Script hashPassword() */
function hashPassword(password) {
  if (!password) return '';
  let hash = 0;
  const str = password + 'shawarmer_salt_v5';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
