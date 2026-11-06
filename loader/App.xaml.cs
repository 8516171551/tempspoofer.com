using System.Windows;

namespace TemporarySpoofer;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        Window w;
#if RESELLER
        w = new LoginWindow();           // key entry (reseller build)
#else
        w = new MainWindow();            // consumer: straight to main; auth runs in background
#endif
        MainWindow = w;
        w.Show();
    }
}
