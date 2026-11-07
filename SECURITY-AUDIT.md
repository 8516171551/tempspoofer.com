# Security Audit — DAWN release (2026-11-07)

Ran a multi-tool reversal and auth-layer attack pass against the shipped
`loader.exe` and the `tempspoofer.com` API. This document records what
was tried, what passed, what failed, and what to do about the failures.

## Tools used

| Tool                     | Version | Role                                        |
|--------------------------|---------|---------------------------------------------|
| dnSpyEx                  | 6.6.0   | Managed decompilation, metadata inspection  |
| dnlib (via Confuser pkg) | 4.5     | Scripted metadata dump + string-constant sweep |
| de4dot (ViRb3 cex fork)  | 4.0.0   | ConfuserEx-aware deobfuscator               |
| Python / `re`            | 3.12    | Raw PE strings scan (ASCII + UTF-16)        |
| curl + hmac              | —       | Signed-request forgery / replay suite       |

## 1. Binary protection — what survived

| Attack                                           | Result                                                                                    |
|--------------------------------------------------|-------------------------------------------------------------------------------------------|
| `dnlib` metadata dump of shipped exe             | `TemporarySpoofer` namespace holds **0** of the 19 source-level types (all renamed away)  |
| Readable `ldstr` constants in shipped exe        | **0**                                                                                     |
| Grep hostile-process kill-list (`dnspy`, `frida`, `scylla`, `cheatengine`) | **No hits** — constants layer encrypts them    |
| de4dot auto-detect                               | `Unknown Obfuscator` (needs explicit `-p crx`)                                            |
| de4dot `-p crx` default                          | Produces 223 KB "cleaned" exe but `TypeLoadException: smethod_0 no RVA` → **won't run**  |
| de4dot `-p crx --strtyp emulate`                 | Same breakage; still **0 readable strings** decrypted                                     |
| Raw PE strings for secrets                       | Only framework type names (`HMACSHA256`, `ProtectedData`) + public API host leak — no credentials, no keys |

**Verdict:** a casual attacker opening the exe in dnSpy sees mangled names, zero readable strings, and control-flow-flattened methods. A determined attacker running de4dot gets a non-executing ghost; recovering a working crack requires manually fixing anti-tamper stub resolution. That is NOT impossible, but it is hours of work rather than minutes.

## 2. Server auth layer — attack matrix

Every loader-facing endpoint requires a signed request: HMAC-SHA256 over
`METHOD\nPATH\nNONCE\nTIMESTAMP\nSHA256(body)` with the install's secret.

| Attack                                            | Endpoint                   | Expected    | Actual      |
|---------------------------------------------------|----------------------------|-------------|-------------|
| Unsigned GET                                      | `/api/auth/ip`             | 401         | **401** ✓   |
| Unsigned POST                                     | `/api/licenses/validate`   | 401         | **401** ✓   |
| Signed with fabricated installId                  | `/api/auth/ip`             | 401         | **401** ✓   |
| Replay of a legitimately-signed request (same nonce) | `/api/auth/ip`          | 409 Replay  | **409 Replay detected** ✓ |
| Body tamper (sign `{"key":"A"}`, send `{"key":"B"}`) | `/api/licenses/validate` | 401 Bad sig | **401 Bad signature** ✓   |
| Stale timestamp (10 minutes old)                  | `/api/auth/ip`             | 401 Expired | **401 Request expired** ✓ |
| Anonymous admin bootstrap                         | `/api/bootstrap`           | 403         | **403** ✓   |
| Anonymous install revoke                          | `/api/install/revoke`      | 403         | **403** ✓   |

**Verdict:** server-side auth is tight. No endpoint grants access to an attacker
who hasn't gone through `POST /api/install/register` to earn a per-install
secret, and even then every request is nonce-bound (one-shot) and body-bound
(any tamper fails HMAC).

## 3. What's NOT covered — honest limits

- **ConfuserEx v1.6 is the free tier.** A paid protector (Eziriz .NET Reactor,
  VMProtect, Themida) would add native-virtualized VM opcodes that make
  static analysis orders of magnitude harder. Our ConfuserEx layer stops
  script-kid cracking. It does not stop a dedicated professional with a
  day to burn on manually reconstructing the anti-tamper stub.

- **No Authenticode signing on the loader exe.** Windows SmartScreen will warn
  on first run. Buying a code-signing cert ($80–400/yr) + wiring `signtool`
  into `build-protected.ps1` is a one-hour job.

- **Rate-limit buckets are per-IP + per-install, not per-account.** An
  attacker with a VPN pool can register N installs/hr/IP (currently capped
  at 5). That's deliberate — a legitimate user behind CGNAT needs headroom.

- **Install secret is stored as plaintext in the `ts_installs.secret_hash`
  column** (column name kept for migration; actual value is the signing
  secret). A DB leak invalidates existing installs but doesn't let the
  attacker forge new ones without ALSO writing to the DB.

## 4. Repro — how to re-run this audit

```bash
# Install the tools (one-time)
pwsh ./build-protected.ps1              # downloads ConfuserEx if missing

# Run de4dot against the shipped binary
cp web/public/loader.exe attack/loader-shipped.exe
tools/de4dot/de4dot-x64.exe attack/loader-shipped.exe -p crx --strtyp emulate

# Inspect what came out
# (see dnlib script embedded in this doc's commit — scripts/audit-strings.ps1)

# Run the API attack suite
./scripts/audit-api.sh
```

## 5. Next steps if you want to raise the bar further

1. Add Authenticode signing — removes SmartScreen friction and adds a second
   anti-tamper signal (any bit flip breaks the signature).
2. Buy Eziriz .NET Reactor and chain it after ConfuserEx — its virtualization
   genuinely stops de4dot cold.
3. Add a kill-switch poll: loader checks `/api/kill-switch/{installId}` once
   per minute; server returns a flag that forces exit.
4. Rotate install secrets on a schedule (e.g. every 30 days) — forces an
   attacker who exfiltrated one installer's DPAPI-decrypted secret to
   re-exfil regularly.
5. Add a server-side IP-geovelocity check — if the same installId calls
   from two countries in <1h, auto-revoke.
