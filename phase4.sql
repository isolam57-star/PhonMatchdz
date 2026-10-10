-- PhoneMatch DZ Phase 4: optional views for offer history and store comparison.
-- Run in Supabase SQL Editor after phase3_5.sql has been applied.
-- phone_offers rows are append-only observations; this view exposes them read-only.
create or replace view public.phone_offer_history
with (security_invoker = true)
as
select id, phone_name, store_name, price_dzd, product_url, wilaya,
       stock_status, confidence, observed_at
from public.phone_offers;

grant select on public.phone_offer_history to anon, authenticated;

create or replace view public.phone_store_comparison
with (security_invoker = true)
as
select distinct on (phone_name, store_name)
       phone_name, store_name, price_dzd, product_url, wilaya,
       stock_status, confidence, observed_at
from public.phone_offers
order by phone_name, store_name, observed_at desc;

grant select on public.phone_store_comparison to anon, authenticated;
