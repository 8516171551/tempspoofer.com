using System;
using System.IO;
using System.Windows;
using System.Windows.Threading;

namespace TemporarySpoofer;

public partial class App : Application
{
    private static readonly string CrashFile =
        Path.Combine(Path.GetTempPath(), "tempspoofer_crash.txt");

    public App()
    {
        try
        {
            // Reflection-loaded: force pack://application:,,,/ URIs to resolve
            // against our assembly, not the PS host.
            Application.ResourceAssembly = typeof(App).Assembly;
        }
        catch (Exception ex) { Dump("ctor:ResourceAssembly", ex); }

        // Never let the dispatcher auto-shutdown because of a stray exception.
        ShutdownMode = ShutdownMode.OnExplicitShutdown;

        DispatcherUnhandledException += OnDispatcherException;
        AppDomain.CurrentDomain.UnhandledException += OnDomainException;
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
            w.Closed += (_, _) => Shutdown(0);    // explicit shutdown when the user closes it
            w.Show();
        }
        catch (Exception ex)
        {
            Dump("OnStartup", ex);
            SafeMessageBox(ex);
            Shutdown(1);
        }
    }

    private void OnDispatcherException(object sender, DispatcherUnhandledExceptionEventArgs ea)
    {
        Dump("Dispatcher", ea.Exception);
        SafeMessageBox(ea.Exception);
        ea.Handled = true;
        Shutdown(1);
    }

    private static void OnDomainException(object sender, UnhandledExceptionEventArgs ea)
    {
        var ex = ea.ExceptionObject as Exception;
        if (ex != null) Dump("AppDomain", ex);
    }

    private static void Dump(string where, Exception ex)
    {
        try
        {
            var body =
                $"[{DateTime.Now:HH:mm:ss}] {where}\n" +
                $"{ex.GetType().FullName}: {ex.Message}\n" +
                $"{ex.StackTrace}\n";
            var inner = ex.InnerException;
            int depth = 0;
            while (inner != null && depth++ < 5)
            {
                body += $"--- inner [{depth}] ---\n{inner.GetType().FullName}: {inner.Message}\n{inner.StackTrace}\n";
                inner = inner.InnerException;
            }
            File.AppendAllText(CrashFile, body + "\n");
        }
        catch { /* best effort */ }
    }

    private static void SafeMessageBox(Exception ex)
    {
        try
        {
            MessageBox.Show(ex.ToString(), "Temporary Spoofer — crash",
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch { /* if MB itself fails, we still have the file */ }
    }
}
