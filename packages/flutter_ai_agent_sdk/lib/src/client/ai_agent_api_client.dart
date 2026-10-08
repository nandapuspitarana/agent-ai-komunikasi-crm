import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/ai_agent_config.dart';
import '../models/chat_message.dart';
import '../security/content_sanitizer.dart';
import '../version.dart';

class AiAgentApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  const AiAgentApiException(this.message, {this.statusCode, this.details});

  @override
  String toString() => 'AiAgentApiException: $message (Status: $statusCode)';
}

/// HTTP REST Client for communicating with Next.js CRM AI Agent backend.
class AiAgentApiClient {
  final AiAgentConfig config;
  final http.Client _httpClient;

  AiAgentApiClient({
    required this.config,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  /// Inits chat widget configuration (Welcome message, tenant name, theme).
  Future<Map<String, dynamic>> initWidget({String? contactId}) async {
    final uri = Uri.parse('${config.sanitizedApiUrl}/api/widget/init');
    final body = jsonEncode({
      'tenantId': config.tenantId,
      if (contactId != null) 'contactId': contactId,
      // lets the server report whether this SDK is current / outdated / unsupported
      'sdkVersion': aiAgentSdkVersion,
    });

    final res = await _postWithRetry(uri, body);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Reads server, API and SDK versions from `GET /api/version`, so the app can
  /// tell whether this SDK (and the backend) is up to date.
  Future<ServerVersionInfo> fetchServerVersion() async {
    final uri = Uri.parse('${config.sanitizedApiUrl}/api/version')
        .replace(queryParameters: {'sdk': aiAgentSdkVersion});

    final http.Response res;
    try {
      res =
          await _httpClient.get(uri, headers: _headers).timeout(config.timeout);
    } catch (e) {
      throw AiAgentApiException('Network connection failure: $e');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiAgentApiException('Server returned error: ${res.statusCode}',
          statusCode: res.statusCode, details: res.body);
    }
    return ServerVersionInfo.fromJson(
        jsonDecode(res.body) as Map<String, dynamic>);
  }

  /// Fetches session details and message history from `GET /api/widget/message`.
  /// Allows the client to receive human agent replies and status updates asynchronously.
  Future<Map<String, dynamic>> syncMessages({
    required String sessionId,
    String? contactId,
    String? after,
  }) async {
    final uri = Uri.parse('${config.sanitizedApiUrl}/api/widget/message').replace(
      queryParameters: {
        'sessionId': sessionId,
        'tenantId': config.tenantId,
        if (contactId != null && contactId.isNotEmpty) 'contactId': contactId,
        if (after != null && after.isNotEmpty) 'after': after,
      },
    );

    final http.Response res;
    try {
      res = await _httpClient.get(uri, headers: _headers).timeout(config.timeout);
    } catch (e) {
      throw AiAgentApiException('Network connection failure: $e');
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiAgentApiException(
        'Server returned error: ${res.statusCode}',
        statusCode: res.statusCode,
        details: res.body,
      );
    }

    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Sends a chat message to the agent.
  /// Returns the bot reply as a [ChatMessage].
  Future<ChatMessage> sendMessage({
    required String sessionId,
    required String message,
    String? contactId,
    String channel = 'mobile_app',
  }) async {
    final sanitizedMessage = ContentSanitizer.sanitize(message);
    if (sanitizedMessage.isEmpty) {
      throw const AiAgentApiException('Message cannot be empty');
    }

    final uri = Uri.parse('${config.sanitizedApiUrl}/api/widget/message');
    final payload = {
      'tenantId': config.tenantId,
      'sessionId': sessionId,
      'message': sanitizedMessage,
      if (contactId != null) 'contactId': contactId,
      'channel': channel,
    };

    // Not retried: a second POST could deliver the user message and generate AI replies twice.
    final http.Response res;
    try {
      res = await _httpClient
          .post(uri, headers: _headers, body: jsonEncode(payload))
          .timeout(config.timeout);
    } catch (e) {
      throw AiAgentApiException('Network connection failure: $e');
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiAgentApiException(
        'Server returned error: ${res.statusCode}',
        statusCode: res.statusCode,
        details: res.body,
      );
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;

    final replyText = data['reply']?.toString() ?? '';
    final responseType = data['responseType']?.toString();
    final options = data['options'];
    // status 'agent' = a human already owns the session; the server sends
    // reply:null because the agent answers from the dashboard.
    final handoffOccurred = data['handoffOccurred'] == true ||
        data['status']?.toString() == 'agent';
    final senderName = data['senderName']?.toString() ??
        data['agentName']?.toString() ??
        (handoffOccurred ? null : data['botName']?.toString());
    final serverSessionId =
        data['sessionId']?.toString() ?? data['session_id']?.toString();
    final messageId = data['messageId']?.toString() ??
        data['id']?.toString() ??
        'bot_${DateTime.now().millisecondsSinceEpoch}';

    return ChatMessage.fromApiResponse(
      id: messageId,
      rawReply: replyText,
      responseType: responseType,
      rawOptions: options,
      handoffOccurred: handoffOccurred,
      senderName: senderName,
      sessionId: serverSessionId,
    );
  }

  /// Submits a lead form through the CRM's `/api/widget/form-proxy`, exactly
  /// like the web widget: the CRM forwards [payload] to the form's webhook
  /// [url] and, when [sessionId] is a session the server knows, records the
  /// submission in that conversation.
  ///
  /// Not retried: a second POST could deliver the same lead twice.
  Future<void> submitForm({
    required String url,
    required Map<String, String> payload,
    String? sessionId,
  }) async {
    final uri = Uri.parse('${config.sanitizedApiUrl}/api/widget/form-proxy');
    final body = jsonEncode({
      'url': url,
      'payload': payload,
      if (sessionId != null) 'sessionId': sessionId,
      'tenantId': config.tenantId,
    });

    final http.Response res;
    try {
      res = await _httpClient.post(uri, headers: _headers, body: body).timeout(config.timeout);
    } catch (e) {
      throw AiAgentApiException('Network connection failure: $e');
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiAgentApiException(
        'Server returned error: ${res.statusCode}',
        statusCode: res.statusCode,
        details: res.body,
      );
    }
  }

  /// Submits the contact / report problem funnel form to `/api/widget/contact-submit`.
  Future<Map<String, dynamic>> submitContactForm({
    required String category,
    required String description,
    String? sessionId,
    String? contactId,
    String? email,
    String? name,
    String? company,
  }) async {
    final uri = Uri.parse('${config.sanitizedApiUrl}/api/widget/contact-submit');
    final payload = {
      'tenantId': config.tenantId,
      'category': category,
      'description': description,
      if (sessionId != null && sessionId.isNotEmpty) 'sessionId': sessionId,
      if (contactId != null && contactId.isNotEmpty) 'contactId': contactId,
      if (email != null && email.isNotEmpty) 'email': email,
      if (name != null && name.isNotEmpty) 'name': name,
      if (company != null && company.isNotEmpty) 'company': company,
    };

    final http.Response res;
    try {
      res = await _httpClient
          .post(uri, headers: _headers, body: jsonEncode(payload))
          .timeout(config.timeout);
    } catch (e) {
      throw AiAgentApiException('Network connection failure: $e');
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiAgentApiException(
        'Server returned error: ${res.statusCode}',
        statusCode: res.statusCode,
        details: res.body,
      );
    }

    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Internal POST with 1-time retry for transient network drops.
  Future<http.Response> _postWithRetry(Uri uri, String body) async {
    int attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        final response = await _httpClient
            .post(uri, headers: _headers, body: body)
            .timeout(config.timeout);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response;
        } else {
          throw AiAgentApiException(
            'Server returned error: ${response.statusCode}',
            statusCode: response.statusCode,
            details: response.body,
          );
        }
      } catch (e) {
        if (attempts >= maxAttempts || e is AiAgentApiException) {
          if (e is AiAgentApiException) rethrow;
          throw AiAgentApiException('Network connection failure: $e');
        }
        // Wait 1.5s before retry
        await Future.delayed(const Duration(milliseconds: 1500));
      }
    }

    throw const AiAgentApiException('Failed to complete request after retry');
  }

  void dispose() {
    _httpClient.close();
  }
}
