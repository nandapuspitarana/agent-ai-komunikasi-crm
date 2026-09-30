import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockAiAgentApiClient extends Mock implements AiAgentApiClient {}

void main() {
  group('TEST-AI-W: inline quick-reply chips', () {
    late MockAiAgentApiClient api;
    late AiChatController controller;

    const config = AiAgentConfig(
      apiUrl: 'https://example.test',
      tenantId: 't1',
      botName: 'Claire',
      floodThrottleInterval: Duration(milliseconds: 10),
    );

    void stubInit({String? options = 'Pricing|price, Book a tour'}) {
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {'welcomeMessage': 'Pick one:', if (options != null) 'welcomeMessageOptions': options}
        },
      );
    }

    void stubSend(Future<ChatMessage> Function() answer) {
      when(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) => answer());
    }

    Future<void> pump(WidgetTester tester, {QuickReplyStyle style = QuickReplyStyle.inline}) async {
      await tester.pumpWidget(MaterialApp(home: AiChatView(controller: controller, quickReplyStyle: style)));
      await tester.pumpAndSettle();
    }

    ChatMessage bot(String text, {List<QuickReplyOption> options = const []}) => ChatMessage(
          id: 'b_${text.hashCode}',
          sender: MessageSender.bot,
          text: text,
          options: options,
          type: options.isEmpty ? ResponseType.text : ResponseType.options,
          timestamp: DateTime.now(),
        );

    Finder chip(String label) => find.widgetWithText(ActionChip, label);

    setUp(() {
      api = MockAiAgentApiClient();
      controller = AiChatController(apiClient: api, config: config);
    });

    testWidgets('TEST-AI-F10 welcome buttons render under the bubble, not in a bottom bar', (tester) async {
      stubInit();
      await pump(tester);

      expect(find.text('Pick one:'), findsOneWidget);
      expect(find.descendant(of: find.byType(ChatBubble), matching: find.byType(ActionChip)), findsNWidgets(2),
          reason: 'chips belong to the welcome bubble item');
      expect(find.byType(ActionChip), findsNWidgets(2));
      expect(find.byType(QuickReplyBar), findsNothing);
      expect(tester.widget<ActionChip>(chip('Pricing')).onPressed, isNotNull);
    });

    testWidgets('TEST-AI-F11 tapping a welcome chip sends its value; that chip is marked chosen and disabled', (tester) async {
      stubInit();
      stubSend(() async => bot('Ini daftar harga.'));
      await pump(tester);

      await tester.tap(chip('Pricing'));
      await tester.pumpAndSettle();

      verify(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: 'price', // value, not label
            contactId: any(named: 'contactId'),
          )).called(1);

      expect(find.text('price'), findsOneWidget, reason: 'user bubble shows the sent value');
      expect(find.text('Ini daftar harga.'), findsOneWidget);
      expect(tester.widget<ActionChip>(chip('Pricing')).onPressed, isNull);
      expect(tester.widget<ActionChip>(chip('Book a tour')).onPressed, isNull, reason: 'old options cannot be reused');
      expect(find.byIcon(Icons.check_rounded), findsOneWidget, reason: 'chosen option is highlighted');
    });

    testWidgets('TEST-AI-F12 buttons on a bot reply appear under that reply and older chips stay disabled', (tester) async {
      stubInit();
      stubSend(() async => bot('Pilih tipe ruang:', options: const [
            QuickReplyOption(label: 'Office', value: 'Private Office'),
            QuickReplyOption(label: 'Virtual', value: 'Virtual Office'),
          ]));
      await pump(tester);

      await tester.tap(chip('Pricing'));
      await tester.pumpAndSettle();

      expect(find.text('Pilih tipe ruang:'), findsOneWidget);
      expect(tester.widget<ActionChip>(chip('Office')).onPressed, isNotNull);
      expect(tester.widget<ActionChip>(chip('Virtual')).onPressed, isNotNull);
      expect(tester.widget<ActionChip>(chip('Pricing')).onPressed, isNull);
    });

    testWidgets('TEST-AI-F13 Label|Value: label shown on the chip, value sent to the server', (tester) async {
      stubInit(options: 'Bangkok|Bangkok Private Office');
      stubSend(() async => bot('ok'));
      await pump(tester);

      expect(find.text('Bangkok'), findsOneWidget);
      expect(find.text('Bangkok Private Office'), findsNothing);

      await tester.tap(chip('Bangkok'));
      await tester.pumpAndSettle();

      verify(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: 'Bangkok Private Office',
            contactId: any(named: 'contactId'),
          )).called(1);
    });

    testWidgets('TEST-AI-F14 while the bot is typing chips stay visible but disabled', (tester) async {
      stubInit();
      final pending = Completer<ChatMessage>();
      stubSend(() => pending.future);
      await pump(tester);

      await tester.tap(chip('Pricing'));
      await tester.pump(); // user bubble + typing indicator

      expect(controller.isTyping, isTrue);
      expect(chip('Book a tour'), findsOneWidget, reason: 'chips do not vanish and make the layout jump');
      expect(tester.widget<ActionChip>(chip('Book a tour')).onPressed, isNull);

      pending.complete(bot('done'));
      await tester.pumpAndSettle();
    });

    testWidgets('TEST-AI-F15 long labels wrap instead of overflowing on a narrow screen', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      stubInit(options: 'Saya ingin tahu paket virtual office lengkap dengan harga, Book a tour hari ini juga, Hubungi tim sales kami sekarang');
      // showAppBar:false = how cs_portal_mobile embeds it (the SDK's own AppBar has a separate <=320dp overflow)
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: AiChatView(controller: controller, showAppBar: false))));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(ActionChip), findsNWidgets(3));
    });

    testWidgets('TEST-AI-F16 legacy bar style still available and does not double render', (tester) async {
      stubInit();
      await pump(tester, style: QuickReplyStyle.bar);

      expect(find.byType(QuickReplyBar), findsOneWidget);
      expect(find.byType(ActionChip), findsNWidgets(2), reason: 'bar only, no inline duplicates');
    });

    testWidgets('TEST-AI-F17 text-only welcome shows no chips', (tester) async {
      stubInit(options: null);
      await pump(tester);
      expect(find.byType(ActionChip), findsNothing);
    });

    testWidgets('TEST-AI-F18 offline fallback shows Retry; retry loads the real welcome with buttons', (tester) async {
      var online = false;
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer((_) async {
        if (!online) throw const AiAgentApiException('down');
        return {
          'config': {'welcomeMessage': 'Pick one:', 'welcomeMessageOptions': 'Pricing, Tour'}
        };
      });
      await pump(tester);

      expect(find.textContaining('offline fallback'), findsOneWidget);
      expect(find.byType(ActionChip), findsNothing);
      expect(find.text('Retry'), findsOneWidget);

      online = true;
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(find.textContaining('offline fallback'), findsNothing);
      expect(find.text('Retry'), findsNothing);
      expect(find.text('Pick one:'), findsOneWidget);
      expect(find.byType(ActionChip), findsNWidgets(2));
    });

    testWidgets('TEST-AI-F19 chips are exposed to accessibility as buttons with their label', (tester) async {
      final handle = tester.ensureSemantics();
      stubInit();
      await pump(tester);

      expect(tester.getSemantics(chip('Pricing')), containsSemantics(label: 'Pricing', isButton: true));
      handle.dispose();
    });
  });
}
