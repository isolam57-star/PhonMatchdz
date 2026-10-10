# PhoneMatch DZ — Phase 5

## New features
- Price history chart and table from `public.phone_price_history`.
- Store comparison based on the latest recorded observation for each store.
- Admin login using Supabase Auth email/password (no hardcoded password).
- Admin can add a store offer; the app records it in `phone_offers` and `phone_price_history`.
- Existing Phase 4 recommendation, catalog, comparison, favorites, Supabase read, and `prices.json` fallback are retained.

## Before deployment
1. The Phase 5 site uses the existing project URL and public publishable key in `app.js`. A public publishable/anon key is expected to be visible in a static website; NEVER add a `service_role` or `sb_secret` key to frontend files.
2. You already created `admin_users` and `phone_price_history` and inserted your user UID into `admin_users` in Supabase. Confirm that the UID matches the account you use to log in.
3. Open Supabase → SQL Editor, paste and run `supabase/phase5.sql`. This adds authenticated-admin write policies for `phone_offers` and grants access needed by the form. It does not delete data.
4. Confirm the Supabase Auth user has a confirmed email and can sign in with email/password.
5. Upload the ZIP contents to the root of the same GitHub repository/branch, preserving `.github/workflows` and `scripts`. Commit and wait for GitHub Pages deployment.
6. Open the website and use the “تاريخ الأسعار” section to view available records. The chart will be empty until observations are inserted into `phone_price_history`.
7. Open “المدير”, sign in with the same Supabase Auth email/password, and add a test offer. Verify the new row in `phone_offers` and `phone_price_history`.

## Important
- Admin role membership is controlled by `admin_users`; only add trusted user UUIDs from the SQL Editor.
- RLS must remain enabled. Do not create a public insert policy for either offers or history.
- The website is static. Authentication and row-level security are enforced by Supabase; never trust a hidden UI element alone as security.
- Phase 5 currently supports adding offers, not editing/deleting old offers or editing the bundled phone specifications.
- Existing scraper history in `phone_offers` does not automatically appear in `phone_price_history`. Historical charts start collecting records when rows are inserted into the history table. Admin form inserts to both tables.
- Store prices may be stale, incomplete, or incorrectly extracted by third-party listing scrapers. Verify offers with the store before buying.

## Verify current admin policies
Run in SQL Editor:
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_users','phone_offers','phone_price_history')
ORDER BY tablename, policyname;
```
