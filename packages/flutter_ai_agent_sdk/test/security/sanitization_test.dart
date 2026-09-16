import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

void main() {
  group('TEST-AI-SEC: Security & Anti-XSS Sanitization Tests', () {
    test('TEST-AI-SEC01: ContentSanitizer should strip script tags and javascript code', () {
      const maliciousPayload = "Hello <script>alert('xss_attack')</script>CEO Suite";
      final clean = ContentSanitizer.sanitize(maliciousPayload);

      expect(clean, isNot(contains('<script>')));
      expect(clean, isNot(contains("alert('xss_attack')")));
      expect(clean, equals('Hello CEO Suite'));
    });

    test('TEST-AI-SEC02: ContentSanitizer should strip inline event handlers and iframes', () {
      const payload = "<img src='invalid' onerror='stealData()' /><iframe src='http://evil.com'></iframe>Selamat Datang";
      final clean = ContentSanitizer.sanitize(payload);

      expect(clean, isNot(contains('onerror')));
      expect(clean, isNot(contains('stealData')));
      expect(clean, isNot(contains('<iframe')));
      expect(clean, contains('Selamat Datang'));
    });

    test('TEST-AI-SEC03: toPlainText should extract human-readable text from HTML safely', () {
      const htmlText = "<strong>CEO Suite</strong><br/>Layanan sewa kantor eksekutif.<p>Hubungi kami segera.</p>";
      final plain = ContentSanitizer.toPlainText(htmlText);

      expect(plain, isNot(contains('<strong>')));
      expect(plain, isNot(contains('<br/>')));
      expect(plain, contains('CEO Suite'));
      expect(plain, contains('Layanan sewa kantor eksekutif.'));
      expect(plain, contains('Hubungi kami segera.'));
    });

    test('TEST-AI-SEC04: isSafeUrl should only allow http/https and reject dangerous schemes', () {
      expect(ContentSanitizer.isSafeUrl('https://ceosuite.com/locations'), isTrue);
      expect(ContentSanitizer.isSafeUrl('http://ceosuite.com'), isTrue);

      expect(ContentSanitizer.isSafeUrl("javascript:alert('xss')"), isFalse);
      expect(ContentSanitizer.isSafeUrl('data:text/html,<script>alert(1)</script>'), isFalse);
      expect(ContentSanitizer.isSafeUrl('file:///etc/passwd'), isFalse);
      expect(ContentSanitizer.isSafeUrl(''), isFalse);
      expect(ContentSanitizer.isSafeUrl(null), isFalse);
    });
  });
}
