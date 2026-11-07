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
    // SPKI SHA-256 of ISRG Root X1 (Let's Encrypt). If LE ever rotates roots
    // we add the new one here; both are accepted.
    private static readonly HashSet<string> PinnedRootSpki = new(StringComparer.OrdinalIgnoreCase)
    {
        "C45D7BB08E6D67E62E4235110B564E5F78FD92EF058C840AEA4E6455D7585C60", // ISRG Root X1
        "8ECDE6884F3D87B1125BA31AC3FCB13D7016DE7F57CC904FE1CB97C6AE98196E", // ISRG Root X2
    };

    // Install once at process start (net48 uses the global callback hook).
    // Only enforces the pin for tempspoofer.com; other hosts fall through to
    // default OS chain validation so legitimate corporate TLS still works.
    private static bool _pinInstalled;
    public static void InstallCertPin()
    {
        if (_pinInstalled) return;
        _pinInstalled = true;
        ServicePointManager.ServerCertificateValidationCallback +=
            (sender, cert, chain, errors) =>
            {
                if (sender is HttpWebRequest req && !req.RequestUri.Host.EndsWith("tempspoofer.com", StringComparison.OrdinalIgnoreCase))
                    return errors == SslPolicyErrors.None; // default-validate other hosts
                if (errors != SslPolicyErrors.None) return false;
                if (chain is null || chain.ChainElements.Count == 0) return false;
                try
                {
                    var root = chain.ChainElements[chain.ChainElements.Count - 1].Certificate;
                    var spki = SHA256.Create().ComputeHash(root.GetPublicKey());
                    var hex  = BitConverter.ToString(spki).Replace("-", "");
                    return PinnedRootSpki.Contains(hex);
                }
                catch { return false; }
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
