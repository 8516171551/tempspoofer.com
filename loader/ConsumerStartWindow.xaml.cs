using System.Diagnostics;
using System.Windows;
using System.Windows.Input;

namespace TemporarySpoofer;

public partial class ConsumerStartWindow : Window
{
    public ConsumerStartWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) => await AttemptAutoLoginAsync();
    }

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }
    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private async Task AttemptAutoLoginAsync()
    {
        // Give the pulse a beat to breathe, then hit the API.
        await Task.Delay(500);

        var r = await Session.Api.AuthByIpAsync();
        if (r.Ok)
        {
            Session.LicenseKey = null;
            Session.Tier       = r.Tier ?? "";
            Session.Status     = r.Status ?? "";
            Session.ExpiresAt  = r.ExpiresAt;
            Session.Ip         = r.Ip;

            var main = new MainWindow();
            Application.Current.MainWindow = main;
            main.Show();
            Close();
            return;
        }

        HeadlineText.Text = "No license on this network.";
        SubText.Text = "Buy a pass and we'll bind it to your IP automatically. Then rerun the loader.";
        ActionArea.Visibility = Visibility.Visible;
    }

    private void BuyBtn_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = $"{ApiClient.BaseUrl}/#pricing",
                UseShellExecute = true,
            });
        }
        catch { /* ignore */ }
    }

    private async void RetryBtn_Click(object sender, RoutedEventArgs e)
    {
        ActionArea.Visibility = Visibility.Collapsed;
        HeadlineText.Text = "Checking your network…";
        SubText.Text = "Looking up a license bound to this IP.";
        await AttemptAutoLoginAsync();
    }
}
