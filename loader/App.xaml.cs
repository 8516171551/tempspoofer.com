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

    protected override void OnStartup(StartupEventArgs e)
    {
        try
        {
            base.OnStartup(e);
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
