using System.Diagnostics;
using System.IO;
using System.Net.Http;

namespace TemporarySpoofer;

// Version-pinning plumbing. If the user has pinned a non-current release via
// Settings > Developer Options, we download that archived binary and re-launch
// into it before showing any UI. Everything the pinned exe runs after that is
// genuinely the old version's logic — we're not simulating anything.
public static class VersionManager
{
    public sealed class Entry
    {
        public string Codename    = "";
        public string ReleasedUtc = "";
        public bool   Blocked     = false;
        public bool   IsLatest    = false;
    }

    public static async Task<IReadOnlyList<Entry>> ListAsync()
    {
        try
        {
            using var http = new HttpClient { BaseAddress = new Uri(ApiClient.BaseUrl) };
            http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/2.0");
            var text = await http.GetStringAsync("/api/versions").ConfigureAwait(false);
            return ParseList(text);
        }
        catch { return Array.Empty<Entry>(); }
    }

    // Returns true when the loader relaunched into a pinned version. The caller
    // should exit the current process immediately after.
    public static async Task<bool> MaybeRelaunchIntoPinnedAsync(UserSettings s)
    {
        var pin = s.PinnedVersion?.Trim();
        if (string.IsNullOrEmpty(pin)) return false;
        if (string.Equals(pin, Build.Codename, StringComparison.OrdinalIgnoreCase)) return false;

        // Confirm the pinned version is still listed and not blocked. A blocked
        // version falls back to latest (we clear the pin so this doesn't loop).
        var list = await ListAsync().ConfigureAwait(false);
        var entry = list.FirstOrDefault(e => string.Equals(e.Codename, pin, StringComparison.OrdinalIgnoreCase));
        if (entry is null || entry.Blocked)
        {
            s.PinnedVersion = null;
            s.Save();
            return false;
        }

        try
        {
            var dir = Path.Combine(Path.GetTempPath(), "ts_v_" + Guid.NewGuid().ToString("N").Substring(0, 8));
            Directory.CreateDirectory(dir);
            var exe = Path.Combine(dir, "loader.exe");

            using (var http = new HttpClient { BaseAddress = new Uri(ApiClient.BaseUrl) })
            {
                http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/2.0");
                // Reseller build downloads reseller archive, consumer downloads consumer.
                var path = IsResellerBuild()
                    ? $"/loader/v/{Uri.EscapeDataString(entry.Codename)}-reseller"
                    : $"/loader/v/{Uri.EscapeDataString(entry.Codename)}";
                using var res = await http.GetAsync(path).ConfigureAwait(false);
                if (!res.IsSuccessStatusCode) return false;
                using var fs = File.Create(exe);
                await res.Content.CopyToAsync(fs).ConfigureAwait(false);
            }

            Process.Start(new ProcessStartInfo { FileName = exe, WorkingDirectory = dir, UseShellExecute = false });
            return true;
        }
        catch { return false; }
    }

    // #if RESELLER gets the reseller build, consumer otherwise. The Session's
    // LicenseKey field is populated only after login in the reseller build; we
    // need the build identity BEFORE login, so use a compile constant.
    private static bool IsResellerBuild()
    {
#if RESELLER
        return true;
#else
        return false;
#endif
    }

    private static List<Entry> ParseList(string json)
    {
        // Expect: {"versions":[{"codename":"ECLIPSE","releasedUtc":"2026-11-07","blocked":false,"latest":true}, ...]}
        var list = new List<Entry>();
        // Split on outer `}` of each object inside the array to feed Json.Field.
        int start = json.IndexOf("[");
        int end   = json.LastIndexOf("]");
        if (start < 0 || end < 0 || end <= start) return list;
        var arr = json.Substring(start + 1, end - start - 1);

        int depth = 0; int objStart = -1;
        for (int i = 0; i < arr.Length; i++)
        {
            char c = arr[i];
            if (c == '{') { if (depth == 0) objStart = i; depth++; }
            else if (c == '}')
            {
                depth--;
                if (depth == 0 && objStart >= 0)
                {
                    var obj = arr.Substring(objStart, i - objStart + 1);
                    var cn = Json.Field(obj, "codename");
                    if (!string.IsNullOrEmpty(cn))
                    {
                        list.Add(new Entry
                        {
                            Codename    = cn!,
                            ReleasedUtc = Json.Field(obj, "releasedUtc") ?? "",
                            Blocked     = string.Equals(Json.Field(obj, "blocked"), "true", StringComparison.OrdinalIgnoreCase),
                            IsLatest    = string.Equals(Json.Field(obj, "latest"),  "true", StringComparison.OrdinalIgnoreCase),
                        });
                    }
                    objStart = -1;
                }
            }
        }
        return list;
    }
}
