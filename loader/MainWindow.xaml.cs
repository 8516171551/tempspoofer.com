using System.Globalization;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Animation;
using System.Windows.Threading;

namespace TemporarySpoofer;

public partial class MainWindow : Window
{
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    private DateTime _startTime;
    private int _logLines;

    public MainWindow()
    {
        InitializeComponent();
        var steps = SpoofEngine.GetSteps();
        _timer.Tick += (_, _) =>
        {
            var elapsed = DateTime.Now - _startTime;
            ElapsedText.Text = $"{(int)elapsed.TotalMinutes:D2}:{elapsed.Seconds:D2}";
        };
        SessionEmail.Text = Session.Email ?? "";
        ProgressCount.Text = $"0 / {steps.Count}";
        Log($"Ready. {steps.Count} rotation steps loaded.");
    }

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }

    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private void Log(string msg)
    {
        _logLines++;
        LogBox.Text += $"[{DateTime.Now:HH:mm:ss}] {msg}\n";
        LogScroller.ScrollToEnd();
        LogLineCount.Text = $"{_logLines} lines";
    }

    private void UpdateProgress(int done, int total)
    {
        ProgressCount.Text = $"{done} / {total}";
        double pct = (double)done / total;
        ProgressBar.Width = pct * (ActualWidth - 26);
    }

    private async void SpoofBtn_Click(object sender, RoutedEventArgs e)
    {
        var key = KeyBox.Text.Trim();
        if (key.Length == 0 || key.StartsWith("TS-XXXX"))
        {
            Log("ERROR  No license key entered.");
            return;
        }
        if (Session.Api is null)
        {
            Log("ERROR  No API session. Restart the loader.");
            return;
        }

        SpoofBtn.IsEnabled = false;
        SpoofBtnLabel.Text = "Spoofing...";
        _startTime = DateTime.Now;
        _timer.Start();

        StatusText.Text = "Claiming";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent2");

        var hwid = SpoofEngine.FakeHwid();
        Log($"Posting claim for {key}");
        var claim = await Session.Api.ClaimAsync(key, hwid);
        if (!claim.Ok)
        {
            Log($"ERROR  {claim.Error}");
            StatusText.Text = "Rejected";
            StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");
            SpoofBtn.IsEnabled = true;
            SpoofBtnLabel.Text = "Spoof now";
            _timer.Stop();
            return;
        }

        StatusText.Text = "Running";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent2");
        Log($"License active until {claim.ExpiresAt}");
        if (!string.IsNullOrEmpty(claim.ExpiresAt))
            ExpiryText.Text = FormatExpiry(claim.ExpiresAt!);

        var steps = SpoofEngine.GetSteps();
        int done = 0, total = steps.Count;

        foreach (var step in steps)
        {
            CurrentStep.Text = step.Name;
            await SpoofEngine.ExecuteAsync(step, Log);
            done++;
            UpdateProgress(done, total);
            Log($"  done   {step.Name}");
        }

        _timer.Stop();
        CurrentStep.Text = "—";
        StatusText.Text = "Complete";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");

        SuccessDetail.Text = string.IsNullOrEmpty(claim.ExpiresAt)
            ? "expires —"
            : $"expires {FormatExpiry(claim.ExpiresAt!)}";

        var fade = new DoubleAnimation(0, 0.98, TimeSpan.FromMilliseconds(420))
        {
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
        };
        SuccessOverlay.IsHitTestVisible = true;
        SuccessOverlay.BeginAnimation(OpacityProperty, fade);
    }

    private void ContinueBtn_Click(object sender, RoutedEventArgs e)
    {
        var fade = new DoubleAnimation(SuccessOverlay.Opacity, 0, TimeSpan.FromMilliseconds(260));
        fade.Completed += (_, _) =>
        {
            SuccessOverlay.IsHitTestVisible = false;
            SpoofBtn.IsEnabled = true;
            SpoofBtnLabel.Text = "Spoof now";
        };
        SuccessOverlay.BeginAnimation(OpacityProperty, fade);
    }

    private static string FormatExpiry(string iso)
    {
        if (DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return dt.ToLocalTime().ToString("MMM d, HH:mm");
        return iso;
    }
}
