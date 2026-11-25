import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockAiAgentApiClient extends Mock implements AiAgentApiClient {}

/// The anti-flood throttle runs on the default interval here (1.2 s), because a
/// flow button's reply comes back well inside it.
void main() {
  group('TEST-AI-U-THROTTLE: anti-flood throttle', () {
    late MockAiAgentApiClient api;
    late AiChatController controller;
    final sent = <String>[];

    setUp(() {
      sent.clear();
      api = MockAiAgentApiClient();
      when(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            displayText: any(named: 'displayText'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((inv) async {
        sent.add(inv.namedArguments[#message] as String);
        return ChatMessage(
          id: 'bot_${sent.length}',
          sender: MessageSender.bot,
          text: 'Choose a centre',
          options: const [QuickReplyOption(label: 'Sahid Sudirman', value: 'Centre: Sahid Sudirman')],
          timestamp: DateTime.now(),
        );
      });
      controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(apiUrl: 'https://example.test', tenantId: 't'),
      );
    });

    test('TEST-AI-U22: a button tapped right after a fast reply is sent, with no "please wait" error', () async {
      await controller.selectOption(const QuickReplyOption(label: 'Jakarta', value: 'City Directory: Jakarta'));
      await controller.selectOption(const QuickReplyOption(label: 'Sahid Sudirman', value: 'Centre: Sahid Sudirman'));

      expect(sent, equals(['City Directory: Jakarta', 'Centre: Sahid Sudirman']));
      expect(controller.errorMessage, isNull);
    });

    test('TEST-AI-U23: a throttled typed message does not lock the chat', () async {
      await controller.sendMessage('first');
      await controller.sendMessage('too fast');
      expect(controller.errorMessage, contains('wait a moment'));
      expect(controller.isSending, isFalse);

      await controller.selectOption(const QuickReplyOption(label: 'Sahid Sudirman', value: 'Centre: Sahid Sudirman'));
      expect(sent, equals(['first', 'Centre: Sahid Sudirman']));
    });
  });
}
