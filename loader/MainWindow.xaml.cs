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
    private readonly ObservableCollection<StepItem> _steps = new();
    private readonly UserSettings _settings = UserSettings.Load();
    private IReadOnlyList<VersionManager.Entry> _versions = Array.Empty<VersionManager.Entry>();
    private DateTime _startTime;
    private bool _authed;

    public MainWindow()
    {
        InitializeComponent();

        StepList.ItemsSource = _steps;
        StepList.ItemTemplate = (DataTemplate)FindResource("StepTemplate");

        if (!string.IsNullOrEmpty(_settings.PinnedVersion) &&
            !string.Equals(_settings.PinnedVersion, Build.Codename, StringComparison.OrdinalIgnoreCase))
        {
            PinnedBannerVersion.Text = " " + _settings.PinnedVersion + " ";
            PinnedBanner.Visibility  = Visibility.Visible;
        }

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

    private void UnpinBanner_Click(object sender, RoutedEventArgs e)
    {
        _settings.PinnedVersion = null;
        _settings.Save();
        RestartSub.Text = "Returning to latest";
        StartRestartCountdownLatest();
    }

    private void StartRestartCountdownLatest()
    {
        var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(220))
        { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } };
        RestartOverlay.IsHitTestVisible = true;
        RestartOverlay.BeginAnimation(OpacityProperty, fadeIn);

        var ringAnim = new DoubleAnimation(0, 439.82, TimeSpan.FromSeconds(3));
        RestartRing.BeginAnimation(System.Windows.Shapes.Shape.StrokeDashOffsetProperty, ringAnim);

        RestartCount.Text = "3";
        int left = 3;
        var tick = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        tick.Tick += (_, _) =>
        {
            left--;
            if (left > 0) RestartCount.Text = left.ToString();
            else
            {
                tick.Stop();
                RestartCount.Text = "0";
                try
                {
                    var tmp = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "ts_latest.exe");
                    using (var http = new System.Net.Http.HttpClient())
                    {
                        var bytes = http.GetByteArrayAsync($"{ApiClient.BaseUrl}/loader.exe").GetAwaiter().GetResult();
                        System.IO.File.WriteAllBytes(tmp, bytes);
                    }
                    Process.Start(new ProcessStartInfo { FileName = tmp, UseShellExecute = false });
                }
                catch { /* ignore */ }
                Application.Current.Shutdown();
            }
        };
        tick.Start();
    }

    // ---------------- Settings overlay ----------------

    private void SettingsBtn_Click(object sender, RoutedEventArgs e)
    {
        BindSettingsToUi();
        AboutBuild.Text = $"Build {Build.Codename}  ·  released {Build.ReleasedUtc}";
        var fade = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(220))
        { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } };
        SettingsOverlay.IsHitTestVisible = true;
        SettingsOverlay.BeginAnimation(OpacityProperty, fade);
        _ = LoadVersionListAsync();
    }

    private void SettingsClose_Click(object sender, RoutedEventArgs e)
    {
        var fade = new DoubleAnimation(SettingsOverlay.Opacity, 0, TimeSpan.FromMilliseconds(180));
        fade.Completed += (_, _) => SettingsOverlay.IsHitTestVisible = false;
        SettingsOverlay.BeginAnimation(OpacityProperty, fade);
    }

    private void SettingsSave_Click(object sender, RoutedEventArgs e)
    {
        PullSettingsFromUi();
        _settings.Save();
        SettingsClose_Click(sender, e);
    }

    private void DevOpts_Changed(object sender, RoutedEventArgs e)
    {
        DevOptsPanel.Visibility = DevOptsToggle.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
    }

    private void BindSettingsToUi()
    {
        CompNetwork.IsChecked = _settings.SpoofNetwork;
        CompStorage.IsChecked = _settings.SpoofStorage;
        CompSystem.IsChecked  = _settings.SpoofSystem;
        CompCache.IsChecked   = _settings.SpoofCache;
        CompAudit.IsChecked   = _settings.SpoofAudit;
        CompVerify.IsChecked  = _settings.SpoofVerify;
        CompBackup.IsChecked  = _settings.SpoofBackup;

        ModeStealth.IsChecked  = _settings.Mode == "stealth";
        ModeTurbo.IsChecked    = _settings.Mode == "turbo";
        ModeCautious.IsChecked = _settings.Mode == "cautious";

        ThemeDefault.IsChecked  = _settings.Theme == "default";
        ThemeMidnight.IsChecked = _settings.Theme == "midnight";
        ThemeOcean.IsChecked    = _settings.Theme == "ocean";
        ThemeAmber.IsChecked    = _settings.Theme == "amber";

        DevOptsToggle.IsChecked = _settings.DeveloperOptions;
        DevOptsPanel.Visibility = _settings.DeveloperOptions ? Visibility.Visible : Visibility.Collapsed;

        PinnedHint.Text = string.IsNullOrEmpty(_settings.PinnedVersion)
            ? "Running latest."
            : $"Pinned to {_settings.PinnedVersion} — restart loader to apply.";
    }

    private void PullSettingsFromUi()
    {
        _settings.SpoofNetwork = CompNetwork.IsChecked == true;
        _settings.SpoofStorage = CompStorage.IsChecked == true;
        _settings.SpoofSystem  = CompSystem.IsChecked  == true;
        _settings.SpoofCache   = CompCache.IsChecked   == true;
        _settings.SpoofAudit   = CompAudit.IsChecked   == true;
        _settings.SpoofVerify  = CompVerify.IsChecked  == true;
        _settings.SpoofBackup  = CompBackup.IsChecked  == true;

        if (ModeTurbo.IsChecked == true)         _settings.Mode = "turbo";
        else if (ModeCautious.IsChecked == true) _settings.Mode = "cautious";
        else                                     _settings.Mode = "stealth";

        if (ThemeMidnight.IsChecked == true)     _settings.Theme = "midnight";
        else if (ThemeOcean.IsChecked == true)   _settings.Theme = "ocean";
        else if (ThemeAmber.IsChecked == true)   _settings.Theme = "amber";
        else                                     _settings.Theme = "default";

        _settings.DeveloperOptions = DevOptsToggle.IsChecked == true;
    }

    private async Task LoadVersionListAsync()
    {
        VersionsLoading.Visibility = Visibility.Visible;
        VersionList.Items.Clear();
        _versions = await VersionManager.ListAsync();
        VersionsLoading.Visibility = _versions.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        if (_versions.Count == 0)
        {
            VersionsLoading.Text = "Couldn't reach server.";
            return;
        }
        foreach (var v in _versions) VersionList.Items.Add(BuildVersionRow(v));
    }

    private UIElement BuildVersionRow(VersionManager.Entry v)
    {
        var isCurrent = string.Equals(v.Codename, Build.Codename, StringComparison.OrdinalIgnoreCase);
        var isPinned  = string.Equals(v.Codename, _settings.PinnedVersion, StringComparison.OrdinalIgnoreCase);

        var card = new System.Windows.Controls.Border
        {
            Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x10, 0x10, 0x18)),
            BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x1E, 0x1E, 0x26)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8),
            Padding = new Thickness(12, 10, 12, 10),
            Margin = new Thickness(0, 0, 0, 6),
        };
        var grid = new System.Windows.Controls.Grid();
        grid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = GridLength.Auto });

        var sp = new System.Windows.Controls.StackPanel { VerticalAlignment = VerticalAlignment.Center };
        var header = new System.Windows.Controls.StackPanel { Orientation = System.Windows.Controls.Orientation.Horizontal };
        header.Children.Add(new System.Windows.Controls.TextBlock
        {
            Text = v.Codename,
            FontSize = 13, FontWeight = FontWeights.SemiBold,
            Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0xE0, 0xE0, 0xE4)),
        });
        if (isCurrent)              header.Children.Add(BuildBadge("RUNNING", 0x16, 0xA3, 0x4A));
        else if (v.IsLatest)        header.Children.Add(BuildBadge("LATEST",  0xB2, 0xD6, 0xF8));
        if (v.Blocked)              header.Children.Add(BuildBadge("BLOCKED", 0xDC, 0x26, 0x26));
        sp.Children.Add(header);
        sp.Children.Add(new System.Windows.Controls.TextBlock
        {
            Text = $"Released {v.ReleasedUtc}",
            FontSize = 10, Margin = new Thickness(0, 3, 0, 0),
            Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x66, 0x66, 0x70)),
        });
        System.Windows.Controls.Grid.SetColumn(sp, 0);
        grid.Children.Add(sp);

        string label; Style style; bool enabled; System.Windows.Media.Color fg;
        if (isCurrent)      { label = "Current";  style = (Style)FindResource("GhostBtn"); enabled = false; fg = System.Windows.Media.Color.FromRgb(0x8A, 0x8A, 0x95); }
        else if (v.Blocked) { label = "Blocked";  style = (Style)FindResource("GhostBtn"); enabled = false; fg = System.Windows.Media.Color.FromRgb(0x8A, 0x8A, 0x95); }
        else                { label = "Roll back"; style = (Style)FindResource("FlatBtn");  enabled = true;  fg = System.Windows.Media.Color.FromRgb(0x0A, 0x0A, 0x0A); }

        var btn = new System.Windows.Controls.Button
        {
            Style = style,
            Padding = new Thickness(14, 6, 14, 6),
            MinWidth = 110,
            VerticalAlignment = VerticalAlignment.Center,
            IsEnabled = enabled,
            Content = new System.Windows.Controls.TextBlock
            {
                Text = label,
                FontSize = 12, FontWeight = FontWeights.SemiBold,
                Foreground = new System.Windows.Media.SolidColorBrush(fg),
            },
        };
        if (enabled) btn.Click += (_, _) => BeginRollback(v);
        System.Windows.Controls.Grid.SetColumn(btn, 1);
        grid.Children.Add(btn);
        card.Child = grid;
        return card;
    }

    private static System.Windows.Controls.Border BuildBadge(string text, byte r, byte g, byte b)
    {
        return new System.Windows.Controls.Border
        {
            Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(0x33, r, g, b)),
            CornerRadius = new CornerRadius(4),
            Padding = new Thickness(6, 1, 6, 1),
            Margin = new Thickness(8, 0, 0, 0),
            VerticalAlignment = VerticalAlignment.Center,
            Child = new System.Windows.Controls.TextBlock
            {
                Text = text,
                FontSize = 9,
                FontWeight = FontWeights.Bold,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(r, g, b)),
            },
        };
    }

    private void BeginRollback(VersionManager.Entry v)
    {
        // Persist the pin so the auto-launched child boots the archived build.
        _settings.PinnedVersion = v.Codename;
        _settings.Save();
        RestartSub.Text = $"Rolling back to {v.Codename}";
        StartRestartCountdown(v.Codename);
    }

    // 3-second countdown with a ring that drains from full → empty, then
    // kicks off the download + launch + shutdown flow. Pure XAML animation
    // for the ring; a DispatcherTimer updates the numeric label.
    private void StartRestartCountdown(string targetCodename)
    {
        // Fade the overlay in and make it modal.
        var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(220))
        { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } };
        RestartOverlay.IsHitTestVisible = true;
        RestartOverlay.BeginAnimation(OpacityProperty, fadeIn);

        // Ring: StrokeDashOffset 0 → 439.82 (full circumference) over 3s.
        // No easing — linear drain reads as a clean countdown.
        var ringAnim = new DoubleAnimation(0, 439.82, TimeSpan.FromSeconds(3));
        RestartRing.BeginAnimation(System.Windows.Shapes.Shape.StrokeDashOffsetProperty, ringAnim);

        // Count 3 → 2 → 1 in the center label.
        RestartCount.Text = "3";
        int left = 3;
        var tick = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        tick.Tick += (_, _) =>
        {
            left--;
            if (left > 0) RestartCount.Text = left.ToString();
            else
            {
                tick.Stop();
                RestartCount.Text = "0";
                LaunchPinnedAndQuit(targetCodename);
            }
        };
        tick.Start();
    }

    private void LaunchPinnedAndQuit(string codename)
    {
#if RESELLER
        var remote = $"{ApiClient.BaseUrl}/loader/v/{Uri.EscapeDataString(codename)}-reseller";
#else
        var remote = $"{ApiClient.BaseUrl}/loader/v/{Uri.EscapeDataString(codename)}";
#endif
        try
        {
            var dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "ts_" + Guid.NewGuid().ToString("N").Substring(0, 8));
            System.IO.Directory.CreateDirectory(dir);
            var exe = System.IO.Path.Combine(dir, "loader.exe");
            using (var http = new System.Net.Http.HttpClient())
            {
                var bytes = http.GetByteArrayAsync(remote).GetAwaiter().GetResult();
                System.IO.File.WriteAllBytes(exe, bytes);
            }
            Process.Start(new ProcessStartInfo { FileName = exe, WorkingDirectory = dir, UseShellExecute = false });
        }
        catch { /* best effort — the pinned-version startup check in App.xaml.cs catches us next launch too */ }
        Application.Current.Shutdown();
    }

    private async Task AuthByIpAsync()
    {
        PipelineHint.Text = "Looking up a license bound to this IP…";

        var r = await Session.Api.AuthByIpAsync();
        if (!r.Ok)
        {
            IdleHeadline.Text = "No license on this network.";
            IdleSubline.Text  = "Buy a pass at tempspoofer.com, then rerun the loader.";
            PipelineHint.Text = r.Error ?? "Lookup failed.";
            return;
        }

        Session.Tier      = r.Tier ?? "";
        Session.Status    = r.Status ?? "";
        Session.ExpiresAt = r.ExpiresAt;
        Session.Ip        = r.Ip;
        FinishAuth();
    }

    private void FinishAuth()
    {
        _authed = true;
        BrandLabel.Text = Session.DisplayName;
        Title           = Session.DisplayName;

        if (!string.IsNullOrEmpty(Session.ExpiresAt))
            ExpiryText.Text = FormatExpiry(Session.ExpiresAt);

        SpoofBtn.IsEnabled = true;
        CleanBtn.IsEnabled = true;
        PipelineHint.Text  = $"Tier: {Session.Tier}";
    }

    private void TitleBar_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed) DragMove();
    }
    private void MinBtn_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Application.Current.Shutdown();

    private void UpdateProgress(int done, int total)
    {
        double pct = total > 0 ? (double)done / total : 0;
        double target = pct * (ActualWidth - 32);
        var anim = new DoubleAnimation(target, TimeSpan.FromMilliseconds(260))
        {
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
        };
        ProgressBar.BeginAnimation(WidthProperty, anim);
    }

    private void SetBusy(bool busy, string? spoofLabel = null, string? cleanLabel = null)
    {
        CleanBtn.IsEnabled = !busy && _authed;
        SpoofBtn.IsEnabled = !busy && _authed;
        if (spoofLabel is not null) SpoofBtnLabel.Text = spoofLabel;
        if (cleanLabel is not null) CleanBtnLabel.Text = cleanLabel;
    }

    private void ResetPipelineUi()
    {
        _steps.Clear();
        IdleHint.Visibility = Visibility.Collapsed;
    }

    private async void SpoofBtn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true, spoofLabel: "SPOOFING…");
        _startTime = DateTime.Now;


        ResetPipelineUi();
        PipelineHint.Text = "Activating license…";

        var claim = await Session.Api.ClaimAsync(Session.LicenseKey);
        if (!claim.Ok)
        {
            PipelineHint.Text = claim.Error ?? "Claim failed.";
            SetBusy(false, spoofLabel: "2. SPOOF HWID");
            return;
        }

        if (!string.IsNullOrEmpty(claim.ExpiresAt))
            ExpiryText.Text = FormatExpiry(claim.ExpiresAt!);

        PipelineHint.Text = "Rotating hardware identifiers";

        var steps = SpoofEngine.GetSteps()
            .Where(s => _settings.IsCategoryEnabled(s.Category))
            .ToList();
        if (steps.Count == 0)
        {
            PipelineHint.Text = "No spoof components enabled in Settings.";
            SetBusy(false, spoofLabel: "2. SPOOF HWID");
            return;
        }
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


        PipelineHint.Text = $"{total} steps · {(DateTime.Now - _startTime).TotalSeconds:F1}s";

        SuccessHeadline.Text = "Spoof active";
        SuccessDetail.Text = string.IsNullOrEmpty(claim.ExpiresAt)
            ? "expires —"
            : $"expires {FormatExpiry(claim.ExpiresAt!)}";
        ShowSuccess();

        SetBusy(false, spoofLabel: "2. SPOOF HWID");
    }

    private async void CleanBtn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true, cleanLabel: "CLEANING…");
        _startTime = DateTime.Now;


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


        PipelineHint.Text = $"{total} steps · {(DateTime.Now - _startTime).TotalSeconds:F1}s";

        SuccessHeadline.Text = "Traces cleaned";
        SuccessDetail.Text = $"{total} steps complete";
        ShowSuccess();

        SetBusy(false, cleanLabel: "1. CLEAN TRACES");
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
