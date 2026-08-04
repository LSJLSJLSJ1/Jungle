/*
 * Public browser configuration for the static guestbook.
 *
 * The anon key is safe to expose in a browser only when the database table is
 * protected by the RLS policies in supabase/guestbook.sql. Never put a
 * Supabase service_role key here.
 */
window.GUESTBOOK_CONFIG = Object.freeze({
    provider: 'supabase',
    url: 'https://hcmafylaiparssyifmlx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWFmeWxhaXBhcnNzeWlmbWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDQ5MTQsImV4cCI6MjEwMTQyMDkxNH0.8oVA0I9TdoO2KF6f6p5997LUeuubWtvTKmGuYWsxSgU'
});
