# PhoneMatch DZ — Phase 4 Complete

## Included features
- Professional responsive Arabic RTL interface.
- Recommendation scoring by budget and use case.
- Search, brand/network filters, and sorting.
- Side-by-side phone comparison.
- Favorites saved locally in the current browser.
- Supabase offer loading with `prices.json` fallback.
- Optional SQL views for offer history and per-store comparison.
- Existing scheduled GitHub Actions price updater retained.

## Deploy update
1. Download and extract this ZIP.
2. Upload the extracted files and folders to the root of your existing GitHub repository, preserving `.github/workflows`, `scripts`, and `supabase` folders.
3. Commit to the same branch used by GitHub Pages.
4. Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist under GitHub Settings → Secrets and variables → Actions. The service-role key must never be added to client files.
5. In Actions, manually run `Update PhoneMatch DZ prices`; check that it succeeds.
6. In Supabase, check Table Editor → `phone_offers` for fresh rows and view `phone_best_offers` for the current cheapest offer per phone.
7. Optional: run `supabase/phase4.sql` in Supabase SQL Editor to create read-only history/comparison views.

## Security
- `app.js` uses only the public publishable key. Keep RLS enabled.
- Never publish `sb_secret_...` or legacy `service_role` keys.
- Public prices and offers are reference information and may be stale or unavailable. Verify with the store.

## Important data note
The recommendations are computed from the bundled phone specification list. Supabase offers replace displayed prices only when the `phone_name` in `phone_offers` matches a name in `phones.js` exactly. This is a static website; favorites are stored in the current browser only. Store scraping can fail when third-party pages change.
