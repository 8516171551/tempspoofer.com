using System.Security.Cryptography;
using System.Text;

namespace TemporarySpoofer;

// Mock spoof pipeline. By design this touches ZERO Windows identifiers.
// Each step is a labeled async delay with a log line, so the UI can play
// the "spoofing" animation on any machine (including the maintainer's)
// without altering a single byte of HWID, MAC, SMBIOS, disk serial, etc.
//
// Replace Step.Execute bodies with real implementations once the binary
// is cleared for VM testing by the owner. Keep the shape identical so
// the UI doesn't have to change.

public static class SpoofEngine
{
    public sealed record Step(string Name, string Category, int DurationMs);

    public static IReadOnlyList<Step> GetSteps() => new Step[]
    {
        new Step("Collecting fingerprint",       "Audit",    420),
        new Step("Snapshotting registry hives",  "Backup",   560),
        new Step("Rotating MAC identifier",      "Network",  610),
        new Step("Rotating disk serial",         "Storage",  720),
        new Step("Rotating SMBIOS GUID",         "System",   680),
        new Step("Rotating TPM endorsement",     "System",   540),
        new Step("Rotating machine SID",         "System",   460),
        new Step("Flushing identifier cache",    "Cache",    380),
        new Step("Patching telemetry queue",     "Network",  320),
        new Step("Re-fingerprinting",            "Audit",    450),
        new Step("Verifying rotation",           "Verify",   520),
    };

    public static async Task ExecuteAsync(Step s, Action<string> log, CancellationToken ct = default)
    {
        // DO NOT WRITE TO HARDWARE. This method is intentionally a timed no-op.
        log($"  [{s.Category}] {s.Name}");
        await Task.Delay(s.DurationMs, ct);
    }

    // Generates a stable per-machine placeholder HWID the API can accept
    // without reading anything privileged. SHA-256 of machine name +
    // user name is plenty for a mock.
    public static string FakeHwid()
    {
        var raw = Environment.MachineName + "|" + Environment.UserName;
        using var sha = SHA256.Create();
        var h = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
        var sb = new StringBuilder();
        for (int i = 0; i < 16; i++) sb.Append(h[i].ToString("X2"));
        return sb.ToString();
    }
}
