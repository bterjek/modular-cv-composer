# Accounts, invites and admin — how it works

Build step 2. Invite-only test mode; everything here is also what the public
version will stand on.

## Why no auth library

Sessions + passwords are ~300 lines here, fully covered by tests, with no
third-party session format to track. The design follows the OWASP cheat sheets
for password storage and session management. Passkeys and e-mail can be added
later without changing the session model.

## Passwords
- scrypt (`node:crypto`), N=2^17, r=8, p=1, 16-byte salt, 64-byte key — OWASP's recommended scrypt parameters.
- Stored as `scrypt$N$r$p$salt$hash`, so parameters can be raised later without breaking old hashes.
- Minimum 12 characters, maximum 256. No composition rules (a short sentence is the intended style).
- Unknown e-mail and wrong password give the same message and take the same time.

## Sessions
- 256-bit random token in an `httpOnly`, `SameSite=Lax` cookie (`Secure` outside development).
- The database stores only `sha256(token)`; a leaked database does not give working sessions.
- 30-day lifetime, renewed automatically once past half-life.
- Changing password logs out every other device; a reset or disabling an account logs out everywhere.

## Invites (test mode)
- Codes look like `7K3M-QX9P-2RTV-H4WD` (80 bits, Crockford base32). Case, spaces and missing dashes are forgiven.
- Stored hashed; shown to the admin **once**.
- Each code carries the role it grants, optional e-mail binding, max uses, expiry, note, and can be revoked.
- A code is used up atomically, in the same transaction that creates the account.

## First admin
On start, if no active admin exists and `ADMIN_EMAIL` is set, the server prints a
one-time sign-up link to its log:

```
[bootstrap] No admin yet. Sign up as you@example.com within 24 hours: https://…/signup?code=…
```

Every restart without an admin revokes the previous link and prints a new one.
Once an admin exists, nothing is printed. The last active admin cannot be demoted or disabled.

## Password reset (no e-mail yet)
The admin clicks **Reset code** next to a user, and passes the code on (chat, phone).
The user enters e-mail + code + new password at `/reset`. Codes are one-time,
valid 24 hours, and issuing a new one cancels the previous one.

## Feature flags
Defined in `src/lib/server/flags.ts` (the registry); the database only holds on/off.
Per-user overrides beat the global value, so you can switch a feature on for
yourself before testers see it.

## Protections
- Brute force: login 10 attempts per e-mail and 30 per IP per 15 minutes; sign-up and reset 10 per IP per hour. In memory — correct for one container.
- CSRF: SvelteKit rejects cross-site form posts (verified in the end-to-end run).
- Headers: Content-Security-Policy (scripts only from the app), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS outside development.
- `/admin` and its actions are guarded in `hooks.server.ts`; admins see accounts, invites, flags and feedback, never CV content.

## Behind a reverse proxy
If the host puts a proxy in front of the container, set `ADDRESS_HEADER=X-Forwarded-For`
(and `XFF_DEPTH` if there are several proxies) so rate limits see real client addresses.
