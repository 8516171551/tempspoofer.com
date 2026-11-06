using System;
using System.Windows;
using System.Windows.Threading;

namespace TemporarySpoofer;

public partial class App : Application
{
    public App()
    {
        // When this assembly is reflection-loaded by PowerShell, WPF's
        // pack://application:,,,/ URIs resolve against the host (powershell.exe)
        // unless we point them at ourselves. Must be set BEFORE any BAML
        // containing a Fonts/#Poppins pack URI is parsed.
        Application.ResourceAssembly = typeof(App).Assembly;

        DispatcherUnhandledException += (_, ea) =>
        {
            ea.Handled = true;
            MessageBox.Show(ea.Exception.ToString(), "Temporary Spoofer — unhandled",
                MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        };
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        try
        {
            Window w;
#if RESELLER
            w = new LoginWindow();        // key entry (reseller build)
#else
            w = new MainWindow();         // consumer: straight to main; auth in background
#endif
            MainWindow = w;
            w.Show();
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.ToString(), "Temporary Spoofer — startup failed",
                MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }
}
