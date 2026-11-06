// License keys look like TS-XXXX-XXXX-XXXX-XXXX (crockford base32, no 0/O/I/L).
const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function group(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const r = Math.floor(Math.random() * ALPHA.length);
    s += ALPHA[r];
  }
  return s;
}

export function newLicenseKey(): string {
  return `TS-${group()}-${group()}-${group()}-${group()}`;
}
