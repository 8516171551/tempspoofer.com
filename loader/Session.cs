namespace TemporarySpoofer;

// Singleton holding the live API client between the Login window and the
// Main window. WPF apps don't have an easy "pass data between windows"
// idiom; this is the cheapest clean one.

public static class Session
{
    public static ApiClient? Api { get; set; }
    public static string? Email  { get; set; }
}
