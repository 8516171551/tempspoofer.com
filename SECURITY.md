# Temporary Spoofer — Security Layers

**Honest reality:** this is a managed WPF loader. Managed .NET is not an ideal
protection target — the IL always survives, and any truly motivated attacker
with VMProtect/Themida unpacking skills will break anything we ship here. The
goal of this doc is to list what IS implemented so you can tell a customer
"here's what you're getting," and what ISN'T so you don't oversell it.

## Threat model

1. **Script-kid tries to patch `IsLicenseValid` to `return true`** — stopped by
   server-authoritative license state + anti-tamper + obfuscation making the
   method hard to find.
2. **Replay / request forgery against the API** — stopped by signed-request
   layer (HMAC + nonce + timestamp) and server-side nonce replay cache.
3. **Tampered local settings to bypass pin / toggle features** — stopped by
   HMAC-signed settings file.
4. **MITM via rogue CA** — stopped by TLS SPKI pinning to ISRG Root X1/X2.
5. **Casual dnSpy / x64dbg attach** — stopped by AntiTamper detection.
6. **Credential theft from the DB** — install secrets are the only sensitive
   client-signing material; a DB leak invalidates existing installs but
   forging new ones also requires creating DB rows.
7. **Determined RE with native tooling** — NOT stopped by this layer alone.
   See "Not covered" below.

## Implemented layers

| Security Layer         | Implementation                                                                              | Status |
|------------------------|---------------------------------------------------------------------------------------------|--------|
| Symbol obfuscation     | ConfuserEx `rename` protection (decodable mode)                                             | Build pipeline, run `build-protected.ps1` |
| Control-flow obfuscation | ConfuserEx `ctrl flow`                                                                    | Build pipeline |
| String encryption      | ConfuserEx `constants`                                                                      | Build pipeline |
| Resource encryption    | ConfuserEx `resources`                                                                      | Build pipeline |
| Code virtualization    | **Not implemented** — would require commercial tooling (VMProtect / Themida / Eziriz .NET Reactor) | Documented below |
| Anti-debugging         | `AntiTamper.cs` — managed + native debugger checks, hostile process list, watchdog timer    | Active in Release, bypassed in `TS_DEV` |
| Anti-tampering (binary) | ConfuserEx `anti tamper` + `anti ildasm`                                                   | Build pipeline |
| Anti-dump              | ConfuserEx `anti dump`                                                                      | Build pipeline |
| Anti-injection         | Process scan (Scylla, pe-sieve, Frida detected)                                             | Active |
| Settings file integrity | HMAC-SHA256 of JSON body, key derived from install secret                                  | Active |
| Authentication         | Install-register → DPAPI-encrypted `(installId, installSecret)` → every request signed      | Active |
| Server-side auth check  | `verifySignedRequest` — HMAC verify + nonce cache + install revocation check               | Active |
| Rate limiting          | DB-backed fixed window on `(bucket, subject)` for all loader endpoints                      | Active |
| License revocation     | `POST /api/install/revoke` sets `revoked_at`; next signed call from install returns 403     | Active |
| TLS cert pinning       | SPKI pin against ISRG Root X1 + X2 on `tempspoofer.com` only                                | Active |
| Replay protection      | Server nonce cache (`ts_request_nonces`, 10-min TTL, unique index)                          | Active |
| Clock-skew enforcement | 60-second window on `X-TS-Timestamp`                                                        | Active |

## Not covered (be honest about this)

- **True code virtualization.** A custom VM interpreter in .NET is implementable
  but any .NET VM you write is itself debuggable — this is why commercial
  tools write theirs in native. I didn't want to ship a theatre version.
  Recommended: buy **Eziriz .NET Reactor** or **VMProtect Ultimate** and run
  it against `loader.exe` after `build-protected.ps1`. Both support WPF/net48.
- **Full binary hardening against VMProtect/Themida unpacking.** Same answer.
- **Hardware-bound licensing.** Install identity is tied to the Windows user
  (DPAPI scope: CurrentUser), not to hardware. A disk clone would carry the
  install over. If you need hardware binding, derive the install secret from
  a TPM-attested key; requires a native helper component.
- **Admin-user detection / UAC elevation checks.** Deliberately not blocking
  elevated execution since your legitimate spoof engines will need it.
- **Automatic kill-switch on CI/Vercel outage.** Loader currently fails open if
  the API is unreachable (returns "Install registration failed" to the user).
  Whether to flip this to fail-closed is a product call, not a code call.
- **Signed loader binaries (Authenticode).** Requires a code-signing cert.
  Buy one, then add `signtool.exe` to `build-protected.ps1`.

## Operating procedure

**Normal development:** `dotnet build -c Debug` — anti-tamper is compiled out
via `TS_DEV`, debuggers attach cleanly, everything is renamed with original
symbols so stack traces are readable.

**Release build:** `pwsh ./build-protected.ps1` — produces obfuscated binaries
in `web/public/loader.exe` and `web/public/loader-reseller.exe`. Requires
ConfuserEx installed per the header of that script.

**Revoke a compromised install:** 

```bash
curl -X POST https://tempspoofer.com/api/install/revoke \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"installId":"<the-id>"}'
```

The next signed call from that install returns 403 and the loader surfaces
"Install revoked" to the user.

**Kill-switch a released version:** edit
`web/public/versions/VERSIONS.json`, set `"blocked": true` on the row, commit.
Both `/api/versions` and `/loader/v/[codename]` honor it immediately.

## Rotating the pinned TLS root

Let's Encrypt root rotations are rare but happen. When ISRG Root X3 ships,
add its SPKI hash to `loader/SignedHttp.cs:PinnedRootSpki`. Pin accepts the
old AND new roots during the transition window.
