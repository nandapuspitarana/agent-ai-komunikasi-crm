import 'quick_reply_option.dart';

/// Result of [HtmlReplyParser.parse]: display text plus any quick-reply buttons
/// that were embedded in the reply as HTML.
class ParsedReply {
  final String text;
  final List<QuickReplyOption> options;

  const ParsedReply(this.text, this.options);
}

/// Turns the HTML the CRM web widget expects (`<div><button onclick=...>`)
/// into plain text + structured options for native UIs.
///
/// Servers that already return a structured `options` array never hit this;
/// it exists so older backends do not show raw tags to mobile users.
class HtmlReplyParser {
  static final RegExp _buttonRe =
      RegExp(r'<button\b([^>]*)>(.*?)</button>', caseSensitive: false, dotAll: true);

  // A wrapper element whose only children are buttons.
  static final RegExp _buttonWrapperRe = RegExp(
    r'<div\b[^>]*>\s*(?:<button\b[^>]*>.*?</button>\s*)+</div>',
    caseSensitive: false,
    dotAll: true,
  );

  static final RegExp _dataValueRe =
      RegExp(r'''data-value\s*=\s*(?:"([^"]*)"|'([^']*)')''', caseSensitive: false);
  static final RegExp _onclickRe =
      RegExp(r'''onclick\s*=\s*(?:"([^"]*)"|'([^']*)')''', caseSensitive: false);
  static final RegExp _textArgRe =
      RegExp(r'''\btext\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')''');

  static final RegExp _anchorRe =
      RegExp(r'''<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>(.*?)</a>''',
          caseSensitive: false, dotAll: true);

  // Only well known presentational tags are stripped, so text such as
  // "if a < b and c > d" is left alone.
  static final RegExp _knownTagRe = RegExp(
    r'</?[a-zA-Z][a-zA-Z0-9:-]*\b[^>]*>',
    caseSensitive: false,
    dotAll: true,
  );

  static ParsedReply parse(String input) {
    if (!input.contains('<')) return ParsedReply(input, const []);

    final options = <QuickReplyOption>[];
    for (final m in _buttonRe.allMatches(input)) {
      final label = _decodeEntities(_stripTags(m.group(2) ?? '')).trim();
      if (label.isEmpty) continue;
      final value = _valueFromAttributes(m.group(1) ?? '') ?? label;
      options.add(QuickReplyOption(label: label, value: value));
    }

    var text = input
        .replaceAll(_buttonWrapperRe, '')
        .replaceAll(_buttonRe, '');

    text = text.replaceAllMapped(_anchorRe, (m) {
      final href = (m.group(1) ?? m.group(2) ?? '').trim();
      final label = _stripTags(m.group(3) ?? '').trim();
      if (href.isEmpty || label == href) return label.isEmpty ? href : label;
      if (!(href.startsWith('http://') || href.startsWith('https://'))) return label;
      return label.isEmpty ? href : '$label ($href)';
    });

    // Convert bold and strong to markdown **
    text = text
        .replaceAll(RegExp(r'<\s*(?:b|strong)\b[^>]*>', caseSensitive: false), '**')
        .replaceAll(RegExp(r'<\s*/\s*(?:b|strong)\s*>', caseSensitive: false), '**');

    // Convert italic and em to markdown *
    text = text
        .replaceAll(RegExp(r'<\s*(?:i|em)\b[^>]*>', caseSensitive: false), '*')
        .replaceAll(RegExp(r'<\s*/\s*(?:i|em)\s*>', caseSensitive: false), '*');

    text = text
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p\s*>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<li\b[^>]*>', caseSensitive: false), '• ')
        .replaceAll(RegExp(r'</li\s*>', caseSensitive: false), '\n');
    text = _decodeEntities(_stripTags(text));
    text = text.replaceAll(RegExp(r'[ \t]+\n'), '\n').replaceAll(RegExp(r'\n{3,}'), '\n\n').trim();

    return ParsedReply(text, options);
  }

  static String? _valueFromAttributes(String attrs) {
    final data = _dataValueRe.firstMatch(attrs);
    if (data != null) {
      final v = _decodeEntities(data.group(1) ?? data.group(2) ?? '').trim();
      if (v.isNotEmpty) return v;
    }

    final onclick = _onclickRe.firstMatch(attrs);
    if (onclick != null) {
      // Browsers decode entities in the attribute before running the handler.
      final handler = _decodeEntities(onclick.group(1) ?? onclick.group(2) ?? '');
      final arg = _textArgRe.firstMatch(handler)?.group(1);
      if (arg != null) {
        final v = _unquote(arg).trim();
        if (v.isNotEmpty) return v;
      }
    }
    return null;
  }

  /// Decodes a JS string literal ('..' or "..") with the usual backslash escapes.
  static String _unquote(String literal) {
    final body = literal.substring(1, literal.length - 1);
    final out = StringBuffer();
    for (var i = 0; i < body.length; i++) {
      final ch = body[i];
      if (ch == r'\' && i + 1 < body.length) {
        final next = body[++i];
        switch (next) {
          case 'n':
            out.write('\n');
          case 't':
            out.write('\t');
          case 'u':
            final end = i + 5;
            final code = end <= body.length ? int.tryParse(body.substring(i + 1, end), radix: 16) : null;
            if (code != null) {
              out.writeCharCode(code);
              i += 4;
            } else {
              out.write('u');
            }
          default:
            out.write(next);
        }
      } else {
        out.write(ch);
      }
    }
    return out.toString();
  }

  static String _stripTags(String s) => s.replaceAll(_knownTagRe, '');

  static String _decodeEntities(String s) {
    if (!s.contains('&')) return s;
    return s
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&');
  }
}
