using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TemporarySpoofer;

public sealed class ApiClient
{
    public const string BaseUrl = "https://tempspoofer.com";

    private readonly HttpClient _http;

    public ApiClient()
    {
        var handler = new HttpClientHandler
        {
            UseCookies = false,
            AutomaticDecompression = DecompressionMethods.All,
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(BaseUrl) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/1.1");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // Consumer auto-login: server resolves the license from the caller IP.
    public async Task<AuthResult> AuthByIpAsync()
    {
        var res = await _http.GetAsync("/api/auth/ip");
        var body = await SafeRead(res);
        if (!res.IsSuccessStatusCode)
        {
            return new AuthResult(false, body?.Error ?? $"HTTP {(int)res.StatusCode}", null, null, null, null);
        }
        return new AuthResult(true, null, body?.Tier, body?.Status, body?.ExpiresAt, body?.Ip);
    }

    // Reseller loader: paste a key, we check it exists before letting them in.
    public async Task<AuthResult> ValidateAsync(string key)
    {
        var res = await _http.PostAsJsonAsync("/api/licenses/validate", new { key });
        var body = await SafeRead(res);
        if (!res.IsSuccessStatusCode)
        {
            return new AuthResult(false, body?.Error ?? $"HTTP {(int)res.StatusCode}", null, null, null, null);
        }
        return new AuthResult(true, null, body?.Tier, body?.Status, body?.ExpiresAt, null);
    }

    // Activation. Consumer: no key — IP identifies the row. Reseller: key included.
    public async Task<ClaimResult> ClaimAsync(string? key)
    {
        var res = key is null
            ? await _http.PostAsJsonAsync("/api/licenses/claim", new { })
            : await _http.PostAsJsonAsync("/api/licenses/claim", new { key });
        var body = await SafeRead(res);
        if (!res.IsSuccessStatusCode)
        {
            return new ClaimResult(false, body?.Error ?? $"HTTP {(int)res.StatusCode}", null, null);
        }
        return new ClaimResult(true, null, body?.ExpiresAt, body?.Tier);
    }

    private static async Task<ApiBody?> SafeRead(HttpResponseMessage res)
    {
        try
        {
            var text = await res.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(text)) return null;
            return JsonSerializer.Deserialize<ApiBody>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch { return null; }
    }

    public sealed class ApiBody
    {
        [JsonPropertyName("error")]     public string? Error     { get; set; }
        [JsonPropertyName("expiresAt")] public string? ExpiresAt { get; set; }
        [JsonPropertyName("status")]    public string? Status    { get; set; }
        [JsonPropertyName("tier")]      public string? Tier      { get; set; }
        [JsonPropertyName("ip")]        public string? Ip        { get; set; }
    }
}

public readonly record struct AuthResult(bool Ok, string? Error, string? Tier, string? Status, string? ExpiresAt, string? Ip);
public readonly record struct ClaimResult(bool Ok, string? Error, string? ExpiresAt, string? Tier);
