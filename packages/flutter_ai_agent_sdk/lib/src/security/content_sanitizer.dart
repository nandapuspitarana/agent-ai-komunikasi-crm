/// Security utility to sanitize chat messages and prevent XSS or Script Injections.
class ContentSanitizer {
  static final RegExp _scriptTagRegex = RegExp(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', caseSensitive: false);
  static final RegExp _iframeTagRegex = RegExp(r'<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>', caseSensitive: false);
  static final RegExp _eventHandlerRegex = RegExp(r'\s+(on[a-zA-Z]+)\s*=\s*(["\x27]?)[^"\x27>]*\2', caseSensitive: false);
  static final RegExp _javascriptUriRegex = RegExp(r'javascript:\s*[^"\x27\s>]+', caseSensitive: false);
  static final RegExp _htmlTagsRegex = RegExp(r'<[^>]*>');

  /// Strips malicious scripts, event handlers, and iframes from input.
  static String sanitize(String input) {
    if (input.isEmpty) return '';

    String cleaned = input;
    // Remove <script>...</script>
    cleaned = cleaned.replaceAll(_scriptTagRegex, '');
    // Remove <iframe>...</iframe>
    cleaned = cleaned.replaceAll(_iframeTagRegex, '');
    // Remove event handlers (e.g. onerror=..., onclick=...)
    cleaned = cleaned.replaceAll(_eventHandlerRegex, '');
    // Remove javascript: URIs
    cleaned = cleaned.replaceAll(_javascriptUriRegex, '');

    return cleaned.trim();
  }

  /// Converts rich HTML into clean plain text for standard mobile Text widgets.
  static String toPlainText(String html) {
    final sanitized = sanitize(html);
    return sanitized
        .replaceAll('<br/>', '\n')
        .replaceAll('<br>', '\n')
        .replaceAll('</p>', '\n\n')
        .replaceAll(_htmlTagsRegex, '')
        .trim();
  }

  /// Validates if a given URL is safe (only http and https allowed).
  static bool isSafeUrl(String? url) {
    if (url == null || url.trim().isEmpty) return false;
    final uri = Uri.tryParse(url.trim());
    if (uri == null) return false;
    return uri.scheme == 'http' || uri.scheme == 'https';
  }
}
