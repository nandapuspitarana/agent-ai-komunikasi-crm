import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

void main() {
  group('TEST-AI-SEC: Client-side Anti-Flood & Rate Limiting Tests', () {
    test('TEST-AI-SEC05: RateLimiter should permit initial action immediately', () {
      final limiter = RateLimiter(interval: const Duration(milliseconds: 500));
      expect(limiter.allowAction(), isTrue);
    });

    test('TEST-AI-SEC06: RateLimiter should throttle repeated rapid actions', () {
      final limiter = RateLimiter(interval: const Duration(milliseconds: 500));

      expect(limiter.allowAction(), isTrue);
      // Immediate next calls within 500ms must be blocked
      expect(limiter.allowAction(), isFalse);
      expect(limiter.allowAction(), isFalse);
      expect(limiter.remainingThrottleTime.inMilliseconds, greaterThan(0));
    });

    test('TEST-AI-SEC07: RateLimiter should allow action again after duration elapsed', () async {
      final limiter = RateLimiter(interval: const Duration(milliseconds: 100));

      expect(limiter.allowAction(), isTrue);
      expect(limiter.allowAction(), isFalse);

      // Wait 120ms
      await Future.delayed(const Duration(milliseconds: 120));

      expect(limiter.allowAction(), isTrue);
    });
  });
}
