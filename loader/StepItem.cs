using System.ComponentModel;
using System.Windows;

namespace TemporarySpoofer;

public enum StepState { Pending, Running, Done, Failed }

// Backs one card in the live step list. Raises PropertyChanged for the
// visibilities and duration label so WPF re-renders without a rebuild.
public sealed class StepItem : INotifyPropertyChanged
{
    private StepState _state;
    private TimeSpan _duration;

    public string Name     { get; init; } = "";
    public string Category { get; init; } = "";

    public StepState State
    {
        get => _state;
        set
        {
            if (_state == value) return;
            _state = value;
            Notify(nameof(State));
            Notify(nameof(ShowPending));
            Notify(nameof(ShowRunning));
            Notify(nameof(ShowDone));
            Notify(nameof(ShowFailed));
            Notify(nameof(NameOpacity));
        }
    }

    public TimeSpan Duration
    {
        get => _duration;
        set
        {
            if (_duration == value) return;
            _duration = value;
            Notify(nameof(DurationLabel));
        }
    }

    public Visibility ShowPending => _state == StepState.Pending ? Visibility.Visible : Visibility.Collapsed;
    public Visibility ShowRunning => _state == StepState.Running ? Visibility.Visible : Visibility.Collapsed;
    public Visibility ShowDone    => _state == StepState.Done    ? Visibility.Visible : Visibility.Collapsed;
    public Visibility ShowFailed  => _state == StepState.Failed  ? Visibility.Visible : Visibility.Collapsed;

    public double NameOpacity => _state == StepState.Pending ? 0.45 : 1.0;

    public string DurationLabel => _state switch
    {
        StepState.Done   when _duration > TimeSpan.Zero => $"{_duration.TotalMilliseconds:F0} ms",
        StepState.Failed                                => "failed",
        _                                               => "",
    };

    public event PropertyChangedEventHandler? PropertyChanged;
    private void Notify(string n) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(n));
}
