import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

/// One styled run of a chat message, produced by [parseMessageRuns].
class MessageRun {
  final String text;
  final bool bold;

  /// Set for a tappable link; `null` for plain text.
  final String? url;

  const MessageRun(this.text, {this.bold = false, this.url});

  @override
  bool operator ==(Object other) =>
      other is MessageRun && other.text == text && other.bold == bold && other.url == url;

  @override
  int get hashCode => Object.hash(text, bold, url);

  @override
  String toString() => 'MessageRun($text${bold ? ', bold' : ''}${url != null ? ', $url' : ''})';
}

// **bold** | [label](https://url) | bare https://url
final RegExp _tokenRe = RegExp(
  r'\*\*(.+?)\*\*|\[([^\]\n]+)\]\((https?://[^)\s]+)\)|(https?://[^\s<>()\[\]]+)',
);

// Punctuation that ends a sentence rather than a bare URL.
final RegExp _trailingRe = RegExp(r'[.,;:!?]+$');

/// Splits [text] into runs: `**bold**`, `[label](url)` and bare `http(s)` URLs
/// are recognised, everything else is plain. Pure so it can be tested directly.
List<MessageRun> parseMessageRuns(String rawText) {
  var text = rawText;
  if (text.contains('<')) {
    text = text
        .replaceAllMapped(
          RegExp(r'''<a\b[^>]*?href\s*=\s*['"]([^'"]+)['"][^>]*>([\s\S]*?)</a>''', caseSensitive: false),
          (m) {
            final href = (m.group(1) ?? '').trim();
            final label = (m.group(2) ?? '').replaceAll(RegExp(r'<[^>]+>'), '').trim();
            if (href.isEmpty) return label;
            if (label.isEmpty || label == href) return href;
            return '[$label]($href)';
          },
        )
        .replaceAll(RegExp(r'<\s*(?:b|strong)\b[^>]*>', caseSensitive: false), '**')
        .replaceAll(RegExp(r'<\s*/\s*(?:b|strong)\s*>', caseSensitive: false), '**')
        .replaceAll(RegExp(r'<\s*(?:i|em)\b[^>]*>', caseSensitive: false), '*')
        .replaceAll(RegExp(r'<\s*/\s*(?:i|em)\s*>', caseSensitive: false), '*')
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p\s*>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<li\b[^>]*>', caseSensitive: false), '• ')
        .replaceAll(RegExp(r'</li\s*>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</?[a-zA-Z][a-zA-Z0-9:-]*\b[^>]*>', dotAll: true), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
  }

  final runs = <MessageRun>[];
  var cursor = 0;

  for (final m in _tokenRe.allMatches(text)) {
    if (m.start > cursor) runs.add(MessageRun(text.substring(cursor, m.start)));

    if (m.group(1) != null) {
      runs.add(MessageRun(m.group(1)!, bold: true));
    } else if (m.group(3) != null) {
      runs.add(MessageRun(m.group(2)!, url: m.group(3)));
    } else {
      final raw = m.group(4)!;
      final trailing = _trailingRe.firstMatch(raw)?.group(0) ?? '';
      final url = raw.substring(0, raw.length - trailing.length);
      runs.add(MessageRun(url, url: url));
      if (trailing.isNotEmpty) runs.add(MessageRun(trailing));
    }
    cursor = m.end;
  }
  if (cursor < text.length) runs.add(MessageRun(text.substring(cursor)));
  return runs;
}

/// Selectable message text with bold and tappable links.
///
/// Links are only styled/tappable when [onLaunchUrl] is given, so an app that
/// does not handle URLs never shows dead links.
class RichMessageText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final Color linkColor;
  final ValueChanged<String>? onLaunchUrl;

  const RichMessageText({
    super.key,
    required this.text,
    required this.style,
    required this.linkColor,
    this.onLaunchUrl,
  });

  @override
  State<RichMessageText> createState() => _RichMessageTextState();
}

class _RichMessageTextState extends State<RichMessageText> {
  final List<TapGestureRecognizer> _recognizers = [];

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _disposeRecognizers();
    final runs = parseMessageRuns(widget.text);

    // Nothing to decorate: keep the cheap plain path (and exact text matching).
    final plain = runs.every((r) => !r.bold && r.url == null);
    if (plain) return SelectableText(widget.text, style: widget.style);

    final spans = <InlineSpan>[];
    for (final run in runs) {
      final url = run.url;
      final canOpen = url != null && widget.onLaunchUrl != null;
      TapGestureRecognizer? recognizer;
      if (canOpen) {
        recognizer = TapGestureRecognizer()..onTap = () => widget.onLaunchUrl!(url);
        _recognizers.add(recognizer);
      }
      spans.add(TextSpan(
        text: run.text,
        recognizer: recognizer,
        style: TextStyle(
          fontWeight: run.bold ? FontWeight.w700 : null,
          color: canOpen ? widget.linkColor : null,
          decoration: canOpen ? TextDecoration.underline : null,
          decorationColor: canOpen ? widget.linkColor : null,
        ),
      ));
    }
    return SelectableText.rich(TextSpan(children: spans), style: widget.style);
  }
}
