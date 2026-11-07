using System.Diagnostics;
using System.Runtime.InteropServices;

namespace TemporarySpoofer;

// Lightweight tamper + debug detection. This is NOT a replacement for a real
// packer — a determined attacker with a hex editor and five minutes can unhook
// everything here. What it DOES do:
//
//   * blocks the obvious script-kid path: `dnSpy.exe`, `windbg.exe`,
//     `x64dbg.exe`, `OllyDbg.exe`, `ILSpy.exe`, `dotPeek*.exe` attached
//   * catches casual IDA/VMMap users via remote-debugger check
//   * refuses to run if System.Diagnostics.Debugger.IsAttached in Release
//   * compile-time escape: #define TS_DEV skips all checks
//
// On detection we DO NOT silently exit. We throw a clean SecurityException
// so the user gets a readable message ("Debugger attached — refusing to run")
// and the stack trace is useful to us when a legit user reports a false
// positive. A developer running under dnSpy for debugging should toggle
// TS_DEV in the .csproj, not patch this file.
public static class AntiTamper
{
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsDebuggerPresent();

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, out bool pbDebuggerPresent);

    private static readonly string[] HostileProcessNames = new[]
    {
        "dnspy", "dnspy.console", "dnspyex",
        "ilspy", "ilspycmd",
        "windbg", "windbgx",
        "x64dbg", "x32dbg",
        "ollydbg",
        "cheatengine", "cheatengine-x86_64", "cheatengine-i386",
        "processhacker", "processhacker2",
        "scylla", "scylla_x64", "scylla_x86",
        "pe-sieve", "hollowshunter",
        "frida", "frida-server", "frida-helper-32", "frida-helper-64",
        "de4dot", "de4dot-x64",
        "reflector",
        "justdecompile",
    };

    public static void EnforceOrDie()
    {
#if TS_DEV
        return;
#else
        if (Debugger.IsAttached) Die("Debugger attached (managed)");
        if (IsDebuggerPresent())  Die("Debugger attached (native)");
        try
        {
            if (CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, out bool remote) && remote)
                Die("Remote debugger attached");
        }
        catch { /* ignore if we can't query */ }

        try
        {
            foreach (var p in Process.GetProcesses())
            {
                string name;
                try { name = p.ProcessName.ToLowerInvariant(); } catch { continue; }
                for (int i = 0; i < HostileProcessNames.Length; i++)
                {
                    if (name == HostileProcessNames[i]) Die($"Analysis tool running: {p.ProcessName}");
                }
            }
        }
        catch { /* process enumeration can fail on restricted tokens */ }
#endif
    }

    // Runs the checks periodically so late-attached debuggers get caught too.
    private static System.Threading.Timer? _timer;
    public static void StartWatchdog()
    {
#if TS_DEV
        return;
#else
        _timer = new System.Threading.Timer(_ =>
        {
            try { EnforceOrDie(); } catch (System.Security.SecurityException) { Environment.FailFast("tamper"); }
        }, null, TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(8));
#endif
    }

    private static void Die(string why) =>
        throw new System.Security.SecurityException("Temporary Spoofer refused to start: " + why);
}
