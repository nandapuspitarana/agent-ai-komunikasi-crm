/// Client-side rate limiter / flood protection to prevent rapid double-clicks
/// or chat spamming from overloading the AI server.
class RateLimiter {
  final Duration interval;
  DateTime? _lastExecutionTime;

  RateLimiter({required this.interval});

  /// Evaluates whether an action is permitted.
  /// Returns `true` if allowed, `false` if throttled.
  bool allowAction() {
    final now = DateTime.now();
    if (_lastExecutionTime == null || now.difference(_lastExecutionTime!) >= interval) {
      _lastExecutionTime = now;
      return true;
    }
    return false;
  }

  /// Remaining duration before next action is permitted.
  Duration get remainingThrottleTime {
    if (_lastExecutionTime == null) return Duration.zero;
    final elapsed = DateTime.now().difference(_lastExecutionTime!);
    final diff = interval - elapsed;
    return diff.isNegative ? Duration.zero : diff;
  }

  void reset() {
    _lastExecutionTime = null;
  }
}
