import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockAiAgentApiClient extends Mock implements AiAgentApiClient {}

void main() {
  group('TEST-AI-W: Chat Widget Functional Tests', () {
    late MockAiAgentApiClient mockApiClient;
    late AiAgentConfig config;
    late AiChatController controller;

    setUp(() {
      mockApiClient = MockAiAgentApiClient();
      config = const AiAgentConfig(
        apiUrl: 'https://cb242.ceosuite.com',
        tenantId: 'default-tenant',
        botName: 'CEO Suite Assistant',
        floodThrottleInterval: Duration(milliseconds: 10),
      );
      controller = AiChatController(apiClient: mockApiClient, config: config);
    });

    Widget createTestWidget(Widget child) {
      return MaterialApp(
        home: child,
      );
    }

    testWidgets('TEST-AI-W01: Should render AppBar with bot name and online indicator', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome!'}},
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      expect(find.text('CEO Suite Assistant'), findsOneWidget);
      expect(find.text('Online 24/7 Support'), findsOneWidget);
      expect(find.text('Welcome!'), findsOneWidget);
    });

    testWidgets('TEST-AI-W02: Typing text and pressing send button dispatches message', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome!'}},
      );
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer(
        (_) async => ChatMessage(
          id: 'b1',
          sender: MessageSender.bot,
          text: 'Jawaban bot untuk pertanyaan Anda.',
          timestamp: DateTime.now(),
        ),
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      final inputFinder = find.byType(TextField);
      await tester.enterText(inputFinder, 'Berapa harga ruang meeting?');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Berapa harga ruang meeting?'), findsOneWidget);
      expect(find.text('Jawaban bot untuk pertanyaan Anda.'), findsOneWidget);
    });

    testWidgets('TEST-AI-W03: Tapping Quick Reply chip sends option value', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {
            'welcomeMessage': 'Pilih menu di bawah:',
            'welcomeMessageOptions': 'Booking Room|Book Room Now, Contact Agent',
          }
        },
      );
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer(
        (_) async => ChatMessage(
          id: 'b2',
          sender: MessageSender.bot,
          text: 'Membuka formulir booking...',
          timestamp: DateTime.now(),
        ),
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      expect(find.text('Booking Room'), findsOneWidget);
      expect(find.text('Contact Agent'), findsOneWidget);

      await tester.tap(find.text('Booking Room'));
      await tester.pumpAndSettle();

      expect(find.text('Book Room Now'), findsOneWidget);
      expect(find.text('Membuka formulir booking...'), findsOneWidget);
    });

    testWidgets('TEST-AI-W04: Should display HandoffBanner when session is transferred to human', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome!'}},
      );
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer(
        (_) async => ChatMessage(
          id: 'b3',
          sender: MessageSender.agent,
          text: 'Halo, saya CS Agent. Ada yang bisa dibantu?',
          isHandoff: true,
          timestamp: DateTime.now(),
        ),
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Mau bicara dengan agen manusia');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(find.byType(HandoffBanner), findsOneWidget);
      expect(find.textContaining('Percakapan telah dialihkan'), findsOneWidget);
    });

    testWidgets('TEST-AI-W05: Dark mode input text styling and contrast in AiChatView', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome to Executive Dark Lounge'}},
      );

      final darkTheme = AiChatTheme.ceoSuiteExecutive(isDark: true);

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: AiChatView(controller: controller, theme: darkTheme),
        ),
      );
      await tester.pumpAndSettle();

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.style?.color, equals(const Color(0xFFF2F2F2)));
      expect(textField.decoration?.hintStyle?.color, equals(const Color(0xFF8E8E93)));

      // Enter text and verify text renders clearly
      await tester.enterText(find.byType(TextField), 'Testing dark mode input visibility');
      await tester.pump();
      expect(find.text('Testing dark mode input visibility'), findsOneWidget);
    });
  });
}
