-- rls_auto_enable is an event-trigger helper; it never needs to be callable through the API.
-- The event trigger keeps working without these grants.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
