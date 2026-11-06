namespace TemporarySpoofer;

public enum AuthMode
{
    Ip,       // consumer build; license identified by caller IP
    Key,      // reseller build; license identified by pasted key
}

public static class Session
{
    public static ApiClient Api { get; } = new();

    // In Key mode, holds the pasted license. In Ip mode, left blank.
    public static string? LicenseKey { get; set; }

    public static string Tier       { get; set; } = "";
    public static string Status     { get; set; } = "";
    public static string? ExpiresAt { get; set; }
    public static string? Ip        { get; set; }
}
