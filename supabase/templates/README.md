# Nexus Work Auth Email Templates

These files are the white-labelled Supabase Auth email templates for Nexus Work.

They use the same visual language as the app:

- Display font feel: Georgia/Fraunces-style editorial serif.
- Body font feel: Nunito/Arial-style rounded sans.
- Paper background: `#FDFCF8`.
- Ink: `#2C2C24`.
- Primary green: `#5D7052`.
- Warm accent: `#C18C5D`.
- Border/sand: `#DED8CF`, `#E6DCCD`.
- Muted copy: `#78786C`.

## Supabase Dashboard Setup

Open the hosted project:

```text
https://supabase.com/dashboard/project/sixsfvbsfkokukszmoyt/auth/templates
```

Set these templates:

| Supabase template | Subject | HTML file |
| --- | --- | --- |
| Confirm signup | `Confirm your Nexus Work account` | `supabase/templates/confirm-signup.html` |
| Reset password | `Reset your Nexus Work password` | `supabase/templates/recovery.html` |

Also configure the project Auth URL settings:

- Site URL: the production app URL, for example `https://examcraft-ai.vercel.app`.
- Redirect URLs: include `https://examcraft-ai.vercel.app/auth/callback` and local development `http://localhost:3000/auth/callback`.

## Remove Supabase Email Branding

The default Supabase email in the inbox may show:

- Sender name: `Supabase Auth`.
- Footer text: `powered by Supabase`.

To fully white-label the emails:

1. Replace the default template HTML with the files above.
2. In Supabase Auth email/SMTP settings, configure a custom SMTP sender name such as `Nexus Work`.
3. Use a sender address from your own domain when available.

The templates intentionally do not include third-party backend branding.

## Why These Links Use `token_hash`

The links use:

```html
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

and:

```html
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/update
```

This avoids PKCE verifier errors when the email is opened in a different browser or on a phone.
