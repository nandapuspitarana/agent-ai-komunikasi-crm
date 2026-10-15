import 'dart:convert';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

class MockAiAgentApiClient extends Mock implements AiAgentApiClient {}

/// Exactly what `FormBuilder.tsx` generates for the CRM (webhook set, one of
/// each interesting field type).
const String kFormHtml =
    "Silakan lengkapi data Anda:"
    "<form class='form-card' onsubmit=\"event.preventDefault(); var btn=this.querySelector('button[type=submit]'); "
    "fetch('https://n8n.example.com/webhook/lead',{method:'POST'});\">"
    "<label class='form-card_label'>Full Name <span class=\"required\">*</span></label>"
    "<input type='text' name='full_name' placeholder='e.g. John Doe' class='form-card_input' required/>"
    "<label class='form-card_label'>Email <span class=\"required\">*</span></label>"
    "<input type='email' name='email' placeholder='you@example.com' class='form-card_input' required/>"
    "<label class='form-card_label'>WhatsApp</label>"
    "<input type='tel' name='whatsapp' placeholder='0812345678' class='form-card_input' pattern='[0-9]+' "
    "title='Please enter only numbers' oninput='this.value = this.value.replace(/[^0-9]/g, \"\")' />"
    "<label class='form-card_label'>Message</label>"
    "<textarea name='message' placeholder='Tell us more' class='form-card_input' ></textarea>"
    "<button type='submit' class='submit-btn'>Kirim Data</button></form>";

const String kFormHtmlNoWebhook =
    "Isi form ya:<form class='form-card' onsubmit=\"event.preventDefault();\">"
    "<label class='form-card_label'>Name</label>"
    "<input type='text' name='name' placeholder='Name' class='form-card_input'/>"
    "<button type='submit' class='submit-btn'>Submit</button></form>";

void main() {
  group('TEST-AI-F2x: lead form parsing', () {
    test('TEST-AI-F20 parses every field the CRM Form Builder emits, incl. required and textarea', () {
      final form = FormPayload.parseFromHtml(kFormHtml)!;

      expect(form.introMessage, 'Silakan lengkapi data Anda:');
      expect(form.webhookUrl, 'https://n8n.example.com/webhook/lead');
      expect(form.submitLabel, 'Kirim Data');
      expect(form.fields.map((f) => f.name), ['full_name', 'email', 'whatsapp', 'message']);
      expect(form.fields.map((f) => f.type), ['text', 'email', 'tel', 'textarea']);
      expect(form.fields.map((f) => f.required), [true, true, false, false]);
      expect(form.fields.first.label, 'Full Name');
      expect(form.fields.first.placeholder, 'e.g. John Doe');
    });

    test('TEST-AI-F20b parses a <select> with its options', () {
      const html = "Pilih:<form class='form-card'><label>City</label>"
          "<select name='city'><option>Jakarta</option><option>Bangkok</option></select>"
          "<button type='submit'>Go</button></form>";
      final form = FormPayload.parseFromHtml(html)!;
      expect(form.fields.single.type, 'select');
      expect(form.fields.single.options, ['Jakarta', 'Bangkok']);
    });

    test('TEST-AI-F20c form survives the JSON round trip used for the cached session', () {
      final msg = ChatMessage.fromApiResponse(id: 'b1', rawReply: kFormHtml, responseType: 'form');
      expect(msg.type, ResponseType.form);
      expect(msg.text, 'Silakan lengkapi data Anda:');

      final restored = ChatMessage.fromJson(
        Map<String, dynamic>.from(jsonDecode(jsonEncode(msg.copyWith(formSubmitted: true).toJson())) as Map),
      );
      expect(restored.form!.fields.length, 4);
      expect(restored.form!.webhookUrl, 'https://n8n.example.com/webhook/lead');
      expect(restored.form!.submitLabel, 'Kirim Data');
      expect(restored.formSubmitted, isTrue);
    });
  });

  group('TEST-AI-F2x: rich message text', () {
    test('TEST-AI-F26 parses bold, markdown links and bare URLs (trailing punctuation excluded)', () {
      final runs = parseMessageRuns('Lihat **harga** di [situs](https://a.com/x) atau https://b.com/y.');
      expect(runs, [
        const MessageRun('Lihat '),
        const MessageRun('harga', bold: true),
        const MessageRun(' di '),
        const MessageRun('situs', url: 'https://a.com/x'),
        const MessageRun(' atau '),
        const MessageRun('https://b.com/y', url: 'https://b.com/y'),
        const MessageRun('.'),
      ]);
    });

    test('TEST-AI-F26b plain text stays a single run', () {
      expect(parseMessageRuns('Halo, apa kabar?'), [const MessageRun('Halo, apa kabar?')]);
    });

    testWidgets('TEST-AI-F27 tapping a link calls onLaunchUrl', (tester) async {
      String? launched;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: RichMessageText(
            text: 'Buka https://ceosuite.com sekarang',
            style: const TextStyle(fontSize: 14),
            linkColor: Colors.blue,
            onLaunchUrl: (u) => launched = u,
          ),
        ),
      ));

      final rich = tester.widget<SelectableText>(find.byType(SelectableText));
      final link = (rich.textSpan!.children!).whereType<TextSpan>().firstWhere((s) => s.text == 'https://ceosuite.com');
      (link.recognizer as TapGestureRecognizer).onTap!();
      expect(launched, 'https://ceosuite.com');
    });
  });

  group('TEST-AI-F2x: submitForm (controller)', () {
    late MockAiAgentApiClient api;
    late AiChatController controller;

    ChatMessage formMessage(String html, {String? sessionId}) =>
        ChatMessage.fromApiResponse(id: 'form1', rawReply: html, responseType: 'form', sessionId: sessionId);

    setUp(() {
      api = MockAiAgentApiClient();
      controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'https://crm.test',
          tenantId: 't1',
          floodThrottleInterval: Duration(milliseconds: 1),
        ),
      );
    });

    test('TEST-AI-F21 webhook form: posts via form-proxy, shows summary + thanks, locks the form', () async {
      controller.restoreMessages([formMessage(kFormHtml, sessionId: 'srv-9')]);
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenAnswer((_) async {});

      final error = await controller.submitForm('form1', {'full_name': 'Ann', 'email': 'a@b.co'});

      expect(error, isNull);
      verify(() => api.submitForm(
            url: 'https://n8n.example.com/webhook/lead',
            payload: {'full_name': 'Ann', 'email': 'a@b.co'},
            sessionId: 'srv-9',
          )).called(1);
      final msgs = controller.messages;
      expect(msgs.first.formSubmitted, isTrue);
      expect(msgs[1].sender, MessageSender.user);
      expect(msgs[1].text, contains('[Form Submitted]'));
      expect(msgs[1].text, contains('- full_name: Ann'));
      expect(msgs[2].sender, MessageSender.bot);
      expect(msgs[2].text, controller.config.formSuccessMessage);
    });

    test('TEST-AI-F21b a session the server never confirmed is not sent to form-proxy', () async {
      controller.restoreMessages([formMessage(kFormHtml)]); // no server session id yet
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenAnswer((_) async {});

      await controller.submitForm('form1', {'full_name': 'Ann'});

      verify(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: null,
          )).called(1);
    });

    test('TEST-AI-F22 a failed submit returns an error and leaves the form open for retry', () async {
      controller.restoreMessages([formMessage(kFormHtml)]);
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenThrow(const AiAgentApiException('boom', statusCode: 500));

      final error = await controller.submitForm('form1', {'full_name': 'Ann'});

      expect(error, controller.config.formErrorMessage);
      expect(controller.messages.length, 1);
      expect(controller.messages.first.formSubmitted, isFalse);
    });

    test('TEST-AI-F22b submitting twice never posts the lead twice', () async {
      controller.restoreMessages([formMessage(kFormHtml)]);
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenAnswer((_) async {});

      final first = controller.submitForm('form1', {'full_name': 'Ann'});
      final second = controller.submitForm('form1', {'full_name': 'Ann'});
      await Future.wait([first, second]);
      await controller.submitForm('form1', {'full_name': 'Ann'});

      verify(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).called(1);
    });

    test('TEST-AI-F23 a form without webhook sends the answers to the agent as a normal message', () async {
      controller.restoreMessages([formMessage(kFormHtmlNoWebhook)]);
      when(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
          )).thenAnswer((_) async => ChatMessage(
            id: 'b2',
            sender: MessageSender.bot,
            text: 'Terima kasih!',
            timestamp: DateTime.now(),
            sessionId: 'srv-1',
          ));

      final error = await controller.submitForm('form1', {'name': 'Ann'});

      expect(error, isNull);
      final captured = verify(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: captureAny(named: 'message'),
            contactId: any(named: 'contactId'),
          )).captured.single as String;
      expect(captured, contains('- name: Ann'));
      expect(controller.messages.first.formSubmitted, isTrue);
      verifyNever(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          ));
    });
  });

  group('TEST-AI-F2x: api client form-proxy', () {
    test('TEST-AI-F24 posts url/payload/sessionId/tenantId to /api/widget/form-proxy', () async {
      late http.Request seen;
      final client = AiAgentApiClient(
        config: const AiAgentConfig(apiUrl: 'https://crm.test/', tenantId: 't1'),
        httpClient: MockClient((req) async {
          seen = req;
          return http.Response('{"success":true}', 200);
        }),
      );

      await client.submitForm(url: 'https://hook.test/x', payload: {'a': '1'}, sessionId: 's1');

      expect(seen.url.toString(), 'https://crm.test/api/widget/form-proxy');
      expect(jsonDecode(seen.body), {
        'url': 'https://hook.test/x',
        'payload': {'a': '1'},
        'sessionId': 's1',
        'tenantId': 't1',
      });
    });

    test('TEST-AI-F24b a non-2xx answer is an AiAgentApiException and is not retried', () async {
      var calls = 0;
      final client = AiAgentApiClient(
        config: const AiAgentConfig(apiUrl: 'https://crm.test', tenantId: 't1'),
        httpClient: MockClient((req) async {
          calls++;
          return http.Response('{"error":"x"}', 502);
        }),
      );

      await expectLater(
        client.submitForm(url: 'https://hook.test/x', payload: {'a': '1'}),
        throwsA(isA<AiAgentApiException>()),
      );
      expect(calls, 1);
    });
  });

  group('TEST-AI-F2x: lead form widget', () {
    late MockAiAgentApiClient api;
    late AiChatController controller;

    setUp(() {
      api = MockAiAgentApiClient();
      controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'https://crm.test',
          tenantId: 't1',
          floodThrottleInterval: Duration(milliseconds: 1),
        ),
      );
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Halo'}},
      );
      controller.restoreMessages([
        ChatMessage.fromApiResponse(id: 'form1', rawReply: kFormHtml, responseType: 'form', sessionId: 'srv-9'),
      ]);
    });

    Future<void> pump(WidgetTester tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(body: AiChatView(controller: controller, showAppBar: false)),
      ));
      await tester.pumpAndSettle();
    }

    Finder field(String name) => find.byKey(ValueKey('lead_form_field_$name'));

    testWidgets('TEST-AI-F25 renders intro text, labelled fields and the CRM submit label inside the bubble', (tester) async {
      await pump(tester);

      expect(find.text('Silakan lengkapi data Anda:'), findsOneWidget);
      expect(find.byKey(const ValueKey('lead_form')), findsOneWidget);
      expect(find.textContaining('Full Name', findRichText: true), findsOneWidget);
      expect(field('full_name'), findsOneWidget);
      expect(field('email'), findsOneWidget);
      expect(field('whatsapp'), findsOneWidget);
      expect(field('message'), findsOneWidget);
      expect(find.text('Kirim Data'), findsOneWidget);
    });

    testWidgets('TEST-AI-F28 required and email validation block submit; nothing is posted', (tester) async {
      await pump(tester);

      await tester.tap(find.byKey(const ValueKey('lead_form_submit')));
      await tester.pumpAndSettle();
      expect(find.text('This field is required'), findsNWidgets(2)); // name + email
      verifyNever(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          ));

      await tester.enterText(field('full_name'), 'Ann');
      await tester.enterText(field('email'), 'not-an-email');
      await tester.tap(find.byKey(const ValueKey('lead_form_submit')));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email address'), findsOneWidget);
    });

    testWidgets('TEST-AI-F29 phone field accepts digits only', (tester) async {
      await pump(tester);
      await tester.enterText(field('whatsapp'), '+62 812-3456');
      await tester.pump();
      final text = tester.widget<TextFormField>(field('whatsapp')).controller!.text;
      expect(text, '628123456');
    });

    testWidgets('TEST-AI-F30 valid submit posts all fields, then shows the summary bubble, thanks and a locked form', (tester) async {
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenAnswer((_) async {});
      await pump(tester);

      await tester.enterText(field('full_name'), 'Ann Lee');
      await tester.enterText(field('email'), 'ann@example.com');
      await tester.enterText(field('whatsapp'), '0812');
      await tester.tap(find.byKey(const ValueKey('lead_form_submit')));
      await tester.pumpAndSettle();

      verify(() => api.submitForm(
            url: 'https://n8n.example.com/webhook/lead',
            payload: {'full_name': 'Ann Lee', 'email': 'ann@example.com', 'whatsapp': '0812', 'message': ''},
            sessionId: 'srv-9',
          )).called(1);
      expect(find.byKey(const ValueKey('lead_form')), findsNothing);
      expect(find.byKey(const ValueKey('lead_form_submitted')), findsOneWidget);
      expect(find.textContaining('- full_name: Ann Lee'), findsOneWidget);
      expect(find.text(controller.config.formSuccessMessage), findsOneWidget);
    });

    testWidgets('TEST-AI-F31 a failing submit shows the error under the button and keeps the typed values', (tester) async {
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenThrow(const AiAgentApiException('down'));
      await pump(tester);

      await tester.enterText(field('full_name'), 'Ann Lee');
      await tester.enterText(field('email'), 'ann@example.com');
      await tester.tap(find.byKey(const ValueKey('lead_form_submit')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('lead_form_error')), findsOneWidget);
      expect(find.text(controller.config.formErrorMessage), findsOneWidget);
      expect(find.byKey(const ValueKey('lead_form')), findsOneWidget);
      expect(tester.widget<TextFormField>(field('full_name')).controller!.text, 'Ann Lee');
    });

    testWidgets('TEST-AI-F32 the submit button is disabled and shows progress while sending', (tester) async {
      final hold = Future<void>.delayed(const Duration(seconds: 5));
      when(() => api.submitForm(
            url: any(named: 'url'),
            payload: any(named: 'payload'),
            sessionId: any(named: 'sessionId'),
          )).thenAnswer((_) => hold);
      await pump(tester);

      await tester.enterText(field('full_name'), 'Ann');
      await tester.enterText(field('email'), 'a@b.co');
      await tester.tap(find.byKey(const ValueKey('lead_form_submit')));
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Sending...'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const ValueKey('lead_form_submit'))).onPressed, isNull);

      await tester.pump(const Duration(seconds: 6));
      await tester.pumpAndSettle();
    });

    testWidgets('TEST-AI-F33 an already submitted form (restored session) is shown locked', (tester) async {
      controller.restoreMessages([
        ChatMessage.fromApiResponse(id: 'form1', rawReply: kFormHtml, responseType: 'form').copyWith(formSubmitted: true),
      ]);
      await pump(tester);

      expect(find.byKey(const ValueKey('lead_form')), findsNothing);
      expect(find.byKey(const ValueKey('lead_form_submitted')), findsOneWidget);
    });
  });

  group('TEST-AI-F2x: web-parity chrome', () {
    late MockAiAgentApiClient api;
    late AiChatController controller;

    setUp(() {
      api = MockAiAgentApiClient();
      controller = AiChatController(
        apiClient: api,
        config: const AiAgentConfig(
          apiUrl: 'https://crm.test',
          tenantId: 't1',
          botName: 'Claire',
          floodThrottleInterval: Duration(milliseconds: 1),
        ),
      );
      when(() => api.initWidget(contactId: any(named: 'contactId'))).thenAnswer(
        (_) async => {'config': {'welcomeMessage': 'Halo, ada yang bisa dibantu?'}},
      );
    });

    Future<void> pump(WidgetTester tester, {String? talk, String? caption}) async {
      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: AiChatView(
            controller: controller,
            showAppBar: false,
            talkToAgentLabel: talk,
            conversationStartedLabel: caption,
          ),
        ),
      ));
      await tester.pumpAndSettle();
    }

    testWidgets('TEST-AI-F34 bot bubble carries the sender name above it; the caption tops the list', (tester) async {
      await pump(tester, caption: 'Percakapan dimulai');
      expect(find.text('Percakapan dimulai'), findsOneWidget);
      expect(find.text('Claire'), findsOneWidget);
      expect(find.text('Halo, ada yang bisa dibantu?'), findsOneWidget);
    });

    testWidgets('TEST-AI-F35 talk-to-human button sends the request once, and disappears on handoff', (tester) async {
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
      await pump(tester, talk: 'Bicara dengan agen');

      await tester.tap(find.byKey(const ValueKey('talk_to_agent')));
      await tester.pumpAndSettle();

      verify(() => api.sendMessage(
            sessionId: any(named: 'sessionId'),
            message: any(named: 'message'),
            contactId: any(named: 'contactId'),
            channel: any(named: 'channel'),
            emailCenter: any(named: 'emailCenter'),
          )).called(1);
      expect(find.byKey(const ValueKey('talk_to_agent')), findsNothing);
      expect(find.text('Sarah'), findsOneWidget);
    });
  });
}
