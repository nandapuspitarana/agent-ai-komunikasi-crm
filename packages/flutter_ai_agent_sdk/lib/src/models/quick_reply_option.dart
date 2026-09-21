/// Represents a Quick Reply button option.
class QuickReplyOption {
  final String label;
  final String value;

  const QuickReplyOption({
    required this.label,
    required this.value,
  });

  /// Parses comma-separated options string with pipe syntax support.
  /// Example: "Bangkok|Bangkok Private Office, Jakarta, KL|Kuala Lumpur"
  static List<QuickReplyOption> parseList(dynamic raw) {
    if (raw == null) return const [];

    if (raw is List) {
      return raw.map((item) {
        if (item is QuickReplyOption) return item;
        final str = item.toString().trim();
        return _parseSingle(str);
      }).where((opt) => opt.label.isNotEmpty).toList();
    }

    if (raw is String) {
      return raw
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .map(_parseSingle)
          .where((opt) => opt.label.isNotEmpty)
          .toList();
    }

    return const [];
  }

  static QuickReplyOption _parseSingle(String str) {
    final pipeIdx = str.indexOf('|');
    if (pipeIdx != -1) {
      final label = str.substring(0, pipeIdx).trim();
      final value = str.substring(pipeIdx + 1).trim();
      return QuickReplyOption(label: label, value: value.isEmpty ? label : value);
    }
    return QuickReplyOption(label: str, value: str);
  }

  factory QuickReplyOption.fromJson(Map<String, dynamic> json) => QuickReplyOption(
        label: json['label'] as String? ?? '',
        value: json['value'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'label': label, 'value': value};
}
