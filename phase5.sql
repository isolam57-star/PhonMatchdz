-- PhoneMatch DZ Phase 5: run after the existing admin_users and phone_price_history setup.
-- This grants write access to phone_offers only to authenticated users listed in admin_users.
-- Do not add a service-role key to the frontend.

ALTER TABLE public.phone_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert phone offers" ON public.phone_offers;
CREATE POLICY "Admins can insert phone offers"
ON public.phone_offers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update phone offers" ON public.phone_offers;
CREATE POLICY "Admins can update phone offers"
ON public.phone_offers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can delete phone offers" ON public.phone_offers;
CREATE POLICY "Admins can delete phone offers"
ON public.phone_offers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

GRANT INSERT, UPDATE, DELETE ON public.phone_offers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.phone_offers_id_seq TO authenticated;

-- Public read access for the chart and comparison tables.
GRANT SELECT ON public.phone_price_history TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.phone_price_history TO authenticated;

-- Verify policies after running this script using the read-only query in README_PHASE5.md.
