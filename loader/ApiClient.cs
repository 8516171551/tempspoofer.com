using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TemporarySpoofer;

// No cookies, no sessions. A license key is the only auth the loader
// needs — we POST it with the machine's fake HWID to /api/licenses/claim
// and the server decides whether to activate.

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
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/1.0");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<ClaimResult> ClaimAsync(string key, string hwid)
    {
        var res = await _http.PostAsJsonAsync("/api/licenses/claim", new { key, hwid });
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
    }
}

public readonly record struct ClaimResult(bool Ok, string? Error, string? ExpiresAt, string? Tier);
