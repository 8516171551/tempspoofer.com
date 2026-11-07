// Lists every archived loader codename, with release date and block flag.
// The loader's Settings > Developer Options reads this to render the
// version-pinning list. Source of truth is web/public/versions/VERSIONS.json
// which is hand-edited per release (or by the GitHub Action once auto-archive
// is wired up).

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface VersionRow {
  codename:    string;
  releasedUtc: string;
  blocked:     boolean;
  notes?:      string;
  latest?:     boolean;
}

export async function GET() {
  try {
    const file = path.join(process.cwd(), "public", "versions", "VERSIONS.json");
    const raw  = await fs.readFile(file, "utf8");
    const doc  = JSON.parse(raw) as { latest?: string; versions: VersionRow[] };
    const latest = doc.latest ?? doc.versions[0]?.codename ?? "";
    const versions = (doc.versions ?? []).map(v => ({
      codename:    v.codename,
      releasedUtc: v.releasedUtc,
      blocked:     !!v.blocked,
      latest:      v.codename === latest,
      notes:       v.notes ?? "",
    }));
    return NextResponse.json({ ok: true, latest, versions }, {
      headers: { "cache-control": "public, max-age=60" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), versions: [] }, { status: 500 });
  }
}
