using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;

namespace TemporarySpoofer;

// net48-friendly HTTP client. No System.Text.Json / Http.Json dependency —
// the API only ever returns flat JSON with half a dozen string fields, so
// a tiny regex extractor is enough and keeps the loader exe at ~500 KB.
public sealed class ApiClient
{
    public const string BaseUrl = "https://tempspoofer.com";
    private readonly HttpClient _http;

    public ApiClient()
    {
        // Force TLS 1.2/1.3 — net48 defaults to older protocols that tempspoofer.com refuses.
        try { ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12; } catch { }
        try { ServicePointManager.SecurityProtocol |= (SecurityProtocolType)12288; /* Tls13 */ } catch { }
        SignedHttp.InstallCertPin();

        _http = new HttpClient(SignedHttp.NewHandler()) { BaseAddress = new Uri(BaseUrl) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/2.0");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // Must succeed before any signed call. Reads cached (installId, secret)
    // from DPAPI storage; if missing, mints a fresh pair via POST /api/install/register.
    public async Task<bool> EnsureRegisteredAsync()
    {
        if (InstallIdentity.TryLoad()) return true;
        try
        {
            using var content = new StringContent("{}", Encoding.UTF8, "application/json");
            var res = await _http.PostAsync("/api/install/register", content).ConfigureAwait(false);
            var text = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (!res.IsSuccessStatusCode) return false;
            var id  = Json.Field(text, "installId");
            var sec = Json.Field(text, "installSecret");
            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(sec)) return false;
            InstallIdentity.Save(id!, sec!);
            return true;
        }
        catch { return false; }
    }

    private async Task<HttpResponseMessage> SendSignedAsync(HttpMethod method, string path, string body)
    {
        var req = new HttpRequestMessage(method, path);
        if (body.Length > 0)
            req.Content = new StringContent(body, Encoding.UTF8, "application/json");
        SignedHttp.Sign(req, path, body);
        return await _http.SendAsync(req).ConfigureAwait(false);
    }

    public async Task<AuthResult> AuthByIpAsync()
    {
        try
        {
            if (!await EnsureRegisteredAsync().ConfigureAwait(false))
                return new AuthResult(false, "Install registration failed", null, null, null, null, null);
            var res = await SendSignedAsync(HttpMethod.Get, "/api/auth/ip", "").ConfigureAwait(false);
            var text = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (!res.IsSuccessStatusCode)
                return new AuthResult(false, Json.Field(text, "error") ?? $"HTTP {(int)res.StatusCode}", null, null, null, null, null);
            return new AuthResult(true, null,
                Json.Field(text, "tier"),
                Json.Field(text, "status"),
                Json.Field(text, "expiresAt"),
                Json.Field(text, "ip"),
                null);
        }
        catch (Exception ex) { return new AuthResult(false, ex.Message, null, null, null, null, null); }
    }

    public async Task<AuthResult> ValidateAsync(string key)
    {
        try
        {
            if (!await EnsureRegisteredAsync().ConfigureAwait(false))
                return new AuthResult(false, "Install registration failed", null, null, null, null, null);
            var payload = "{\"key\":\"" + Json.Escape(key) + "\"}";
            var res = await SendSignedAsync(HttpMethod.Post, "/api/licenses/validate", payload).ConfigureAwait(false);
            var text = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (!res.IsSuccessStatusCode)
                return new AuthResult(false, Json.Field(text, "error") ?? $"HTTP {(int)res.StatusCode}", null, null, null, null, null);
            return new AuthResult(true, null,
                Json.Field(text, "tier"),
                Json.Field(text, "status"),
                Json.Field(text, "expiresAt"),
                null,
                Json.Field(text, "brand"));
        }
        catch (Exception ex) { return new AuthResult(false, ex.Message, null, null, null, null, null); }
    }

    public async Task<ClaimResult> ClaimAsync(string? key)
    {
        try
        {
            if (!await EnsureRegisteredAsync().ConfigureAwait(false))
                return new ClaimResult(false, "Install registration failed", null, null);
            var payload = key == null ? "{}" : "{\"key\":\"" + Json.Escape(key) + "\"}";
            var res = await SendSignedAsync(HttpMethod.Post, "/api/licenses/claim", payload).ConfigureAwait(false);
            var text = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (!res.IsSuccessStatusCode)
                return new ClaimResult(false, Json.Field(text, "error") ?? $"HTTP {(int)res.StatusCode}", null, null);
            return new ClaimResult(true, null, Json.Field(text, "expiresAt"), Json.Field(text, "tier"));
        }
        catch (Exception ex) { return new ClaimResult(false, ex.Message, null, null); }
    }
}

internal static class Json
{
    private static readonly Regex KeyRe = new(
        "\"(?<k>[A-Za-z_][A-Za-z0-9_]*)\"\\s*:\\s*(?:\"(?<s>(?:[^\"\\\\]|\\\\.)*)\"|null|(?<b>true|false)|(?<n>-?\\d+(?:\\.\\d+)?))",
        RegexOptions.Compiled);

    public static string? Field(string json, string key)
    {
        if (string.IsNullOrEmpty(json)) return null;
        foreach (Match m in KeyRe.Matches(json))
        {
            if (m.Groups["k"].Value != key) continue;
            if (m.Groups["s"].Success) return Unescape(m.Groups["s"].Value);
            if (m.Groups["b"].Success) return m.Groups["b"].Value;
            if (m.Groups["n"].Success) return m.Groups["n"].Value;
            return null; // explicit null
        }
        return null;
    }

    public static string Escape(string s) =>
        s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t");

    private static string Unescape(string s) =>
        s.Replace("\\\"", "\"").Replace("\\\\", "\\").Replace("\\/", "/").Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\t", "\t");
}

public readonly struct AuthResult
{
    public bool    Ok        { get; }
    public string? Error     { get; }
    public string? Tier      { get; }
    public string? Status    { get; }
    public string? ExpiresAt { get; }
    public string? Ip        { get; }
    public string? Brand     { get; }
    public AuthResult(bool ok, string? error, string? tier, string? status, string? expiresAt, string? ip, string? brand)
    { Ok = ok; Error = error; Tier = tier; Status = status; ExpiresAt = expiresAt; Ip = ip; Brand = brand; }
}

public readonly struct ClaimResult
{
    public bool    Ok        { get; }
    public string? Error     { get; }
    public string? ExpiresAt { get; }
    public string? Tier      { get; }
    public ClaimResult(bool ok, string? error, string? expiresAt, string? tier)
    { Ok = ok; Error = error; ExpiresAt = expiresAt; Tier = tier; }
}
