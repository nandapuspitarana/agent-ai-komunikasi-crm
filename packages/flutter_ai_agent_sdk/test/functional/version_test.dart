import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

const _cfg = AiAgentConfig(apiUrl: 'https://example.test/', tenantId: 't1');

Map<String, dynamic> _versionJson({String latest = '1.1.0', String min = '1.0.0'}) => {
      'name': 'agent-komunikasi',
      'version': '1.1.0',
      'apiVersion': '1.1.0',
      'commit': 'abcdef123456',
      'builtAt': '2026-09-30T10:00:00Z',
      'sdk': {'latest': latest, 'minSupported': min, 'client': aiAgentSdkVersion, 'status': 'current'},
    };

void main() {
  group('TEST-AI-V: SDK & server versions', () {
    test('TEST-AI-V10 aiAgentSdkVersion matches pubspec.yaml', () {
      final pubspec = File('pubspec.yaml').readAsStringSync();
      final declared = RegExp(r'^version:\s*(\S+)', multiLine: true).firstMatch(pubspec)!.group(1);
      expect(aiAgentSdkVersion, declared);
    });

    test('TEST-AI-V11 compareVersions is numeric and tolerant of suffixes', () {
      expect(compareVersions('1.10.0', '1.9.0')!, greaterThan(0));
      expect(compareVersions('1.0.0', '1.0.1')!, lessThan(0));
      expect(compareVersions('1.2.3+4', '1.2.3'), 0);
      expect(compareVersions('v2.0.0-beta', '1.9.9')!, greaterThan(0));
      expect(compareVersions('abc', '1.0.0'), isNull);
      expect(compareVersions(null, '1.0.0'), isNull);
    });

    test('TEST-AI-V12 status: current / updateAvailable / unsupported / unknown', () {
      ServerVersionInfo info(String client, {String latest = '1.1.0', String min = '1.0.0'}) =>
          ServerVersionInfo.fromJson(_versionJson(latest: latest, min: min), clientSdk: client);

      expect(info('1.1.0').status, SdkStatus.current);
      expect(info('2.0.0').status, SdkStatus.current);
      expect(info('1.0.5').status, SdkStatus.updateAvailable);
      expect(info('1.0.5').isUpdateAvailable, isTrue);
      expect(info('1.0.5').isUpdateRequired, isFalse);
      expect(info('0.9.0').status, SdkStatus.unsupported);
      expect(info('0.9.0').isUpdateRequired, isTrue);
      expect(info('garbage').status, SdkStatus.unknown);

      // a server too old to report SDK versions
      final bare = ServerVersionInfo.fromJson({'version': '1.0.0'});
      expect(bare.status, SdkStatus.unknown);
      expect(bare.latestSdk, isNull);
    });

    test('TEST-AI-V13 initWidget reports this SDK version to the server', () async {
      late Map<String, dynamic> sent;
      final client = AiAgentApiClient(
        config: _cfg,
        httpClient: MockClient((req) async {
          sent = jsonDecode(req.body) as Map<String, dynamic>;
          return http.Response(jsonEncode({'config': {}}), 200);
        }),
      );
      await client.initWidget(contactId: 'c1');
      expect(sent['sdkVersion'], aiAgentSdkVersion);
      expect(sent['tenantId'], 't1');
    });

    test('TEST-AI-V14 fetchServerVersion calls /api/version?sdk= and parses the answer', () async {
      late Uri requested;
      final client = AiAgentApiClient(
        config: _cfg,
        httpClient: MockClient((req) async {
          requested = req.url;
          return http.Response(jsonEncode(_versionJson()), 200);
        }),
      );
      final info = await client.fetchServerVersion();

      expect(requested.path, '/api/version');
      expect(requested.queryParameters['sdk'], aiAgentSdkVersion);
      expect(info.serverVersion, '1.1.0');
      expect(info.apiVersion, '1.1.0');
      expect(info.commit, 'abcdef123456');
      expect(info.latestSdk, '1.1.0');
      expect(info.status, SdkStatus.current);
    });

    test('TEST-AI-V15 fetchServerVersion surfaces HTTP and network failures as AiAgentApiException', () async {
      final http500 = AiAgentApiClient(config: _cfg, httpClient: MockClient((_) async => http.Response('boom', 500)));
      expect(http500.fetchServerVersion(), throwsA(isA<AiAgentApiException>()));

      final down = AiAgentApiClient(config: _cfg, httpClient: MockClient((_) async => throw const SocketException('offline')));
      expect(down.fetchServerVersion(), throwsA(isA<AiAgentApiException>()));
    });

    test('TEST-AI-V16 controller picks up the version block from init', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: AiAgentApiClient(
          config: _cfg,
          httpClient: MockClient((_) async => http.Response(
                jsonEncode({'config': {'welcomeMessage': 'Hi'}, 'version': _versionJson(latest: '9.0.0', min: '1.0.0')}),
                200,
              )),
        ),
      );
      expect(c.versionInfo, isNull);
      expect(c.sdkStatus, SdkStatus.unknown);

      await c.initialize();
      expect(c.versionInfo!.latestSdk, '9.0.0');
      expect(c.sdkStatus, SdkStatus.updateAvailable);
    });

    test('TEST-AI-V17 servers that do not report a version leave status unknown (no crash)', () async {
      final c = AiChatController(
        config: _cfg,
        apiClient: AiAgentApiClient(
          config: _cfg,
          httpClient: MockClient((_) async => http.Response(jsonEncode({'config': {'welcomeMessage': 'Hi'}}), 200)),
        ),
      );
      await c.initialize();
      expect(c.versionInfo, isNull);
      expect(c.sdkStatus, SdkStatus.unknown);
      expect(c.messages.single.text, 'Hi');
    });

    test('TEST-AI-V18 checkVersion updates the controller and never throws', () async {
      var fail = false;
      final c = AiChatController(
        config: _cfg,
        apiClient: AiAgentApiClient(
          config: _cfg,
          httpClient: MockClient((_) async => fail ? http.Response('x', 503) : http.Response(jsonEncode(_versionJson(min: '5.0.0', latest: '5.0.0')), 200)),
        ),
      );
      var notified = 0;
      c.addListener(() => notified++);

      final info = await c.checkVersion();
      expect(info, isNotNull);
      expect(c.sdkStatus, SdkStatus.unsupported);
      expect(notified, 1);

      fail = true;
      expect(await c.checkVersion(), isNull);
      expect(c.sdkStatus, SdkStatus.unsupported, reason: 'a failed re-check keeps the last known info');
    });
  });
}
