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
        // Flutter's ink sparkle shader cannot be loaded by flutter_test on some setups.
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: child,
      );
    }

    testWidgets('TEST-AI-W01: Should render AppBar with bot name and online indicator', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome!'}},
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      final appBar = find.byType(AppBar);
      expect(find.descendant(of: appBar, matching: find.text('CEO Suite Assistant')), findsOneWidget);
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

    testWidgets('TEST-AI-W06: Agent takeover displays agent name and support icon', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {
            'name': 'CEO Suite Jakarta',
            'welcomeMessage': 'Welcome to CEO Suite!',
          }
        },
      );
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer(
        (_) async => ChatMessage(
          id: 'agent_msg_1',
          sender: MessageSender.agent,
          senderName: 'Sarah Jenkins',
          text: 'Halo! Saya Sarah dari Tim Customer Care.',
          isHandoff: true,
          timestamp: DateTime.now(),
        ),
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      // Initially displays tenant name and bot name
      expect(find.text('CEO Suite Jakarta'), findsOneWidget);
      expect(find.text('Online  CEO Suite Assistant'), findsOneWidget);

      // Send message that triggers agent reply
      await tester.enterText(find.byType(TextField), 'Bisa bicara dengan orang?');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      // After agent takeover, displays agent's name in AppBar and ChatBubble
      expect(find.text('Online  Sarah Jenkins'), findsOneWidget);
      expect(find.text('Sarah Jenkins'), findsOneWidget);
      expect(find.byIcon(Icons.support_agent_rounded), findsWidgets);
    });

    testWidgets('TEST-AI-W07: Default input hintText is English and can be customized', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome'}},
      );

      // Default should be English "Type your message here..."
      await tester.pumpWidget(createTestWidget(AiChatView(controller: controller)));
      await tester.pumpAndSettle();

      expect(find.text('Type your message here...'), findsOneWidget);

      // Custom override
      await tester.pumpWidget(createTestWidget(AiChatView(
        controller: controller,
        inputHintText: 'Ketik pesan Anda di sini...',
      )));
      await tester.pumpAndSettle();

      expect(find.text('Ketik pesan Anda di sini...'), findsOneWidget);
    });

    testWidgets('TEST-AI-W08: Default info card action text is English and can be dynamically customized', (tester) async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome'}},
      );

      final cardMsg = ChatMessage(
        id: 'c1',
        sender: MessageSender.bot,
        text: 'Here is a recommended office:',
        type: ResponseType.card,
        card: const CardPayload(
          title: 'Axiata Tower',
          description: 'Serviced office in KL',
          linkUrl: 'https://ceosuite.com/axiata',
        ),
        timestamp: DateTime.now(),
      );

      final cardController = AiChatController(
        apiClient: mockApiClient,
        config: config,
        initialMessages: [cardMsg],
      );

      // 1. Default should be English "View Location Details" and "Featured Information"
      await tester.pumpWidget(createTestWidget(AiChatView(controller: cardController)));
      await tester.pumpAndSettle();

      expect(find.text('View Location Details'), findsOneWidget);
      expect(find.text('Featured Information'), findsOneWidget);
      expect(find.text('Lihat Detail Lokasi'), findsNothing);

      // 2. Widget-level override via cardActionLabel
      await tester.pumpWidget(createTestWidget(AiChatView(
        controller: cardController,
        cardActionLabel: 'Explore Location',
        cardBannerTitle: 'Top Pick',
      )));
      await tester.pumpAndSettle();

      expect(find.text('Explore Location'), findsOneWidget);
      expect(find.text('Top Pick'), findsOneWidget);

      // 3. Tenant config override from initWidget
      final mockTenantApiClient = MockAiAgentApiClient();
      when(() => mockTenantApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {
            'welcomeMessage': 'Selamat datang',
            'cardActionLabel': 'Lihat Detail Lokasi',
            'cardBannerTitle': 'Informasi Unggulan',
          }
        },
      );

      final tenantController = AiChatController(
        apiClient: mockTenantApiClient,
        config: config,
        initialMessages: [cardMsg],
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: tenantController)));
      await tester.pumpAndSettle();

      expect(find.text('Lihat Detail Lokasi'), findsOneWidget);
      expect(find.text('Informasi Unggulan'), findsOneWidget);

      // 4. Card-level actionLabel overrides everything
      final customCardMsg = ChatMessage(
        id: 'c2',
        sender: MessageSender.bot,
        text: 'Special promo:',
        type: ResponseType.card,
        card: const CardPayload(
          title: 'Special Suite',
          description: 'Limited offer',
          linkUrl: 'https://ceosuite.com/promo',
          actionLabel: 'Book Tour Now',
        ),
        timestamp: DateTime.now(),
      );

      final specificCardController = AiChatController(
        apiClient: mockTenantApiClient,
        config: config,
        initialMessages: [customCardMsg],
      );

      await tester.pumpWidget(createTestWidget(AiChatView(controller: specificCardController)));
      await tester.pumpAndSettle();

      expect(find.text('Book Tour Now'), findsOneWidget);
    });
  });
}
