using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace TemporarySpoofer;

// Persistent per-machine (installId, installSecret) pair. First launch calls
// POST /api/install/register which mints the pair; subsequent launches read
// it back. Stored DPAPI-encrypted under the current user so copying the file
// to another machine won't decrypt it — ties the install to this Windows
// account too, which is exactly what we want for a locally-run loader.
public static class InstallIdentity
{
    private static readonly string Dir  = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "TemporarySpoofer");
    private static readonly string File = Path.Combine(Dir, ".install");

    public static string? InstallId     { get; private set; }
    public static string? InstallSecret { get; private set; }

    public static bool TryLoad()
    {
        try
        {
            if (!System.IO.File.Exists(File)) return false;
            var cipher = System.IO.File.ReadAllBytes(File);
            var plain  = ProtectedData.Unprotect(cipher, null, DataProtectionScope.CurrentUser);
            var line   = Encoding.UTF8.GetString(plain);
            var parts  = line.Split('|');
            if (parts.Length != 2) return false;
            if (parts[0].Length < 16 || parts[1].Length < 32) return false;
            InstallId     = parts[0];
            InstallSecret = parts[1];
            return true;
        }
        catch { return false; }
    }

    public static void Save(string installId, string installSecret)
    {
        try
        {
            Directory.CreateDirectory(Dir);
            var plain  = Encoding.UTF8.GetBytes(installId + "|" + installSecret);
            var cipher = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
            System.IO.File.WriteAllBytes(File, cipher);
            try { System.IO.File.SetAttributes(File, FileAttributes.Hidden); } catch { }
            InstallId     = installId;
            InstallSecret = installSecret;
        }
        catch { /* best-effort — a failure means next launch re-registers */ }
    }

    // Derive a stable settings-signing key from the install secret so a
    // tampered settings.json can be detected on load.
    public static byte[] DeriveKey(string purpose)
    {
        if (string.IsNullOrEmpty(InstallSecret))
            return new byte[32]; // all-zero when uninitialized; signature verify will fail
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(InstallSecret!));
        return h.ComputeHash(Encoding.UTF8.GetBytes(purpose));
    }
}
