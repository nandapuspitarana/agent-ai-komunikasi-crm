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
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
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

      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            onEmailRedirect: (email) => redirectedEmail = email,
            onLaunchUrl: (_) {},
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
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            enableContactFunnel: false,
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
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
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

    testWidgets('TEST-AI-F65 when humanHandoffEnabled is false and language is English, button opens English contact funnel modal', (tester) async {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Hello, how can I assist you?',
            'botName': 'Claire',
            'humanHandoffEnabled': false,
            'fallbackEmail': 'support@ceosuite.com',
            'language': 'en',
          },
        },
      );

      when(() => api.submitContactForm(
            category: any(named: 'category'),
            description: any(named: 'description'),
            sessionId: any(named: 'sessionId'),
            contactId: any(named: 'contactId'),
            email: any(named: 'email'),
            name: any(named: 'name'),
            company: any(named: 'company'),
          )).thenAnswer(
        (_) async => {
          'success': true,
          'sessionId': 'server_session_123',
          'botReply': 'Your report has been received.',
        },
      );

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
        ),
      );

      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            talkToAgentEmailLabel: 'Send Email to Company',
            userName: 'HC Leman',
            userEmail: 'leman@ceosuite.com',
            userCompany: 'CEO SUITE',
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Send Email to Company'), findsOneWidget);

      // Tap Send Email to Company -> opens ContactFunnelModal
      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      // Check modal components in English
      expect(find.byType(ContactFunnelModal), findsOneWidget);
      expect(find.text('Contact Company / Report Issue'), findsOneWidget);
      expect(find.text('HC Leman'), findsOneWidget);
      expect(find.text('CEO SUITE'), findsOneWidget);
      expect(find.text('Submit Report'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      // Enter description
      await tester.enterText(find.byType(TextFormField), 'AC in meeting room is not cooling');
      await tester.pumpAndSettle();

      // Tap submit button in English
      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit Report'));
      await tester.pumpAndSettle();

      // Verify submitContactForm was called with user profile parameters
      verify(() => api.submitContactForm(
            category: 'General Inquiry',
            description: 'AC in meeting room is not cooling',
            sessionId: any(named: 'sessionId'),
            contactId: any(named: 'contactId'),
            email: 'leman@ceosuite.com',
            name: 'HC Leman',
            company: 'CEO SUITE',
          )).called(1);

      // Modal should be closed
      expect(find.byType(ContactFunnelModal), findsNothing);
      expect(find.text('Your report has been received.'), findsOneWidget);
    });

    testWidgets('TEST-AI-F66 when tenant language is id, modal uses Indonesian strings', (tester) async {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'status': 'success',
          'config': {
            'welcomeMessage': 'Halo, ada yang bisa dibantu?',
            'botName': 'Claire',
            'humanHandoffEnabled': false,
            'fallbackEmail': 'support@ceosuite.com',
            'language': 'id',
          },
        },
      );

      when(() => api.submitContactForm(
            category: any(named: 'category'),
            description: any(named: 'description'),
            sessionId: any(named: 'sessionId'),
            contactId: any(named: 'contactId'),
            email: any(named: 'email'),
            name: any(named: 'name'),
            company: any(named: 'company'),
          )).thenAnswer(
        (_) async => {
          'success': true,
          'sessionId': 'server_session_123',
          'botReply': 'Laporan Anda telah diterima.',
        },
      );

      final controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'http://localhost',
          tenantId: 't1',
        ),
      );

      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            talkToAgentLabel: 'Talk to Human Agent',
            talkToAgentEmailLabel: 'Send Email to Company',
            userName: 'HC Leman',
            userEmail: 'leman@ceosuite.com',
            userCompany: 'CEO SUITE',
          ),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      expect(find.byType(ContactFunnelModal), findsOneWidget);
      expect(find.text('Hubungi Perusahaan / Laporan'), findsOneWidget);
      expect(find.text('Kirim Laporan'), findsOneWidget);
      expect(find.text('Batal'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), 'AC tidak dingin');
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Kirim Laporan'));
      await tester.pumpAndSettle();

      verify(() => api.submitContactForm(
            category: 'Pertanyaan Umum',
            description: 'AC tidak dingin',
            sessionId: any(named: 'sessionId'),
            contactId: any(named: 'contactId'),
            email: 'leman@ceosuite.com',
            name: 'HC Leman',
            company: 'CEO SUITE',
          )).called(1);
    });
  });
}
