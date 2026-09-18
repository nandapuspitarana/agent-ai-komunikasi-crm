import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/ai_agent_config.dart';
import '../models/chat_message.dart';
import '../security/content_sanitizer.dart';

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
    });

    final res = await _postWithRetry(uri, body);
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

    final res = await _postWithRetry(uri, jsonEncode(payload));
    final data = jsonDecode(res.body) as Map<String, dynamic>;

    final replyText = data['reply']?.toString() ?? '';
    final responseType = data['responseType']?.toString();
    final options = data['options'];
    final handoffOccurred = data['handoffOccurred'] == true;
    final senderName = data['senderName']?.toString() ?? data['agentName']?.toString();

    return ChatMessage.fromApiResponse(
      id: 'bot_${DateTime.now().millisecondsSinceEpoch}',
      rawReply: replyText,
      responseType: responseType,
      rawOptions: options,
      handoffOccurred: handoffOccurred,
      senderName: senderName,
    );
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
