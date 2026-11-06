using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Globalization;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Animation;
using System.Windows.Threading;

namespace TemporarySpoofer;

public partial class MainWindow : Window
{
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromMilliseconds(500) };
    private readonly ObservableCollection<StepItem> _steps = new();
    private DateTime _startTime;
    private bool _authed;

    public MainWindow()
    {
        InitializeComponent();

        StepList.ItemsSource = _steps;
        StepList.ItemTemplate = (DataTemplate)FindResource("StepTemplate");

        _timer.Tick += (_, _) =>
        {
            var elapsed = DateTime.Now - _startTime;
            ElapsedText.Text = $"{(int)elapsed.TotalMinutes:D2}:{elapsed.Seconds:D2}";
        };

        Loaded += async (_, _) =>
        {
            if (Session.LicenseKey is null)
            {
                // Consumer: auth by IP in the background. UI stays interactive.
                await AuthByIpAsync();
            }
            else
            {
                // Reseller: already validated by LoginWindow.
                FinishAuth();
            }
        };
    }

    private async Task AuthByIpAsync()
    {
        StatusText.Text = "Connecting";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");
        PipelineHint.Text = "Looking up a license bound to this IP…";

        var r = await Session.Api.AuthByIpAsync();
        if (!r.Ok)
        {
            StatusText.Text = "No license";
            StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Warn");
            IdleHeadline.Text = "No license on this network.";
            IdleSubline.Text  = "Buy a pass at tempspoofer.com, then rerun the loader.";
            PipelineHint.Text = r.Error ?? "Lookup failed.";
            return;
        }

        Session.Tier      = r.Tier ?? "";
        Session.Status    = r.Status ?? "";
        Session.ExpiresAt = r.ExpiresAt;
        Session.Ip        = r.Ip;
        IdBadge.Text      = r.Ip ?? "";
        FinishAuth();
    }

    private void FinishAuth()
    {
        _authed = true;
        StatusText.Text = "Ready";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");

        if (Session.LicenseKey is { Length: > 0 } k)
            IdBadge.Text = ShortKey(k);

        if (!string.IsNullOrEmpty(Session.ExpiresAt))
            ExpiryText.Text = FormatExpiry(Session.ExpiresAt);

        SpoofBtn.IsEnabled = true;
        CleanBtn.IsEnabled = true;
        PipelineHint.Text  = $"Tier: {Session.Tier}  ·  {(Session.LicenseKey is null ? "IP auth" : "key auth")}";
    }

    private static string ShortKey(string k) =>
        string.IsNullOrEmpty(k)
            ? ""
            : k.Length > 16
                ? k.Substring(0, 4) + "…" + k.Substring(k.Length - 4)
                : k;

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }
    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private void UpdateProgress(int done, int total)
    {
        ProgressCount.Text = $"{done} / {total}";
        double pct = total > 0 ? (double)done / total : 0;
        ProgressBar.Width = pct * (ActualWidth - 32);
    }

    private void SetBusy(bool busy, string? spoofLabel = null, string? cleanLabel = null)
    {
        SpoofBtn.IsEnabled = !busy && _authed;
        CleanBtn.IsEnabled = !busy && _authed;
        if (spoofLabel is not null) SpoofBtnLabel.Text = spoofLabel;
        if (cleanLabel is not null) CleanBtnLabel.Text = cleanLabel;
    }

    private void ResetPipelineUi()
    {
        _steps.Clear();
        IdleHint.Visibility = Visibility.Collapsed;
    }

    // --- SPOOF: mock animation, zero real HWID writes ---
    private async void SpoofBtn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true, spoofLabel: "Spoofing…");
        _startTime = DateTime.Now;
        _timer.Start();

        StatusText.Text = "Claiming";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Warn");
        ResetPipelineUi();
        PipelineHint.Text = "Activating license…";

        var claim = await Session.Api.ClaimAsync(Session.LicenseKey);
        if (!claim.Ok)
        {
            StatusText.Text = "Rejected";
            StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Warn");
            PipelineHint.Text = claim.Error ?? "Claim failed.";
            SetBusy(false, spoofLabel: "Spoof now");
            _timer.Stop();
            return;
        }

        if (!string.IsNullOrEmpty(claim.ExpiresAt))
            ExpiryText.Text = FormatExpiry(claim.ExpiresAt!);

        StatusText.Text = "Running";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Warn");
        PipelineHint.Text = "Rotating identifiers (animation only on this build)";

        var steps = SpoofEngine.GetSteps();
        foreach (var s in steps)
            _steps.Add(new StepItem { Name = s.Name, Category = s.Category, State = StepState.Pending });

        int total = _steps.Count;
        for (int i = 0; i < total; i++)
        {
            var model = _steps[i];
            model.State = StepState.Running;
            await BringStepIntoView(model);
            var sw = Stopwatch.StartNew();
            await SpoofEngine.ExecuteAsync(steps[i], _ => { });
            sw.Stop();
            model.Duration = sw.Elapsed;
            model.State = StepState.Done;
            UpdateProgress(i + 1, total);
        }

        _timer.Stop();
        StatusText.Text = "Complete";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");
        PipelineHint.Text = $"{total} steps · {(DateTime.Now - _startTime).TotalSeconds:F1}s";

        SuccessHeadline.Text = "Spoof active";
        SuccessDetail.Text = string.IsNullOrEmpty(claim.ExpiresAt)
            ? "expires —"
            : $"expires {FormatExpiry(claim.ExpiresAt!)}";
        ShowSuccess();

        SetBusy(false, spoofLabel: "Spoof now");
    }

    // --- CLEAN: real CleaningEngine runs on this machine ---
    private async void CleanBtn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true, cleanLabel: "Cleaning…");
        _startTime = DateTime.Now;
        _timer.Start();

        StatusText.Text = "Cleaning";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Warn");
        ResetPipelineUi();
        PipelineHint.Text = "Running local trace sweep";

        var steps = CleaningEngine.GetSteps();
        foreach (var s in steps)
            _steps.Add(new StepItem { Name = s.Name, Category = s.Category, State = StepState.Pending });

        int total = _steps.Count;
        for (int i = 0; i < total; i++)
        {
            var model = _steps[i];
            model.State = StepState.Running;
            await BringStepIntoView(model);
            var sw = Stopwatch.StartNew();
            var failed = false;
            try
            {
                await Task.Run(() => steps[i].Execute(_ => { }));
            }
            catch
            {
                failed = true;
            }
            sw.Stop();
            model.Duration = sw.Elapsed;
            model.State = failed ? StepState.Failed : StepState.Done;
            UpdateProgress(i + 1, total);
        }

        _timer.Stop();
        StatusText.Text = "Clean done";
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource("Accent");
        PipelineHint.Text = $"{total} steps · {(DateTime.Now - _startTime).TotalSeconds:F1}s";

        SuccessHeadline.Text = "Traces cleaned";
        SuccessDetail.Text = $"{total} steps complete";
        ShowSuccess();

        SetBusy(false, cleanLabel: "Clean traces");
    }

    // Scrolls just enough to make the running card visible — never jams to end.
    // StackPanel items generate synchronously, but we yield one dispatcher tick
    // so the newly-updated row (icon + duration slot) finishes measuring first.
    private async Task BringStepIntoView(StepItem model)
    {
        await Dispatcher.Yield(DispatcherPriority.Background);
        if (StepList.ItemContainerGenerator.ContainerFromItem(model) is FrameworkElement el)
        {
            el.BringIntoView();
        }
    }

    private void ShowSuccess()
    {
        var fade = new DoubleAnimation(0, 0.98, TimeSpan.FromMilliseconds(360))
        {
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
        };
        SuccessOverlay.IsHitTestVisible = true;
        SuccessOverlay.BeginAnimation(OpacityProperty, fade);
    }

    private void ContinueBtn_Click(object sender, RoutedEventArgs e)
    {
        var fade = new DoubleAnimation(SuccessOverlay.Opacity, 0, TimeSpan.FromMilliseconds(220));
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
