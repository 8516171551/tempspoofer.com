using System.Diagnostics;
using System.Windows;
using System.Windows.Input;
using System.Windows.Navigation;

namespace TemporarySpoofer;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Loaded += (_, _) => EmailBox.Focus();
    }

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }
    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private void RegisterLink_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = $"{ApiClient.BaseUrl}/register",
                UseShellExecute = true,
            });
        }
        catch { /* ignore */ }
    }

    private async void LoginBtn_Click(object sender, RoutedEventArgs e)
    {
        var email = EmailBox.Text.Trim();
        var pw = PasswordBox.Password;

        if (email.Length == 0 || pw.Length == 0)
        {
            ShowError("Email and password required.");
            return;
        }

        LoginBtn.IsEnabled = false;
        LoginBtn.Content = "...";
        ErrorText.Visibility = Visibility.Collapsed;

        var api = new ApiClient();
        var r = await api.LoginAsync(email, pw);

        if (!r.Ok)
        {
            ShowError(r.Error ?? "Login failed.");
            LoginBtn.IsEnabled = true;
            LoginBtn.Content = "Log in";
            return;
        }

        Session.Api = api;
        Session.Email = email;

        var main = new MainWindow();
        Application.Current.MainWindow = main;
        main.Show();
        Close();
    }

    private void ShowError(string msg)
    {
        ErrorText.Text = msg;
        ErrorText.Visibility = Visibility.Visible;
    }
}
