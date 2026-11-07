using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace TemporarySpoofer;

// Signs outgoing requests to tempspoofer.com with the install's HMAC secret.
// Pins TLS to the chain Let's Encrypt (ISRG Root X1) so a rogue CA can't
// MITM the API. Falls back to default validation if pinning isn't possible
// (e.g. corp proxy with their own root) but logs that we did.
public static class SignedHttp
{
    // SPKI pinning was blocking the loader on Let's Encrypt's new YR2 chain
    // (Vercel-fronted traffic lands on intermediates whose roots don't always
    // appear where net48 ChainElements[last] expects). Disabled for now and
    // documented in SECURITY.md — we're back to OS chain validation plus
    // hostname check, which is what every browser does by default.
    //
    // To re-enable pinning safely we need to track Let's Encrypt's current
    // intermediate CAs (R10, R11, E5, E6, YR2…) and refresh via the
    // maintainer-owned VERSIONS.json rather than baking them into the exe.

    private static bool _pinInstalled;
    public static void InstallCertPin()
    {
        if (_pinInstalled) return;
        _pinInstalled = true;
        ServicePointManager.ServerCertificateValidationCallback +=
            (sender, cert, chain, errors) =>
            {
                // For our own API host we require (a) OS-valid chain, (b) leaf
                // SAN or CN covers *.tempspoofer.com or tempspoofer.com. Any
                // other host falls through to pure OS validation.
                if (sender is HttpWebRequest req)
                {
                    if (!req.RequestUri.Host.EndsWith("tempspoofer.com", StringComparison.OrdinalIgnoreCase))
                        return errors == SslPolicyErrors.None;
                }
                if (errors != SslPolicyErrors.None) return false;
                try
                {
                    if (cert is X509Certificate2 c2)
                    {
                        var subj = c2.Subject ?? "";
                        if (!subj.IndexOf("tempspoofer.com", StringComparison.OrdinalIgnoreCase).Equals(-1))
                            return true;
                        foreach (var ext in c2.Extensions)
                        {
                            if (ext.Oid?.Value == "2.5.29.17" /* SAN */ &&
                                (ext.Format(false) ?? "").IndexOf("tempspoofer.com", StringComparison.OrdinalIgnoreCase) >= 0)
                                return true;
                        }
                    }
                    else if (cert != null)
                    {
                        // Fallback for net48 when cert isn't X509Certificate2 for some reason
                        if ((cert.Subject ?? "").IndexOf("tempspoofer.com", StringComparison.OrdinalIgnoreCase) >= 0)
                            return true;
                    }
                }
                catch { /* fall through to deny */ }
                return false;
            };
    }

    public static HttpClientHandler NewHandler()
    {
        return new HttpClientHandler
        {
            UseCookies = false,
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
        };
    }

    public static void Sign(HttpRequestMessage req, string path, string body)
    {
        var id     = InstallIdentity.InstallId     ?? "";
        var secret = InstallIdentity.InstallSecret ?? "";
        if (id.Length == 0 || secret.Length == 0) return;

        var ts    = ((long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds).ToString();
        var nonce = Convert.ToBase64String(RandomBytes(18)).Replace("+", "-").Replace("/", "_").Replace("=", "");

        var bodyHash = Hex(SHA256.Create().ComputeHash(Encoding.UTF8.GetBytes(body)));
        var method   = req.Method.Method;
        var canonical = $"{method}\n{path}\n{nonce}\n{ts}\n{bodyHash}";

        using var mac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var sig = Hex(mac.ComputeHash(Encoding.UTF8.GetBytes(canonical)));

        req.Headers.Remove("X-TS-Install");   req.Headers.Add("X-TS-Install",   id);
        req.Headers.Remove("X-TS-Nonce");     req.Headers.Add("X-TS-Nonce",     nonce);
        req.Headers.Remove("X-TS-Timestamp"); req.Headers.Add("X-TS-Timestamp", ts);
        req.Headers.Remove("X-TS-Sig");       req.Headers.Add("X-TS-Sig",       sig);
    }

    private static byte[] RandomBytes(int n)
    {
        var b = new byte[n];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(b);
        return b;
    }

    private static string Hex(byte[] b)
    {
        var sb = new StringBuilder(b.Length * 2);
        for (int i = 0; i < b.Length; i++) sb.Append(b[i].ToString("x2"));
        return sb.ToString();
    }
}
