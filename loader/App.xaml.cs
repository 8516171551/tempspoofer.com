using System;
using System.IO;
using System.Windows;
using System.Windows.Threading;

namespace TemporarySpoofer;

public partial class App : Application
{
    private static readonly string LogFile =
        Path.Combine(Path.GetTempPath(), "tempspoofer_crash.txt");

    public App()
    {
        Dump("ctor:begin");
        try { Application.ResourceAssembly = typeof(App).Assembly; Dump("ctor:ResourceAssembly set"); }
        catch (Exception ex) { Dump("ctor:ResourceAssembly", ex); }

        ShutdownMode = ShutdownMode.OnExplicitShutdown;

        DispatcherUnhandledException += (_, ea) =>
        {
            Dump("Dispatcher", ea.Exception);
            try { MessageBox.Show(ea.Exception.ToString(), "Temporary Spoofer — crash",
                MessageBoxButton.OK, MessageBoxImage.Error); } catch { }
            ea.Handled = true;
            Shutdown(1);
        };

        AppDomain.CurrentDomain.UnhandledException += (_, ea) =>
        {
            if (ea.ExceptionObject is Exception x) Dump("AppDomain", x);
        };

        Dump("ctor:end");
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        Dump("OnStartup:begin");
        try
        {
            base.OnStartup(e);
            Dump("OnStartup:base returned");

            Window w;
#if RESELLER
            w = new LoginWindow();
#else
            w = new MainWindow();
#endif
            Dump("OnStartup:window constructed: " + w.GetType().Name);

            MainWindow = w;
            w.Closed += (_, _) => { Dump("Window:Closed -> Shutdown(0)"); Shutdown(0); };
            w.Topmost = true;        // debug-only: force visibility above everything else
            w.Show();
            Dump("OnStartup:Show() returned");
        }
        catch (Exception ex)
        {
            Dump("OnStartup", ex);
            try { MessageBox.Show(ex.ToString(), "Temporary Spoofer — startup",
                MessageBoxButton.OK, MessageBoxImage.Error); } catch { }
            Shutdown(1);
        }
    }

    private static void Dump(string label, Exception? ex = null)
    {
        try
        {
            var line = $"[{DateTime.Now:HH:mm:ss.fff}] {label}";
            if (ex != null)
            {
                line += $"\n   {ex.GetType().FullName}: {ex.Message}\n   {ex.StackTrace}";
                var inner = ex.InnerException;
                int depth = 0;
                while (inner != null && depth++ < 5)
                {
                    line += $"\n   --- inner[{depth}] {inner.GetType().FullName}: {inner.Message}\n   {inner.StackTrace}";
                    inner = inner.InnerException;
                }
            }
            File.AppendAllText(LogFile, line + "\n");
        }
        catch { }
    }
}
