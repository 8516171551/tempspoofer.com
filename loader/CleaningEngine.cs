using System.Diagnostics;
using System.IO;
using System.Security.Principal;
using Microsoft.Win32;

namespace TemporarySpoofer;

public static class CleaningEngine
{
    private static readonly Random Rng = new();

    public record CleanStep(string Name, string Category, Action<Action<string>> Execute);

    public static List<CleanStep> GetSteps()
    {
        return
        [
            new("Kill Processes", "Processes", KillProcesses),
            new("Stop Services", "Processes", StopServices),
            new("Clean UserAssist", "Registry", CleanUserAssist),
            new("Clean Epic/Fortnite Registry", "Registry", CleanEpicRegistry),
            new("Clean Anti-Cheat Registry", "Registry", CleanAntiCheatRegistry),
            new("Clean DirectInput", "Registry", CleanDirectInput),
            new("Clean MountPoints", "Registry", CleanMountPoints),
            new("Clean Network Cache", "Registry", CleanNetworkCache),
            new("Clean BAM Entries", "Registry", CleanBamEntries),
            new("Clean Fingerprint Values", "Registry", CleanFingerprintValues),
            new("Clean File Classes", "Registry", CleanFileClassValues),
            new("Spoof HWID", "Deep Clean", SpoofHwid),
            new("Clean Windows Temp", "Cache", CleanWindowsTemp),
            new("Clean Prefetch", "Cache", CleanPrefetch),
            new("Clean User Caches", "Cache", CleanUserCaches),
            new("Clean GPU Caches", "Cache", CleanGpuCaches),
            new("Clean Epic/Fortnite Files", "Cache", CleanEpicFiles),
            new("Clean Anti-Cheat Files", "Cache", CleanAntiCheatFiles),
            new("Clean System Logs", "Cache", CleanSystemLogs),
            new("Clean Recycle Bins", "Deep Clean", CleanRecycleBins),
            new("Clean Temp File Extensions", "Deep Clean", CleanTempExtensions),
            new("Disable IPv6", "Network", DisableIpv6),
            new("Disable Activity Tracking", "Network", DisableActivityTracking),
            new("Recreate System Dirs", "Deep Clean", RecreateDirs),
        ];
    }

    static string User => Environment.UserName;
    static string UserProfile => Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    static string LocalAppData => Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
    static string RoamingAppData => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    static string SysDrive => Environment.GetEnvironmentVariable("SystemDrive") ?? "C:";

    static void TryDeleteDir(string path, Action<string> log)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
                log($"  del dir  {path}");
            }
        }
        catch { }
    }

    static void TryDeleteFile(string path, Action<string> log)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
                log($"  del file {path}");
            }
        }
        catch { }
    }

    static void TryDeleteFiles(string dir, string pattern, Action<string> log)
    {
        try
        {
            if (!Directory.Exists(dir)) return;
            foreach (var f in Directory.EnumerateFiles(dir, pattern, SearchOption.AllDirectories))
            {
                try { File.Delete(f); } catch { }
            }
            log($"  cleaned  {dir}\\{pattern}");
        }
        catch { }
    }

    static void TryRegDelete(RegistryKey root, string subkey, Action<string> log)
    {
        try
        {
            root.DeleteSubKeyTree(subkey, false);
            log($"  reg del  {root.Name}\\{subkey}");
        }
        catch { }
    }

    static void TryRegDeleteValue(RegistryKey root, string subkey, string valueName, Action<string> log)
    {
        try
        {
            using var key = root.OpenSubKey(subkey, true);
            if (key != null)
            {
                key.DeleteValue(valueName, false);
                log($"  reg val  {subkey}\\{valueName}");
            }
        }
        catch { }
    }

    static string RandHex(int len)
    {
        var chars = "0123456789ABCDEF";
        return new string(Enumerable.Range(0, len).Select(_ => chars[Rng.Next(chars.Length)]).ToArray());
    }

    static string RandGuid() => Guid.NewGuid().ToString().ToUpper();

    static string RandAlphaNum(int len)
    {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return new string(Enumerable.Range(0, len).Select(_ => chars[Rng.Next(chars.Length)]).ToArray());
    }

    // ── Steps ────────────────────────────────────────────────────────

    static readonly string[] ProcessesToKill =
    [
        "FortniteClient-Win64-Shipping_EAC_EOS", "FortniteClient-Win64-Shipping_BE",
        "FortniteLauncher", "FortniteClient-Win64-Shipping", "EpicGamesLauncher",
        "UnrealCEFSubProcess", "EasyAntiCheat", "nvcontainer", "NVDisplay.Container",
        "NVIDIA Web Helper", "NVIDIA Share", "nvsphelper64", "EpicWebHelper",
        "CEFProcess", "BEService", "BEServices", "BattleEye",
        "PerfWatson2", "vgtray", "OneDrive"
    ];

    static void KillProcesses(Action<string> log)
    {
        foreach (var name in ProcessesToKill)
        {
            try
            {
                foreach (var p in Process.GetProcessesByName(name))
                {
                    try { p.Kill(); log($"  killed   {name}"); } catch { }
                }
            }
            catch { }
        }
    }

    static readonly string[] ServicesToStop =
    [
        "EasyAntiCheat", "FortniteClient-Win64-Shipping_EAC_EOS",
        "FortniteClient-Win64-Shipping_EAC", "FortniteClient-Win64-Shipping_BE",
        "NvContainerLocalSystem", "NVDisplay.ContainerLocalSystem",
        "BattleEye", "BEService"
    ];

    static void StopServices(Action<string> log)
    {
        foreach (var svc in ServicesToStop)
        {
            try
            {
                var psi = new ProcessStartInfo("sc", $"stop \"{svc}\"")
                {
                    CreateNoWindow = true, UseShellExecute = false
                };
                Process.Start(psi)?.WaitForExit(5000);
                log($"  sc stop  {svc}");
            }
            catch { }
        }
    }

    static readonly string[] UserAssistGuids =
    [
        "{FA99DFC7-6AC2-453A-A5E2-5E2AFF4507BD}",
        "{F4E57C4B-2036-45F0-A9AB-443BCFE33D9F}",
        "{F2A1CB5A-E3CC-4A2E-AF9D-505A7009D442}",
        "{CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}",
        "{CAA59E3C-4792-41A5-9909-6A6A8D32490E}",
        "{BCB48336-4DDD-48FF-BB0B-D3190DACB3E2}",
        "{B267E3AD-A825-4A09-82B9-EEC22AA3B847}",
        "{A3D53349-6E61-4557-8FC7-0028EDCEEBF6}",
        "{9E04CAB2-CC14-11DF-BB8C-A2F1DED72085}"
    ];

    static void CleanUserAssist(Action<string> log)
    {
        var basePath = @"Software\Microsoft\Windows\CurrentVersion\Explorer\UserAssist";
        foreach (var guid in UserAssistGuids)
        {
            TryRegDelete(Registry.CurrentUser, $@"{basePath}\{guid}\Count", log);
            TryRegDelete(Registry.CurrentUser, $@"{basePath}\{guid}", log);
        }
        TryRegDelete(Registry.CurrentUser, basePath, log);
    }

    static void CleanEpicRegistry(Action<string> log)
    {
        // HKCU
        string[] hkcuKeys =
        [
            @"Software\Epic Games\Unreal Engine\Identifiers",
            @"Software\Epic Games\Unreal Engine\Hardware Survey",
            @"Software\Epic Games\Unreal Engine",
            @"Software\Epic Games\EpicGamesLauncher",
            @"Software\Epic Games\EOS",
            @"Software\Epic Games",
        ];
        foreach (var k in hkcuKeys)
            TryRegDelete(Registry.CurrentUser, k, log);

        // HKLM
        string[] hklmKeys =
        [
            @"SOFTWARE\Epic Games",
            @"SOFTWARE\EpicGames",
            @"SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS\UserHelper",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS\UIHelper",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS\RegisteredProducts",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS\MainService",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS\InstallHelper",
            @"SOFTWARE\WOW6432Node\Epic Games\EOS",
            @"SOFTWARE\WOW6432Node\Epic Games",
            @"SOFTWARE\WOW6432Node\EasyAntiCheat",
            @"SOFTWARE\Classes\com.epicgames.launcher\shell\open\command",
            @"SOFTWARE\Classes\com.epicgames.launcher\shell\open",
            @"SOFTWARE\Classes\com.epicgames.launcher\shell",
            @"SOFTWARE\Classes\com.epicgames.launcher\DefaultIcon",
            @"SOFTWARE\Classes\com.epicgames.launcher",
        ];
        foreach (var k in hklmKeys)
            TryRegDelete(Registry.LocalMachine, k, log);

        // HKCR
        string[] hkcrKeys =
        [
            @"com.epicgames.launcher\shell\open\command",
            @"com.epicgames.launcher\shell\open",
            @"com.epicgames.launcher\shell",
            @"com.epicgames.launcher\DefaultIcon",
            @"com.epicgames.launcher",
        ];
        foreach (var k in hkcrKeys)
            TryRegDelete(Registry.ClassesRoot, k, log);

        // HKU .DEFAULT
        TryRegDelete(Registry.Users, @".DEFAULT\Software\Epic Games\Unreal Engine\Identifiers", log);
        TryRegDelete(Registry.Users, @".DEFAULT\Software\Epic Games\Unreal Engine", log);
        TryRegDelete(Registry.Users, @".DEFAULT\Software\Epic Games", log);
    }

    static void CleanAntiCheatRegistry(Action<string> log)
    {
        string[] keys =
        [
            @"SYSTEM\ControlSet001\Services\BEService",
            @"SYSTEM\CurrentControlSet\Services\BEService",
            @"SYSTEM\ControlSet001\Services\EasyAntiCheat",
            @"SYSTEM\ControlSet001\Services\EasyAntiCheat\Security",
            @"SYSTEM\CurrentControlSet\Services\EasyAntiCheat",
            @"SYSTEM\CurrentControlSet\Services\EasyAntiCheat\Security",
        ];
        foreach (var k in keys)
            TryRegDelete(Registry.LocalMachine, k, log);

        // ClipSVC
        TryRegDelete(Registry.CurrentUser, @"SYSTEM\ControlSet001\Services\ClipSVC\Parameters", log);
    }

    static void CleanDirectInput(Action<string> log)
    {
        var basePath = @"Software\Microsoft\DirectInput";
        TryRegDelete(Registry.CurrentUser, basePath, log);
    }

    static void CleanMountPoints(Action<string> log)
    {
        TryRegDelete(Registry.CurrentUser, @"Software\Microsoft\Windows\CurrentVersion\Explorer\MountPoints2", log);
        TryRegDelete(Registry.CurrentUser, @"Software\Microsoft\Windows\CurrentVersion\Explorer\BitBucket", log);
    }

    static void CleanNetworkCache(Action<string> log)
    {
        TryRegDelete(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Nla\Cache", log);
    }

    static void CleanBamEntries(Action<string> log)
    {
        try
        {
            var sid = WindowsIdentity.GetCurrent().User?.Value;
            if (sid == null) return;
            var bamPath = $@"SYSTEM\CurrentControlSet\Services\bam\State\UserSettings\{sid}";
            using var bamKey = Registry.LocalMachine.OpenSubKey(bamPath, true);
            if (bamKey == null) return;
            foreach (var val in bamKey.GetValueNames())
            {
                if (val.IndexOf("Fortnite",      StringComparison.OrdinalIgnoreCase) >= 0 ||
                    val.IndexOf("EasyAntiCheat", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    val.IndexOf("EpicGames",     StringComparison.OrdinalIgnoreCase) >= 0 ||
                    val.IndexOf("BattlEye",      StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    bamKey.DeleteValue(val, false);
                    log($"  bam del  {val}");
                }
            }
        }
        catch { }
    }

    // Fingerprint values — random-named values planted by anti-cheat in HKCU\Software\*
    static readonly string[] FingerprintRoots =
    [
        "AppDataLow", "AppDataLow\\Software", "BranchIO", "Chromium", "Chromium\\BLBeacon",
        "Chromium\\PreferenceMACs", "Chromium\\StabilityMetrics", "Chromium\\ThirdParty",
        "Discord", "Discord\\Modules", "Electronic Arts", "Electronic Arts\\EA Desktop",
        "Electronic Arts\\FC", "Epic Games", "Epic Games\\EOS", "Epic Games\\EpicGamesLauncher",
        "Epic Games\\Unreal Engine", "Google", "Google\\Chrome", "Google\\Common", "Google\\Update",
        "Khronos", "Khronos\\Vulkan",
        "Microsoft", "Microsoft\\Accessibility", "Microsoft\\Active Setup", "Microsoft\\ActiveMovie",
        "Microsoft\\ActiveSync", "Microsoft\\Assistance", "Microsoft\\AuthCookies",
        "Microsoft\\Avalon.Graphics", "Microsoft\\Clipboard", "Microsoft\\CommsAPHost",
        "Microsoft\\CTF", "Microsoft\\Direct3D", "Microsoft\\DirectX Diagnostic Tool",
        "Microsoft\\Edge", "Microsoft\\EdgeUpdate", "Microsoft\\EdgeWebView",
        "Microsoft\\EventSystem", "Microsoft\\F12", "Microsoft\\Fax", "Microsoft\\Feeds",
        "Microsoft\\FTP", "Microsoft\\GameBar", "Microsoft\\GameBarApi",
        "Microsoft\\IdentityCRL", "Microsoft\\IME", "Microsoft\\Input", "Microsoft\\InputMethod",
        "Microsoft\\InputPersonalization", "Microsoft\\Internet Connection Wizard",
        "Microsoft\\Internet Explorer", "Microsoft\\Keyboard", "Microsoft\\LanguageOverlay",
        "Microsoft\\MediaPlayer", "Microsoft\\Microsoft Management Console", "Microsoft\\MSF",
        "Microsoft\\Multimedia", "Microsoft\\Narrator", "Microsoft\\NGC", "Microsoft\\Notepad",
        "Microsoft\\Nucleus", "Microsoft\\OneDrive", "Microsoft\\Osk", "Microsoft\\PeerNet",
        "Microsoft\\Personalization", "Microsoft\\Phone", "Microsoft\\Pim", "Microsoft\\Poom",
        "Microsoft\\RAS AutoDial", "Microsoft\\RAS Phonebook", "Microsoft\\Remote Assistance",
        "Microsoft\\ScreenMagnifier", "Microsoft\\Sensors", "Microsoft\\SkyDrive",
        "Microsoft\\Speech", "Microsoft\\Speech Virtual", "Microsoft\\Speech_OneCore",
        "Microsoft\\Spelling", "Microsoft\\SQMClient", "Microsoft\\StigRegKey",
        "Microsoft\\SystemCertificates", "Microsoft\\TabletTip", "Microsoft\\TPG",
        "Microsoft\\Unified Store", "Microsoft\\Unistore", "Microsoft\\UserData",
        "Microsoft\\WAB", "Microsoft\\WcmSvc", "Microsoft\\wfs", "Microsoft\\Windows",
        "Microsoft\\Windows NT", "Microsoft\\Windows Script", "Microsoft\\Windows Search",
        "Microsoft\\Windows Security Health", "Microsoft\\Wisp", "Microsoft\\Xbox",
        "Microsoft\\XboxLive",
        "NVIDIA Corporation", "NVIDIA Corporation\\Global", "NVIDIA Corporation\\NVControlPanel2",
        "Overwolf", "Overwolf\\CEF", "Overwolf\\Overwolf", "OverwolfPersist",
        "Policies", "Policies\\Microsoft", "Policies\\Power",
        "RegisteredApplications", "ROBLOX Corporation", "ROBLOX Corporation\\Environments",
        "Settings", "Spotify", "Spotify\\Window Position",
        "Sysinternals", "Sysinternals\\Process Monitor", "Sysinternals\\VolumeID",
        "Ubisoft", "Ubisoft\\Launcher", "Ubisoft\\Rainbow Six - Siege", "Ubisoft\\Uplay",
        "Valve", "Valve\\Steam", "Verse", "Windscribe", "Windscribe\\Installer",
        "Windscribe\\Windscribe2", "WinRAR", "WinRAR\\ArcHistory", "WinRAR\\DialogEditHistory",
        "WinRAR\\FileList", "WinRAR\\General", "WinRAR\\Interface", "WinRAR\\Profiles",
        "WinRAR\\Setup", "WinRAR SFX", "Wow6432Node", "Wow6432Node\\Microsoft",
    ];

    static void CleanFingerprintValues(Action<string> log)
    {
        log("  cleaning fingerprint values...");
        foreach (var subkey in FingerprintRoots)
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey($@"SOFTWARE\{subkey}", true);
                if (key == null) continue;
                var names = key.GetValueNames();
                foreach (var name in names)
                {
                    if (name.Length >= 4 && name.Any(char.IsDigit) && name.Any(char.IsLetter)
                        && !name.Contains(' ') && name.Length <= 20)
                    {
                        try { key.DeleteValue(name, false); } catch { }
                    }
                }
            }
            catch { }
        }
        log("  fingerprint values cleaned");
    }

    // File extension classes in HKCU\Software\Classes — same pattern
    static void CleanFileClassValues(Action<string> log)
    {
        log("  cleaning file class fingerprints...");
        try
        {
            using var classesKey = Registry.CurrentUser.OpenSubKey(@"Software\Classes", true);
            if (classesKey == null) return;
            foreach (var subName in classesKey.GetSubKeyNames())
            {
                if (!subName.StartsWith(".") && subName != "*") continue;
                try
                {
                    using var sub = classesKey.OpenSubKey(subName, true);
                    if (sub == null) continue;
                    foreach (var val in sub.GetValueNames())
                    {
                        if (val.Length >= 4 && val.Any(char.IsDigit) && val.Any(char.IsLetter)
                            && !val.Contains(' ') && val.Length <= 20)
                        {
                            try { sub.DeleteValue(val, false); } catch { }
                        }
                    }
                }
                catch { }
            }
        }
        catch { }
        log("  file class fingerprints cleaned");
    }

    static void SpoofHwid(Action<string> log)
    {
        var compName = $"DESKTOP-{RandAlphaNum(7).ToUpper()}";

        void RegSet(RegistryKey root, string path, string name, object value, RegistryValueKind kind)
        {
            try
            {
                using var key = root.OpenSubKey(path, true) ?? root.CreateSubKey(path);
                key?.SetValue(name, value, kind);
                log($"  spoof    {path}\\{name}");
            }
            catch { }
        }

        RegSet(Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName",
            "ComputerName", compName, RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\ComputerName\ActiveComputerName",
            "ComputerName", compName, RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SYSTEM\HardwareConfig",
            "LastConfig", $"{{{RandGuid()}}}", RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\IDConfigDB\Hardware Profiles\0001",
            "HwProfileGuid", $"{{{RandGuid()}}}", RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\IDConfigDB\Hardware Profiles\0001",
            "GUID", $"{{{RandGuid()}}}", RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "BuildGUID", RandAlphaNum(32), RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "RegisteredOwner", RandAlphaNum(10), RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "RegisteredOrganization", RandAlphaNum(12), RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "ProductId", $"{RandHex(5)}-{RandHex(5)}-{RandHex(5)}-{RandHex(5)}", RegistryValueKind.String);
        RegSet(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "InstallDate", Rng.Next(1500000000, 1700000000), RegistryValueKind.DWord);
        RegSet(Registry.LocalMachine, @"SYSTEM\CurrentControlSet\Control\SystemInformation",
            "ComputerHardwareId", $"{{{RandGuid()}}}", RegistryValueKind.String);

        log($"  hwid spoofed → {compName}");
    }

    static void CleanWindowsTemp(Action<string> log)
    {
        TryDeleteFiles($@"{SysDrive}\Windows\temp", "*", log);
        TryDeleteFiles(Path.GetTempPath(), "*", log);
        TryDeleteFiles($@"{SysDrive}\Windows\INF", "*.*", log);
    }

    static void CleanPrefetch(Action<string> log)
    {
        TryDeleteFiles($@"{SysDrive}\Windows\Prefetch", "*", log);
    }

    static void CleanUserCaches(Action<string> log)
    {
        string[] dirs =
        [
            Path.Combine(LocalAppData, "Microsoft\\Windows\\WebCache"),
            Path.Combine(LocalAppData, "Microsoft\\Windows\\INetCache"),
            Path.Combine(LocalAppData, "Microsoft\\Windows\\INetCookies"),
            Path.Combine(LocalAppData, "Microsoft\\Windows\\History"),
            Path.Combine(LocalAppData, "Microsoft\\Feeds Cache"),
            Path.Combine(LocalAppData, "D3DSCache"),
            Path.Combine(LocalAppData, "Microsoft\\Windows\\SettingSync\\metastore"),
            Path.Combine(LocalAppData, "Microsoft\\Windows\\CloudStore"),
            Path.Combine(LocalAppData, "ConnectedDevicesPlatform"),
            Path.Combine(LocalAppData, "CrashDumps"),
        ];
        foreach (var d in dirs) TryDeleteDir(d, log);

        TryDeleteFile(Path.Combine(LocalAppData, "IconCache.db"), log);

        // CryptnetUrlCache
        TryDeleteDir(Path.Combine(LocalAppData.Replace("Local", "LocalLow"), "Microsoft\\CryptnetUrlCache\\Content"), log);
        TryDeleteDir(Path.Combine(LocalAppData.Replace("Local", "LocalLow"), "Microsoft\\CryptnetUrlCache\\MetaData"), log);
    }

    static void CleanGpuCaches(Action<string> log)
    {
        // NVIDIA
        TryDeleteDir(Path.Combine(LocalAppData, "NVIDIA\\DxCache"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "NVIDIA\\GfeSDK"), log);
        TryDeleteDir(Path.Combine(LocalAppData.Replace("Local", "LocalLow"), "NVIDIA\\PerDriverVersion\\DXCache"), log);
        TryDeleteDir($@"{SysDrive}\ProgramData\NVIDIA Corporation\Drs", log);
        TryDeleteDir($@"{SysDrive}\ProgramData\NVIDIA Corporation", log);

        // AMD
        TryDeleteDir(Path.Combine(LocalAppData, "AMD\\DxCache"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "AMD\\cl.cache"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "AMD\\CN\\GameReport"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "AMD\\VkCache"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "AMD\\CN\\NewsFeed"), log);
    }

    static void CleanEpicFiles(Action<string> log)
    {
        // Fortnite saved data
        string[] epicDirs =
        [
            Path.Combine(LocalAppData, "FortniteGame\\Saved"),
            Path.Combine(LocalAppData, "EpicGamesLauncher\\Saved"),
            Path.Combine(LocalAppData, "UnrealEngine"),
            Path.Combine(LocalAppData, "CrashReportClient"),
        ];
        foreach (var d in epicDirs) TryDeleteDir(d, log);

        // Check common install locations
        string[] installRoots =
        [
            $@"{SysDrive}\Program Files\Epic Games\Fortnite",
            $@"D:\Epic Games\Fortnite",
            $@"E:\Epic Games\Fortnite",
            $@"F:\Epic Games\Fortnite",
        ];
        foreach (var root in installRoots)
        {
            if (!Directory.Exists(root)) continue;
            TryDeleteDir(Path.Combine(root, "Engine\\Plugins"), log);
            TryDeleteDir(Path.Combine(root, "FortniteGame\\Plugins"), log);
            TryDeleteDir(Path.Combine(root, "FortniteGame\\PersistentDownloadDir"), log);
            TryDeleteDir(Path.Combine(root, "FortniteGame\\Config"), log);
        }

        // Origin/EA
        TryDeleteDir(Path.Combine(RoamingAppData, "Origin"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "Origin"), log);
        TryDeleteDir(Path.Combine(LocalAppData, "Electronic Arts"), log);
        TryDeleteDir($@"{SysDrive}\ProgramData\Electronic Arts", log);
    }

    static void CleanAntiCheatFiles(Action<string> log)
    {
        // BattlEye
        TryDeleteDir($@"{SysDrive}\Program Files (x86)\Common Files\BattlEye", log);
        TryDeleteDir(Path.Combine(RoamingAppData, "EasyAntiCheat"), log);

        // EAC in system32
        TryDeleteFiles($@"{SysDrive}\Windows\System32", "eac_usermode_*.dll", log);
        TryDeleteFile($@"{SysDrive}\Windows\System32\EasyAntiCheat.exe", log);

        // Xbox gaming overlay
        var packages = Path.Combine(LocalAppData, "Packages");
        if (Directory.Exists(packages))
        {
            try
            {
                foreach (var d in Directory.GetDirectories(packages, "Microsoft.XboxGamingOverlay_*"))
                {
                    TryDeleteDir(Path.Combine(d, "AC"), log);
                    TryDeleteDir(Path.Combine(d, "LocalCache"), log);
                    TryDeleteDir(Path.Combine(d, "Settings"), log);
                }
            }
            catch { }
        }
    }

    static void CleanSystemLogs(Action<string> log)
    {
        TryDeleteDir($@"{SysDrive}\Windows\Logs", log);
        TryDeleteDir($@"{SysDrive}\Windows\SoftwareDistribution\DataStore", log);
        TryDeleteDir($@"{SysDrive}\Windows\WER\Temp", log);
        TryDeleteDir($@"{SysDrive}\Windows\USOShared\Logs", log);
        TryDeleteDir($@"{SysDrive}\Windows\DeliveryOptimization", log);
        TryDeleteDir($@"{SysDrive}\Windows\servicing\InboxFodMetadataCache", log);
        TryDeleteDir($@"{SysDrive}\Intel", log);
        TryDeleteDir($@"{SysDrive}\MSOCache", log);
        TryDeleteFile($@"{SysDrive}\Windows\appcompat\Programs\amcache.hve", log);

        // Specific prefetch files
        string[] prefetchPatterns =
        [
            "BESERVICE.EXE-*.pf", "CRASHREPORTCLIENT.EXE-*.pf",
            "EASYANTICHEAT_SETUP.EXE-*.pf", "FORTNITECLIENT-WIN64-SHIPPING-*.pf",
            "FORTNITELAUNCHER.EXE-*.pf", "RUNDLL32.EXE-*.pf"
        ];
        foreach (var p in prefetchPatterns)
            TryDeleteFiles($@"{SysDrive}\Windows\Prefetch", p, log);
    }

    static void CleanRecycleBins(Action<string> log)
    {
        foreach (var drive in new[] { "C:", "D:", "E:", "F:" })
        {
            TryDeleteDir($@"{drive}\$Recycle.Bin", log);
        }
    }

    static void CleanTempExtensions(Action<string> log)
    {
        string[] exts = ["*.etl", "*.log", "*.tmp", "*.old", "*.bak", "*.bac", "*.bup", "*.chk", "*.dmp", "*.temp"];
        foreach (var ext in exts)
        {
            TryDeleteFiles($@"{SysDrive}\Windows\temp", ext, log);
            TryDeleteFiles(Path.GetTempPath(), ext, log);
        }
    }

    static void DisableIpv6(Action<string> log)
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters", true)
                            ?? Registry.LocalMachine.CreateSubKey(@"SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters");
            key?.SetValue("DisabledComponents", unchecked((int)0xFFFFFFFF), RegistryValueKind.DWord);
            log("  ipv6 disabled");
        }
        catch { }
    }

    static void DisableActivityTracking(Action<string> log)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced", true);
            key?.SetValue("Start_TrackProgs", 0, RegistryValueKind.DWord);
            log("  activity tracking disabled");
        }
        catch { }

        TryRegDelete(Registry.CurrentUser, @"SOFTWARE\Microsoft\Windows\CurrentVersion\ActivityDataModel", log);
        TryRegDeleteValue(Registry.CurrentUser, @"Software\Microsoft\Direct3D", "WHQLClass", log);
    }

    static void RecreateDirs(Action<string> log)
    {
        string[] dirs =
        [
            $@"{SysDrive}\Windows\temp",
            $@"{SysDrive}\Windows\Prefetch",
            Path.GetTempPath(),
        ];
        foreach (var d in dirs)
        {
            try
            {
                if (!Directory.Exists(d))
                {
                    Directory.CreateDirectory(d);
                    log($"  mkdir    {d}");
                }
            }
            catch { }
        }
    }
}
