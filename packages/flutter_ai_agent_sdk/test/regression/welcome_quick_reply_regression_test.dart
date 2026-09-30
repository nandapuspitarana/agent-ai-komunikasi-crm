import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

const _cfg = AiAgentConfig(
  apiUrl: 'https://example.test',
  tenantId: 't1',
  floodThrottleInterval: Duration(milliseconds: 10),
);

/// Real [AiAgentApiClient] on top of a fake HTTP layer, so JSON parsing,
/// retry and ChatMessage construction are all exercised.
AiAgentApiClient _client(
  Map<String, dynamic> Function(String path) handler, {
  Duration delay = Duration.zero,
  int status = 200,
}) {
  return AiAgentApiClient(
    config: _cfg,
    httpClient: MockClient((req) async {
      if (delay > Duration.zero) await Future.delayed(delay);
      return http.Response(jsonEncode(handler(req.url.path)), status);
    }),
  );
}

Map<String, dynamic> _init({String text = 'Hi', dynamic options, String? type, dynamic structured}) => {
      'config': {
        'welcomeMessage': text,
        if (options != null) 'welcomeMessageOptions': options,
        if (structured != null) 'welcomeOptions': structured,
        if (type != null) 'welcomeMessageType': type,
      }
    };

ChatMessage _msg(String id, MessageSender s, String text, {bool welcome = false, List<QuickReplyOption> options = const []}) =>
    ChatMessage(id: id, sender: s, text: text, timestamp: DateTime.now(), options: options, isWelcome: welcome);

void main() {
  group('TEST-AI-R: welcome message & quick reply regressions', () {
    test('TEST-AI-R01 stale persisted welcome (no buttons) is refreshed from server config', () async {
      var initCalls = 0;
      final c = AiChatController(
        config: _cfg,
        apiClient: _client((_) {
          initCalls++;
          return _init(options: 'Pricing, Book a tour');
        }),
      );

      // Exactly what AiChatSessionManager restores from an old build (no isWelcome flag).
      c.restoreMessages([_msg('welcome_1700000000000', MessageSender.bot, 'Hi')]);
      await c.initialize();

      expect(initCalls, 1, reason: 'config must be fetched even though history was restored');
      expect(c.messages, hasLength(1));
      expect(c.messages.first.options.map((o) => o.label), ['Pricing', 'Book a tour']);
      expect(c.messages.first.type, ResponseType.options);
    });

    test('TEST-AI-R01b restore landing AFTER init completed still gets the fresh buttons', () async {
      final c = AiChatController(config: _cfg, apiClient: _client((_) => _init(options: 'A, B')));
      await c.initialize();

      c.restoreMessages([
        _msg('welcome_fallback', MessageSender.bot, 'Welcome!'),
        _msg('u1', MessageSender.user, 'question'),
        _msg('b1', MessageSender.bot, 'answer'),
      ], sessionId: 'sess-9');

      expect(c.messages.first.options, hasLength(2));
      expect(c.messages.map((m) => m.text).skip(1), ['question', 'answer'], reason: 'history untouched');
      expect(c.sessionId, 'sess-9');
    });

    test('TEST-AI-R02 restore during an in-flight initialize() does not wipe history', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: _client((_) => _init(options: 'Pricing'), delay: const Duration(milliseconds: 80)),
      );

      final initFuture = c.initialize();
      await Future.delayed(const Duration(milliseconds: 20));
      c.restoreMessages([
        _msg('welcome_1', MessageSender.bot, 'Hi'),
        _msg('u1', MessageSender.user, 'earlier question'),
        _msg('b1', MessageSender.bot, 'earlier answer'),
      ], sessionId: 'server-sess');
      await initFuture;

      expect(c.messages.map((m) => m.text), contains('earlier answer'));
      expect(c.messages.map((m) => m.text), contains('earlier question'));
      expect(c.messages.first.options.map((o) => o.label), ['Pricing'], reason: 'welcome refreshed in place');
      expect(c.sessionId, 'server-sess');
    });

    test('TEST-AI-R02b concurrent initialize() calls share a single request', () async {
      var calls = 0;
      final c = AiChatController(
        config: _cfg,
        apiClient: _client((_) {
          calls++;
          return _init(options: 'A');
        }, delay: const Duration(milliseconds: 30)),
      );
      await Future.wait([c.initialize(), c.initialize(), c.initialize()]);
      expect(calls, 1);
      expect(c.messages, hasLength(1));
    });

    test('TEST-AI-R03 failed init falls back, flags retry, and a later initialize() recovers', () async {
      var fail = true;
      final c = AiChatController(
        config: _cfg,
        apiClient: AiAgentApiClient(
          config: _cfg,
          httpClient: MockClient((_) async => fail
              ? http.Response('{"error":"Tenant not found"}', 404)
              : http.Response(jsonEncode(_init(options: 'Pricing, Tour')), 200)),
        ),
      );

      await c.initialize();
      expect(c.needsRetry, isTrue);
      expect(c.errorMessage, contains('offline fallback'));
      expect(c.messages.single.id, 'welcome_fallback');
      expect(c.messages.single.options, isEmpty);

      fail = false;
      await c.initialize(); // e.g. the Retry button

      expect(c.needsRetry, isFalse);
      expect(c.errorMessage, isNull);
      expect(c.messages, hasLength(1), reason: 'fallback replaced, not appended');
      expect(c.messages.single.options.map((o) => o.label), ['Pricing', 'Tour']);
    });

    test('TEST-AI-R03b failed refresh keeps restored history and does not surface a fake welcome', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: AiAgentApiClient(config: _cfg, httpClient: MockClient((_) async => http.Response('boom', 500))),
      );
      c.restoreMessages([_msg('u1', MessageSender.user, 'hello'), _msg('b1', MessageSender.bot, 'hi there')]);
      await c.initialize();

      expect(c.messages.map((m) => m.text), ['hello', 'hi there']);
      expect(c.needsRetry, isTrue);
    });

    test('TEST-AI-R04 welcome carries isWelcome through JSON persistence', () async {
      final c = AiChatController(config: _cfg, apiClient: _client((_) => _init(options: 'A|a')));
      await c.initialize();

      final restored = ChatMessage.fromJson(jsonDecode(jsonEncode(c.messages.first.toJson())) as Map<String, dynamic>);
      expect(restored.isWelcome, isTrue);
      expect(restored.options.single.value, 'a');
    });

    test('TEST-AI-R05 HTML buttons in /message reply become options; no raw tags in text', () async {
      const html = 'Kami punya beberapa paket.<div class="flex flex-wrap gap-2 mt-3">'
          '<button class="px-3" onclick="window.postMessage({type: \'widget_quick_reply\', text: \'Private Office\'}, \'*\')">Office</button>'
          '<button class="px-3" onclick="window.postMessage({type: \'widget_quick_reply\', text: \'Virtual\'}, \'*\')">Virtual</button>'
          '</div>';
      final msg = await _client((_) => {'sessionId': 's1', 'reply': html, 'status': 'bot'})
          .sendMessage(sessionId: 's1', message: 'paket');

      expect(msg.text, 'Kami punya beberapa paket.');
      expect(msg.options.map((o) => '${o.label}=>${o.value}'), ['Office=>Private Office', 'Virtual=>Virtual']);
      expect(msg.type, ResponseType.options);
    });

    test('TEST-AI-R05b escaped (new server) HTML buttons: apostrophes and entities survive', () async {
      const html = 'Pilih:<div class="flex"><button onclick="window.postMessage({type: \'widget_quick_reply\', text: &quot;Kids\' room&quot;}, \'*\')">Kids&#39; room</button></div>';
      final msg = await _client((_) => {'sessionId': 's', 'reply': html}).sendMessage(sessionId: 's', message: 'x');

      expect(msg.text, 'Pilih:');
      expect(msg.options.single.label, "Kids' room");
      expect(msg.options.single.value, "Kids' room");
    });

    test('TEST-AI-R05c structured options from a new server win and text stays clean', () async {
      final msg = await _client((_) => {
            'sessionId': 's',
            'reply': 'Pilih tipe ruang:',
            'responseType': 'options',
            'options': [
              {'label': 'Office', 'value': 'Private Office'},
              {'label': "Kids' room", 'value': "Kids' room"},
            ],
          }).sendMessage(sessionId: 's', message: 'rooms');

      expect(msg.text, 'Pilih tipe ruang:');
      expect(msg.type, ResponseType.options);
      expect(msg.options.map((o) => o.value), ['Private Office', "Kids' room"]);
    });

    test('TEST-AI-R05d plain text with comparison operators is not mangled', () async {
      final msg = await _client((_) => {'sessionId': 's', 'reply': 'Kapasitas < 10 orang dan harga > 500rb'})
          .sendMessage(sessionId: 's', message: 'x');
      expect(msg.text, 'Kapasitas < 10 orang dan harga > 500rb');
      expect(msg.options, isEmpty);
    });

    test('TEST-AI-R05e card and form HTML are still parsed as before (buttons not stolen)', () {
      final form = ChatMessage.fromApiResponse(
        id: 'f',
        rawReply: "Isi data:<form><div class='form-card'><label class='form-card_label'>Nama</label>"
            "<input type='text' name='name' placeholder='Nama' required><button type='submit'>Kirim</button></div></form>",
        responseType: 'form',
      );
      expect(form.type, ResponseType.form);
      expect(form.form, isNotNull);
      expect(form.options, isEmpty);
    });

    test('TEST-AI-R06 reply:null with status:agent marks handoff and adds no blank bubble', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: _client((path) => path.endsWith('/init')
            ? _init()
            : {'sessionId': 's1', 'status': 'agent', 'reply': null, 'handoffOccurred': false}),
      );
      await c.initialize();
      await c.sendMessage('halo');

      expect(c.isHandoff, isTrue);
      expect(c.messages.map((m) => m.sender), [MessageSender.bot, MessageSender.user], reason: 'no empty bot bubble');
      expect(c.sessionId, 's1');
    });

    test('TEST-AI-R07 blank / typed-text welcome options never produce buttons', () async {
      for (final options in <dynamic>['', '   ', ',,', <String>[]]) {
        final c = AiChatController(config: _cfg, apiClient: _client((_) => _init(options: options)));
        await c.initialize();
        expect(c.messages.first.options, isEmpty, reason: 'options=$options');
        expect(c.messages.first.type, ResponseType.text, reason: 'options=$options');
      }

      final typed = AiChatController(
        config: _cfg,
        apiClient: _client((_) => _init(options: 'Old, Stale', type: 'text')),
      );
      await typed.initialize();
      expect(typed.messages.first.options, isEmpty, reason: 'explicit text welcome drops leftovers');
    });

    test('TEST-AI-F01e structured welcomeOptions are preferred over the legacy string', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: _client((_) => _init(
              options: 'Legacy',
              structured: [
                {'label': 'Pricing', 'value': 'pricing'},
                {'label': 'Tour', 'value': 'tour'},
              ],
            )),
      );
      await c.initialize();
      expect(c.messages.first.options.map((o) => '${o.label}=>${o.value}'), ['Pricing=>pricing', 'Tour=>tour']);
    });

    test('TEST-AI-R08 restartChat resets retry state and re-fetches the welcome', () async {
      var calls = 0;
      final c = AiChatController(config: _cfg, apiClient: _client((path) {
        if (path.endsWith('/init')) calls++;
        return path.endsWith('/init') ? _init(options: 'A') : {'sessionId': 's', 'reply': 'ok'};
      }));
      await c.initialize();
      await c.sendMessage('x');
      await c.restartChat();

      expect(calls, 2);
      expect(c.messages, hasLength(1));
      expect(c.messages.first.options, hasLength(1));
    });
  });

  group('TEST-AI-U: HtmlReplyParser', () {
    test('returns input untouched when there is no markup', () {
      final r = HtmlReplyParser.parse('Halo, apa kabar?');
      expect(r.text, 'Halo, apa kabar?');
      expect(r.options, isEmpty);
    });

    test('data-value attribute is honoured', () {
      final r = HtmlReplyParser.parse('Pick<div><button data-value="x-1">One</button></div>');
      expect(r.options.single.value, 'x-1');
      expect(r.text, 'Pick');
    });

    test('links keep their URL, lists become bullets, br becomes newline', () {
      final r = HtmlReplyParser.parse('Lihat <a href="https://ceosuite.com/x">di sini</a><br>Paket:<ul><li>A</li><li>B</li></ul>');
      expect(r.text, contains('di sini (https://ceosuite.com/x)'));
      expect(r.text, contains('• A'));
      expect(r.text, contains('• B'));
      expect(r.text, contains('\n'));
    });

    test('unicode escapes in JS string literal are decoded', () {
      final r = HtmlReplyParser.parse(
          '<div><button onclick="window.postMessage({text: &quot;Caf\\u00e9&quot;}, \'*\')">Cafe</button></div>');
      expect(r.options.single.value, 'Café');
    });
  });
}
