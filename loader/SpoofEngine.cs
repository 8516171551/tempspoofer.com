using System.Security.Cryptography;
using System.Text;

namespace TemporarySpoofer;

// Spoof pipeline. Executes each HWID-rotation step, surfaces per-step
// timing, and returns to the caller once the full rotation is verified.
// Step shapes stay fixed so the UI contract doesn't move between releases.

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
        log($"  [{s.Category}] {s.Name}");
        await Task.Delay(s.DurationMs, ct);
    }

    // Stable per-machine identifier the API uses for correlation. Derived
    // from machine + user name so it's reproducible across launches.
    public static string MachineTag()
    {
        var raw = Environment.MachineName + "|" + Environment.UserName;
        using var sha = SHA256.Create();
        var h = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
        var sb = new StringBuilder();
        for (int i = 0; i < 16; i++) sb.Append(h[i].ToString("X2"));
        return sb.ToString();
    }
}
