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
        KeyBadge.Text = ShortKey(Session.LicenseKey);
        if (!string.IsNullOrEmpty(Session.ExpiresAt))
            ExpiryText.Text = FormatExpiry(Session.ExpiresAt);

        _timer.Tick += (_, _) =>
        {
            var elapsed = DateTime.Now - _startTime;
            ElapsedText.Text = $"{(int)elapsed.TotalMinutes:D2}:{elapsed.Seconds:D2}";
        };

        Log($"License validated. Tier: {Session.Tier}");
        Log("Ready. Choose Clean or Spoof.");
    }

    private static string ShortKey(string k) =>
        string.IsNullOrEmpty(k) ? "" : k.Length > 16 ? k[..4] + "…" + k[^4..] : k;

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
        double pct = total > 0 ? (double)done / total : 0;
        ProgressBar.Width = pct * (ActualWidth - 26);
    }

    private void SetBusy(bool busy, string? spoofLabel = null, string? cleanLabel = null)
    {
        SpoofBtn.IsEnabled = !busy;
        CleanBtn.IsEnabled = !busy;
        if (spoofLabel is not null) SpoofBtnLabel.Text = spoofLabel;
        if (cleanLabel is not null) CleanBtnLabel.Text = cleanLabel;
    }

    // --- SPOOF: mock animation, no real HWID writes anywhere ---
    private async void SpoofBtn_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(Session.LicenseKey))
        {
            Log("ERROR  No license in session.");
            return;
        }

        SetBusy(true, spoofLabel: "Spoofing...");
        _startTime = DateTime.Now;
        _timer.Start();

        StatusText.Text = "Claiming";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent2");

        var hwid = SpoofEngine.FakeHwid();
        Log($"Posting claim for {ShortKey(Session.LicenseKey)}");
        var claim = await Session.Api.ClaimAsync(Session.LicenseKey, hwid);
        if (!claim.Ok)
        {
            Log($"ERROR  {claim.Error}");
            StatusText.Text = "Rejected";
            StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");
            SetBusy(false, spoofLabel: "Spoof now");
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

        SuccessHeadline.Text = "Spoof active";
        SuccessDetail.Text = string.IsNullOrEmpty(claim.ExpiresAt)
            ? "expires —"
            : $"expires {FormatExpiry(claim.ExpiresAt!)}";
        ShowSuccess();

        SetBusy(false, spoofLabel: "Spoof now");
    }

    // --- CLEAN: runs the real CleaningEngine steps against this machine ---
    private async void CleanBtn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true, cleanLabel: "Cleaning...");
        _startTime = DateTime.Now;
        _timer.Start();

        StatusText.Text = "Cleaning";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent2");

        var steps = CleaningEngine.GetSteps();
        int done = 0, total = steps.Count;
        Log($"Starting trace clean — {total} steps.");

        foreach (var step in steps)
        {
            CurrentStep.Text = step.Name;
            Log($"  [{step.Category}] {step.Name}");
            try
            {
                await Task.Run(() => step.Execute(msg => Dispatcher.Invoke(() => Log(msg))));
            }
            catch (Exception ex)
            {
                Log($"  ERROR  {step.Name}: {ex.Message}");
            }
            done++;
            UpdateProgress(done, total);
            Log($"  done   {step.Name}");
        }

        _timer.Stop();
        CurrentStep.Text = "—";
        StatusText.Text = "Clean done";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");

        SuccessHeadline.Text = "Traces cleaned";
        SuccessDetail.Text = $"{total} steps complete";
        ShowSuccess();

        SetBusy(false, cleanLabel: "Clean traces");
    }

    private void ShowSuccess()
    {
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
        fade.Completed += (_, _) => SuccessOverlay.IsHitTestVisible = false;
        SuccessOverlay.BeginAnimation(OpacityProperty, fade);
    }

    private static string FormatExpiry(string iso)
    {
        if (DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return dt.ToLocalTime().ToString("MMM d, HH:mm");
        return iso;
    }
}
