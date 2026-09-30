import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockAiAgentApiClient extends Mock implements AiAgentApiClient {}

void main() {
  group('TEST-AI-U: Chat Controller Functional State Tests', () {
    late MockAiAgentApiClient mockApiClient;
    late AiAgentConfig config;
    late AiChatController controller;

    setUp(() {
      mockApiClient = MockAiAgentApiClient();
      config = const AiAgentConfig(
        apiUrl: 'https://cb242.ceosuite.com',
        tenantId: 'default-tenant',
        floodThrottleInterval: Duration(milliseconds: 50),
      );
      controller = AiChatController(apiClient: mockApiClient, config: config);
    });

    test('TEST-AI-U11: initialize should fetch config and populate welcome message', () async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {
            'welcomeMessage': 'Halo! Selamat datang di CEO Suite Portal.',
            'welcomeMessageOptions': 'Beli Paket, Jadwal Meeting',
          }
        },
      );

      await controller.initialize();

      expect(controller.isInitialized, isTrue);
      expect(controller.messages.length, equals(1));
      expect(controller.messages.first.text, equals('Halo! Selamat datang di CEO Suite Portal.'));
      expect(controller.messages.first.options.length, equals(2));
    });

    test('TEST-AI-U12: sendMessage should apply optimistic UI update with sending status', () async {
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) async {
        // Simulating artificial server delay
        await Future.delayed(const Duration(milliseconds: 50));
        return ChatMessage(
          id: 'bot_1',
          sender: MessageSender.bot,
          text: 'Bot reply',
          timestamp: DateTime.now(),
        );
      });

      final future = controller.sendMessage('Halo');

      // Check state immediately during flight
      expect(controller.messages.length, equals(1));
      expect(controller.messages.first.text, equals('Halo'));
      expect(controller.messages.first.sender, equals(MessageSender.user));
      expect(controller.isTyping, isTrue);

      await future;

      // After reply resolves
      expect(controller.messages.length, equals(2));
      expect(controller.messages[0].status, equals(MessageStatus.sent));
      expect(controller.messages[1].text, equals('Bot reply'));
      expect(controller.isTyping, isFalse);
    });

    test('TEST-AI-U13: selectOption should trigger sendMessage with option value', () async {
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) async => ChatMessage(
            id: 'bot_2',
            sender: MessageSender.bot,
            text: 'Here are the rates...',
            timestamp: DateTime.now(),
          ));

      const option = QuickReplyOption(label: 'Meeting Room', value: 'Book Meeting Room');
      await controller.selectOption(option);

      expect(controller.messages.length, equals(2));
      expect(controller.messages.first.text, equals('Book Meeting Room'));
    });

    test('TEST-AI-U14: Should mark message with error status when API fails', () async {
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenThrow(const AiAgentApiException('Server Unavailable'));

      await controller.sendMessage('Test Error');

      expect(controller.messages.length, equals(1));
      expect(controller.messages.first.status, equals(MessageStatus.error));
      expect(controller.errorMessage, contains('Server Unavailable'));
      expect(controller.isTyping, isFalse);
    });

    test('TEST-AI-U15: restartChat should reset state and re-initialize with new session', () async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Welcome again!'}},
      );

      final initialSessionId = controller.sessionId;
      controller.restartChat();

      // Wait a tick for initialize
      await Future.delayed(const Duration(milliseconds: 10));

      expect(controller.sessionId, isNot(equals(initialSessionId)));
      expect(controller.isHandoff, isFalse);
    });

    test('TEST-AI-U16: should dynamically resolve tenantName, botName, and activeResponderName', () async {
      when(() => mockApiClient.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {
          'config': {
            'tenantName': 'CEO Suite Regional HQ',
            'botName': 'Claire',
            'welcomeMessage': 'Halo dari Claire!',
          }
        },
      );

      await controller.initialize();

      expect(controller.tenantName, equals('CEO Suite Regional HQ'));
      expect(controller.botName, equals('Claire'));
      expect(controller.activeResponderName, equals('Claire'));
      expect(controller.messages.first.senderName, equals('Claire'));

      // Now simulate agent takeover via sendMessage
      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) async => ChatMessage(
            id: 'agent_1',
            sender: MessageSender.agent,
            senderName: 'David Lee',
            text: 'Saya ambil alih percakapan ini.',
            isHandoff: true,
            timestamp: DateTime.now(),
          ));

      await controller.sendMessage('Tolong hubungkan ke manusia');

      expect(controller.isHandoff, isTrue);
      expect(controller.currentAgentName, equals('David Lee'));
      expect(controller.activeResponderName, equals('David Lee'));
    });

    test('TEST-AI-U17: Multi-turn session persistence and context switching across topics (Booking -> Wifi)', () async {
      final sessionCalls = <String>[];
      final messageCalls = <String>[];

      when(() => mockApiClient.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((invocation) async {
        final sid = invocation.namedArguments[#sessionId] as String;
        final msg = invocation.namedArguments[#message] as String;
        sessionCalls.add(sid);
        messageCalls.add(msg);

        if (msg.contains('booking')) {
          return ChatMessage(
            id: 'bot_booking',
            sender: MessageSender.bot,
            text: 'Ruang meeting Garuda tersedia besok jam 10.',
            timestamp: DateTime.now(),
            sessionId: 'canonical_session_uuid_123',
          );
        } else {
          return ChatMessage(
            id: 'bot_wifi',
            sender: MessageSender.bot,
            text: 'SSID Wifi: CEOSuite_Guest, Password: welcome',
            timestamp: DateTime.now(),
            sessionId: 'canonical_session_uuid_123',
          );
        }
      });

      // Turn 1: User asks about booking
      await controller.sendMessage('Saya mau booking ruang meeting Garuda besok');

      expect(controller.messages.length, equals(2));
      expect(controller.messages[0].text, equals('Saya mau booking ruang meeting Garuda besok'));
      expect(controller.messages[1].text, contains('Ruang meeting Garuda'));
      // Controller sessionId should sync with the canonical server session ID
      expect(controller.sessionId, equals('canonical_session_uuid_123'));

      // Wait for throttle interval before sending second message
      await Future.delayed(const Duration(milliseconds: 60));

      // Turn 2: User switches topic to WiFi within the same session
      await controller.sendMessage('Btw password wifi di sana apa ya?');

      expect(controller.messages.length, equals(4));
      expect(controller.messages[2].text, equals('Btw password wifi di sana apa ya?'));
      expect(controller.messages[3].text, contains('CEOSuite_Guest'));

      // Both API calls must be recorded with exact session continuity
      expect(sessionCalls.length, equals(2));
      expect(sessionCalls[1], equals('canonical_session_uuid_123'));
      expect(messageCalls, equals([
        'Saya mau booking ruang meeting Garuda besok',
        'Btw password wifi di sana apa ya?',
      ]));
    });
  });
}
