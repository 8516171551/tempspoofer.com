using System.IO;
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

    private readonly CookieContainer _jar = new();
    private readonly HttpClient _http;

    public ApiClient()
    {
        var handler = new HttpClientHandler
        {
            CookieContainer = _jar,
            UseCookies = true,
            AutomaticDecompression = DecompressionMethods.All,
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(BaseUrl) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("TemporarySpooferLoader/1.0");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<LoginResult> LoginAsync(string email, string password)
    {
        var res = await _http.PostAsJsonAsync("/api/auth/login", new { email, password });
        if (res.IsSuccessStatusCode) return new LoginResult(true, null);
        var body = await SafeRead(res);
        return new LoginResult(false, body?.Error ?? $"HTTP {(int)res.StatusCode}");
    }

    public async Task<ClaimResult> ClaimAsync(string key, string hwid)
    {
        var res = await _http.PostAsJsonAsync("/api/licenses/claim", new { key, hwid });
        var body = await SafeRead(res);
        if (!res.IsSuccessStatusCode)
        {
            return new ClaimResult(false, body?.Error ?? $"HTTP {(int)res.StatusCode}", null);
        }
        return new ClaimResult(true, null, body?.ExpiresAt);
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
    }
}

public readonly record struct LoginResult(bool Ok, string? Error);
public readonly record struct ClaimResult(bool Ok, string? Error, string? ExpiresAt);
