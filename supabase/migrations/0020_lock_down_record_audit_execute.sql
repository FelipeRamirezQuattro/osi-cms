-- record_audit() was the one function in 0017 that never got a `revoke
-- all ... from public` + `grant ... to authenticated` pair (unlike the
-- five atomic functions it's called from). Postgres grants EXECUTE on a
-- new function to PUBLIC by default, and a PUBLIC grant is not
-- overridden by revoking the privilege from one specific role (`anon`)
-- while PUBLIC still holds it — confirmed by 0019's `revoke ... from
-- anon` having no effect on this function per get_advisors, while the
-- same revoke did work on the five atomic functions (because 0017 had
-- already stripped their PUBLIC grant first). Apply the same pattern
-- here: revoke the PUBLIC-level grant outright, then re-grant only to
-- authenticated (record_audit's own `if not is_staff() then raise
-- exception` still gates the real permission, same as every other
-- atomic/audit function here — this just stops anonymous callers from
-- reaching it at all).

revoke all on function public.record_audit(text, text, uuid, jsonb) from public;
grant execute on function public.record_audit(text, text, uuid, jsonb) to authenticated;
