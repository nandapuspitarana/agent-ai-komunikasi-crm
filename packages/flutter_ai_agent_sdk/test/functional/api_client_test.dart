import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockHttpClient extends Mock implements http.Client {}

void main() {
  setUpAll(() {
    registerFallbackValue(Uri());
  });

  group('TEST-AI-U: API Client Functional Tests', () {
    late MockHttpClient mockClient;
    late AiAgentConfig config;
    late AiAgentApiClient apiClient;

    setUp(() {
      mockClient = MockHttpClient();
      config = const AiAgentConfig(
        apiUrl: 'https://cb242.ceosuite.com',
        tenantId: 'default-tenant',
      );
      apiClient = AiAgentApiClient(config: config, httpClient: mockClient);
    });

    test('TEST-AI-U06: initWidget should call /api/widget/init and return config', () async {
      when(() => mockClient.post(
            Uri.parse('https://cb242.ceosuite.com/api/widget/init'),
            headers: any(named: 'headers'),
            body: any(named: 'body'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'tenant': {'name': 'CEO Suite Test'},
              'config': {
                'welcomeMessage': 'Welcome to CEO Suite!',
                'welcomeMessageOptions': 'Meeting Room, Private Office',
              },
            }),
            200,
          ));

      final result = await apiClient.initWidget(contactId: 'client_123');

      expect(result['tenant']['name'], equals('CEO Suite Test'));
      expect(result['config']['welcomeMessage'], equals('Welcome to CEO Suite!'));
    });

    test('TEST-AI-U07: sendMessage should send payload and parse bot response', () async {
      when(() => mockClient.post(
            Uri.parse('https://cb242.ceosuite.com/api/widget/message'),
            headers: any(named: 'headers'),
            body: any(named: 'body'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'reply': 'Kami memiliki center di Jakarta dan KL.',
              'responseType': 'text',
              'options': 'Jakarta, Kuala Lumpur',
              'handoffOccurred': false,
            }),
            200,
          ));

      final reply = await apiClient.sendMessage(
        sessionId: 'session_abc',
        message: 'Di mana saja lokasi CEO Suite?',
      );

      expect(reply.text, contains('Jakarta dan KL'));
      expect(reply.options.length, equals(2));
      expect(reply.isHandoff, isFalse);
    });

    test('TEST-AI-U08: Should retry once on network connection error and succeed', () async {
      int callCount = 0;
      when(() => mockClient.post(
            any(),
            headers: any(named: 'headers'),
            body: any(named: 'body'),
          )).thenAnswer((_) async {
        callCount++;
        if (callCount == 1) {
          throw http.ClientException('Connection reset by peer');
        }
        return http.Response(
          jsonEncode({'reply': 'Success on retry!'}),
          200,
        );
      });

      final reply = await apiClient.sendMessage(
        sessionId: 'session_retry',
        message: 'Hello',
      );

      expect(callCount, equals(2));
      expect(reply.text, equals('Success on retry!'));
    });

    test('TEST-AI-U09: Should throw AiAgentApiException on HTTP 500 error', () async {
      when(() => mockClient.post(
            any(),
            headers: any(named: 'headers'),
            body: any(named: 'body'),
          )).thenAnswer((_) async => http.Response('Internal Server Error', 500));

      expect(
        () => apiClient.sendMessage(
          sessionId: 'session_500',
          message: 'Trigger 500',
        ),
        throwsA(isA<AiAgentApiException>()),
      );
    });

    test('TEST-AI-U10: Should reject empty or whitespace message before making network call', () async {
      expect(
        () => apiClient.sendMessage(
          sessionId: 'session_empty',
          message: '   ',
        ),
        throwsA(isA<AiAgentApiException>()),
      );

      verifyNever(() => mockClient.post(any(), headers: any(named: 'headers'), body: any(named: 'body')));
    });

    test('TEST-AI-U18: sendMessage should extract server sessionId for session continuity', () async {
      when(() => mockClient.post(
            Uri.parse('https://cb242.ceosuite.com/api/widget/message'),
            headers: any(named: 'headers'),
            body: any(named: 'body'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'reply': 'Password wifi adalah ceosuite2026',
              'sessionId': 'server_session_456',
              'responseType': 'text',
              'handoffOccurred': false,
            }),
            200,
          ));

      final reply = await apiClient.sendMessage(
        sessionId: 'client_initial_session',
        message: 'Password wifi apa ya?',
      );

      expect(reply.sessionId, equals('server_session_456'));
      expect(reply.text, contains('Password wifi'));
    });
  });
}
