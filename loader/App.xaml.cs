using System;
using System.Windows;

namespace TemporarySpoofer;

public partial class App : Application
{
    public App()
    {
        ShutdownMode = ShutdownMode.OnExplicitShutdown;

        DispatcherUnhandledException += (_, ea) =>
        {
            try { MessageBox.Show(ea.Exception.ToString(), "Temporary Spoofer — crash",
                MessageBoxButton.OK, MessageBoxImage.Error); } catch { }
            ea.Handled = true;
            Shutdown(1);
        };
    }

    protected override async void OnStartup(StartupEventArgs e)
    {
        try
        {
            base.OnStartup(e);

            // Refuse to run under common analysis tools / attached debuggers.
            // No-op in TS_DEV builds. See AntiTamper.cs for the trigger list.
            AntiTamper.EnforceOrDie();
            AntiTamper.StartWatchdog();

            // Load the per-install identity (or mint one on first run below
            // when ApiClient.EnsureRegisteredAsync fires) BEFORE loading
            // settings so the HMAC verification on settings.json works.
            InstallIdentity.TryLoad();

            // Version pinning: if the user picked an older release under
            // Settings > Developer Options, download it and re-launch into
            // that binary before showing any UI. The pinned exe really IS
            // the older build, so its code paths are what runs from here.
            var settings = UserSettings.Load();
            if (await VersionManager.MaybeRelaunchIntoPinnedAsync(settings))
            {
                Shutdown(0);
                return;
            }

            Window w;
#if RESELLER
            w = new LoginWindow();
#else
            w = new MainWindow();
#endif
            MainWindow = w;
            w.Closed += (_, _) => Shutdown(0);
            w.Show();
        }
        catch (Exception ex)
        {
            try { MessageBox.Show(ex.ToString(), "Temporary Spoofer — startup",
                MessageBoxButton.OK, MessageBoxImage.Error); } catch { }
            Shutdown(1);
        }
    }
}
