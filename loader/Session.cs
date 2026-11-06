namespace TemporarySpoofer;

// Carries the validated license key (and shared ApiClient) from the
// LoginWindow into the MainWindow so the user doesn't have to re-enter it.

public static class Session
{
    public static ApiClient Api { get; } = new();
    public static string LicenseKey { get; set; } = "";
    public static string Tier       { get; set; } = "";
    public static string Status     { get; set; } = "";
    public static string? ExpiresAt { get; set; }
}
