-- Phase 0 trust hardening (S7): members could insert and update their own governance eligibility
-- snapshot (and, before S1, the is_governance_eligible flag), so the "eligible" state shown to stewards
-- and counted by the domain-maturity logic was forgeable. Snapshots are now written only by staff
-- (role.assign / settings.manage) or server functions; owners keep read access.

DROP POLICY IF EXISTS "Governance eligibility snapshots are insertable by owner or admins" ON public.governance_eligibility_snapshots;
CREATE POLICY "Governance eligibility snapshots are insertable by admins" ON public.governance_eligibility_snapshots
  FOR INSERT WITH CHECK (
    public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission)
  );

DROP POLICY IF EXISTS "Governance eligibility snapshots are updatable by owner or admins" ON public.governance_eligibility_snapshots;
CREATE POLICY "Governance eligibility snapshots are updatable by admins" ON public.governance_eligibility_snapshots
  FOR UPDATE USING (
    public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission)
  )
  WITH CHECK (
    public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission)
  );
