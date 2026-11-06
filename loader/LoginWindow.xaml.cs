using System.Diagnostics;
using System.Windows;
using System.Windows.Input;

namespace TemporarySpoofer;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Loaded += (_, _) => KeyBox.Focus();
    }

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }
    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private void KeyBox_GotFocus(object sender, RoutedEventArgs e)
    {
        if (KeyBox.Text.StartsWith("TS-XXXX"))
        {
            KeyBox.Text = "";
        }
    }

    private void BuyLink_Click(object sender, RoutedEventArgs e)
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

    private async void LoginBtn_Click(object sender, RoutedEventArgs e)
    {
        var key = KeyBox.Text.Trim().ToUpperInvariant();
        if (key.Length == 0 || key.StartsWith("TS-XXXX"))
        {
            ShowStatus("Paste the key from your email.");
            return;
        }

        LoginBtn.IsEnabled = false;
        LoginBtn.Content = "Checking...";
        StatusLine.Visibility = Visibility.Collapsed;

        var r = await Session.Api.ValidateAsync(key);
        if (!r.Ok)
        {
            ShowStatus(r.Error ?? "Key validation failed.");
            LoginBtn.IsEnabled = true;
            LoginBtn.Content = "Continue";
            return;
        }

        Session.LicenseKey = key;
        Session.Tier       = r.Tier ?? "";
        Session.Status     = r.Status ?? "";
        Session.ExpiresAt  = r.ExpiresAt;

        var main = new MainWindow();
        Application.Current.MainWindow = main;
        main.Show();
        Close();
    }

    private void ShowStatus(string msg)
    {
        StatusLine.Text = msg;
        StatusLine.Visibility = Visibility.Visible;
    }
}
