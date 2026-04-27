Deploy command:

npx supabase functions deploy delete-my-account --project-ref pnezcvckzrdqikwybwwh

Required secret to set manually:
- SUPABASE_SERVICE_ROLE_KEY

Built-in function env vars are provided by Supabase automatically:
- SUPABASE_URL
- SUPABASE_ANON_KEY

Security behavior:
- Function verifies Authorization Bearer token via Supabase Auth getUser().
- Only the currently authenticated user can be deleted.
- Responses return only safe error codes/messages (no JWT payload leakage).
