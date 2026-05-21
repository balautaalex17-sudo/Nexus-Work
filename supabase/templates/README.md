# Supabase Auth Email Templates

Use this template for the hosted Supabase project:

- Dashboard: https://supabase.com/dashboard/project/sixsfvbsfkokukszmoyt/auth/templates
- Template: Confirm signup
- Subject: Confirm your Nexus Work account
- HTML: `supabase/templates/confirm-signup.html`

The confirmation button intentionally uses `token_hash`:

```html
https://examcraft-ai.vercel.app/auth/callback?token_hash={{ .TokenHash }}&type=email
```

That avoids PKCE verifier errors when the signup email is opened in a different browser or on a phone.
