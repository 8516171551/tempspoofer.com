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

        var handler = new HttpClientHandler
        {
            UseCookies = false,
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(BaseUrl) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/2.0");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<AuthResult> AuthByIpAsync()
    {
        try
        {
            var res = await _http.GetAsync("/api/auth/ip").ConfigureAwait(false);
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
            var payload = "{\"key\":\"" + Json.Escape(key) + "\"}";
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var res = await _http.PostAsync("/api/licenses/validate", content).ConfigureAwait(false);
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
            var payload = key == null ? "{}" : "{\"key\":\"" + Json.Escape(key) + "\"}";
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var res = await _http.PostAsync("/api/licenses/claim", content).ConfigureAwait(false);
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
