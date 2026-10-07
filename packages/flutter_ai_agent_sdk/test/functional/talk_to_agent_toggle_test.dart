import 'package:flutter/material.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockApiClient extends Mock implements AiAgentApiClient {}

void main() {
  setUpAll(() {
    registerFallbackValue(Uri.parse('http://localhost'));
  });

  group('TEST-AI-F60 Talk to Human Agent Toggle & Email Redirection', () {
    late MockApiClient api;

    setUp(() {
      api = MockApiClient();
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Halo, ada yang bisa dibantu?',
            'botName': 'Claire',
            'humanHandoffEnabled': true,
          },
        },
      );
    });

    testWidgets('TEST-AI-F61 when humanHandoffEnabled is true, button sends handoff message', (tester) async {
      when(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) async => ChatMessage(
            id: 'h1',
            sender: MessageSender.agent,
            senderName: 'Sarah',
            text: 'Halo, saya Sarah.',
            timestamp: DateTime.now(),
            isHandoff: true,
          ));

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
        ),
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Talk to Human Agent'), findsOneWidget);
      expect(find.byIcon(Icons.phone_in_talk_outlined), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      verify(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: 'Saya ingin bicara dengan agen manusia',
            contactId: any(named: 'contactId'),
          )).called(1);
    });

    testWidgets('TEST-AI-F62 when humanHandoffEnabled is false, button triggers email redirect and skips sendMessage', (tester) async {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Halo, ada yang bisa dibantu?',
            'botName': 'Claire',
            'humanHandoffEnabled': false,
            'fallbackEmail': 'support@ceosuite.com',
          },
        },
      );

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
        ),
      );

      String? redirectedEmail;
      String? launchedUrl;

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            onEmailRedirect: (email) => redirectedEmail = email,
            onLaunchUrl: (url) => launchedUrl = url,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.mail_outline_rounded), findsOneWidget);
      expect(find.text('Contact via Email (support@ceosuite.com)'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      expect(redirectedEmail, 'support@ceosuite.com');
      verifyNever(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          ));
    });

    testWidgets('TEST-AI-F63 when onEmailRedirect is null, launches mailto url via onLaunchUrl', (tester) async {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Halo, ada yang bisa dibantu?',
            'botName': 'Claire',
            'humanHandoffEnabled': false,
            'fallbackEmail': 'cs@domain.com',
          },
        },
      );

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
        ),
      );

      String? launchedUrl;

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            onLaunchUrl: (url) => launchedUrl = url,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      expect(launchedUrl, startsWith('mailto:cs@domain.com'));
      verifyNever(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          ));
    });

    testWidgets('TEST-AI-F64 SDK config overrides or fallback email works without init payload', (tester) async {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Halo, ada yang bisa dibantu?',
            'botName': 'Claire',
          },
        },
      );

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
          humanHandoffEnabled: false,
          fallbackEmail: 'sdk-fallback@domain.com',
        ),
      );

      String? redirectedEmail;

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            talkToAgentEmailLabel: 'Kirim Email ke Support',
            onEmailRedirect: (email) => redirectedEmail = email,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Kirim Email ke Support'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      expect(redirectedEmail, 'sdk-fallback@domain.com');
    });
  });
}
