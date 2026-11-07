namespace TemporarySpoofer;

// Baked-in release identity. The VERSION tile and the version-pinning
// comparison both read Codename from here. Bump on every binary release;
// the GitHub Action archives the resulting exe under this name.
public static class Build
{
    public const string Codename    = "VAULT";
    public const string ReleasedUtc = "2026-11-07";
}
