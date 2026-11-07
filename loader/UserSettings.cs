using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace TemporarySpoofer;

// Per-machine settings file. Lives at %APPDATA%\TemporarySpoofer\settings.json
// so the choice survives the fileless loader swap (the exe itself is wiped
// from disk after launch, but %APPDATA% stays).
//
// Flat JSON, same tiny regex parser the ApiClient uses so we don't drag in
// System.Text.Json or add a NuGet dep.
public sealed class UserSettings
{
    private static readonly string Dir      = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "TemporarySpoofer");
    private static readonly string FilePath = Path.Combine(Dir, "settings.json");

    // Spoof pipeline toggles — keys mirror SpoofEngine.Step.Category.
    public bool SpoofNetwork  { get; set; } = true;
    public bool SpoofStorage  { get; set; } = true;
    public bool SpoofSystem   { get; set; } = true;
    public bool SpoofCache    { get; set; } = true;
    public bool SpoofAudit    { get; set; } = true;
    public bool SpoofVerify   { get; set; } = true;
    public bool SpoofBackup   { get; set; } = true;

    // Spoof mode — affects pacing and depth once real engines land.
    public string Mode = "stealth";  // "stealth" | "turbo" | "cautious"

    // Appearance.
    public string Theme = "default"; // "default" | "midnight" | "ocean" | "amber"

    // Dev options unlock the version pinner.
    public bool DeveloperOptions { get; set; } = false;

    // Pinned release codename. Empty / null means "use the latest binary
    // the server hands out", so a fresh install always lands on latest.
    public string? PinnedVersion { get; set; }

    public static UserSettings Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return new UserSettings();
            var raw = File.ReadAllText(FilePath, Encoding.UTF8);
            // Split off the trailing sig line: last newline-separated chunk
            // starting with "sig:" is the HMAC of everything above it.
            var sigAt = raw.LastIndexOf("\nsig:", StringComparison.Ordinal);
            string text; string? presentedSig = null;
            if (sigAt >= 0)
            {
                text = raw.Substring(0, sigAt);
                presentedSig = raw.Substring(sigAt + "\nsig:".Length).Trim();
            }
            else
            {
                text = raw; // legacy / unsigned — accept but rewrite with sig on save
            }
            // Verify signature if the install identity is known. A mismatch
            // means someone (or something) edited the file by hand: reset to
            // defaults rather than trusting foreign state.
            if (presentedSig != null && !string.IsNullOrEmpty(InstallIdentity.InstallSecret))
            {
                var expect = SignString(text);
                if (!FixedTimeEquals(expect, presentedSig))
                    return new UserSettings();
            }
            var s = new UserSettings
            {
                SpoofNetwork     = Bool(text, "spoofNetwork",     true),
                SpoofStorage     = Bool(text, "spoofStorage",     true),
                SpoofSystem      = Bool(text, "spoofSystem",      true),
                SpoofCache       = Bool(text, "spoofCache",       true),
                SpoofAudit       = Bool(text, "spoofAudit",       true),
                SpoofVerify      = Bool(text, "spoofVerify",      true),
                SpoofBackup      = Bool(text, "spoofBackup",      true),
                Mode             = Str(text, "mode", "stealth")!,
                Theme            = Str(text, "theme", "default")!,
                DeveloperOptions = Bool(text, "developerOptions", false),
                PinnedVersion    = Str(text, "pinnedVersion", null),
            };
            return s;
        }
        catch { return new UserSettings(); }
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Dir);
            var sb = new StringBuilder(512);
            sb.Append('{');
            Append(sb, "spoofNetwork",     SpoofNetwork);
            Append(sb, "spoofStorage",     SpoofStorage);
            Append(sb, "spoofSystem",      SpoofSystem);
            Append(sb, "spoofCache",       SpoofCache);
            Append(sb, "spoofAudit",       SpoofAudit);
            Append(sb, "spoofVerify",      SpoofVerify);
            Append(sb, "spoofBackup",      SpoofBackup);
            Append(sb, "mode",             Mode);
            Append(sb, "theme",            Theme);
            Append(sb, "developerOptions", DeveloperOptions);
            Append(sb, "pinnedVersion",    PinnedVersion);
            if (sb[sb.Length - 1] == ',') sb.Length--;
            sb.Append('}');
            var payload = sb.ToString();
            var toWrite = payload + "\nsig:" + SignString(payload);
            File.WriteAllText(FilePath, toWrite, Encoding.UTF8);
        }
        catch { /* best-effort; a corrupt file simply resets to defaults next launch */ }
    }

    public bool IsCategoryEnabled(string category) => category switch
    {
        "Network" => SpoofNetwork,
        "Storage" => SpoofStorage,
        "System"  => SpoofSystem,
        "Cache"   => SpoofCache,
        "Audit"   => SpoofAudit,
        "Verify"  => SpoofVerify,
        "Backup"  => SpoofBackup,
        _          => true,
    };

    private static bool Bool(string json, string key, bool fallback)
    {
        var v = Json.Field(json, key);
        return v is null ? fallback : v.Equals("true", StringComparison.OrdinalIgnoreCase);
    }
    private static string? Str(string json, string key, string? fallback) =>
        Json.Field(json, key) ?? fallback;

    private static void Append(StringBuilder sb, string key, bool v)
        => sb.Append('"').Append(key).Append("\":").Append(v ? "true" : "false").Append(',');
    private static void Append(StringBuilder sb, string key, string? v)
    {
        if (v is null) { sb.Append('"').Append(key).Append("\":null,"); return; }
        sb.Append('"').Append(key).Append("\":\"").Append(Json.Escape(v)).Append("\",");
    }

    private static string SignString(string s)
    {
        var key = InstallIdentity.DeriveKey("settings.v1");
        using var h = new HMACSHA256(key);
        var sig = h.ComputeHash(Encoding.UTF8.GetBytes(s));
        var hex = new StringBuilder(sig.Length * 2);
        for (int i = 0; i < sig.Length; i++) hex.Append(sig[i].ToString("x2"));
        return hex.ToString();
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a is null || b is null || a.Length != b.Length) return false;
        int diff = 0;
        for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
        return diff == 0;
    }
}
