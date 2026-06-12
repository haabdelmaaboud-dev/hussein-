# Shawarmer IT Operations v6.0

## Deploy to Netlify
1. Drag the project folder onto netlify.com
2. Done — instant live URL

## Apps Script Setup
1. Open Apps Script in your Google Sheet
2. Paste `Shawarmer_IT_Checklist_v6.0.gs`
3. Run `setupInitialData` from the editor OR call:
   `?action=setupInitialData&token=YOUR_TOKEN`
4. Deploy → New deployment → Web app → Execute as Me → Anyone
5. Copy the new URL into `js/config.js` → API_URL
6. IMPORTANT: After setup, run `testAPI()` in the editor to get your new token
   Then update `js/config.js` → API_URL is not the token — token comes from login

## Accounts
| Username      | Password       | Role     |
|---------------|----------------|----------|
| admin         | Shawarmer@2025 | Admin    |
| eng.waled     | pass123        | Engineer |
| eng.karim     | pass123        | Engineer |
| eng.marvin    | pass123        | Engineer |
| eng.husien    | pass123        | Engineer |
| area.ismaeil  | pass123        | Area Mgr |
| area.imran    | pass123        | Area Mgr |
| ops.asif      | pass123        | Ops Mgr  |
| ops.mustafa   | pass123        | Ops Mgr  |

## Bugs Fixed (24 total)
1. showTab() routing — all view name mismatches fixed
2. pollData() wrong response path (summary.stats.critical)
3. refreshTab() method was missing
4. buildSidebar() vs renderSidebar() mismatch
5. startDay() state sync fixed
6. API token flow — now from localStorage after login
7. NOTIF.checkIssues CONFIG.CRITICAL_DEVICES undefined
8. AuditView async conflicts fixed
9. AdminView.render() missing — now exists
10. StoresView, CriticalView, AlertsView, EngineersView, ReportsView aliases added
11. ProfileView alias added
12. PDF export syntax error (double <<) fixed
13. NOTIF.renderPanel() vs renderList() fixed
14. APP.data vs STATE.db data disconnection fixed
15. Duplicate dashboard.js script tag removed
16. Passwords now hashed (hashPassword) — matches between frontend and backend
17. PropertiesService token — no more hardcoded "shawarmer2025"
18. All view files complete and consistent
19. Communication/WhatsApp module complete
20. Branch contacts fields added to store schema
21. Health score calculation in Apps Script
22. lastCheckAt/lastCheckBy auto-update on save
23. CacheService added for performance
24. Notifications sheet and queue added
