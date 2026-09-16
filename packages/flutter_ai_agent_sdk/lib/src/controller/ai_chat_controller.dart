import 'package:flutter/foundation.dart';
import '../client/ai_agent_api_client.dart';
import '../config/ai_agent_config.dart';
import '../models/chat_message.dart';
import '../models/quick_reply_option.dart';
import '../models/response_type.dart';
import '../security/rate_limiter.dart';

/// State Controller for the AI Chat Widget.
/// Uses standard [ChangeNotifier] for complete compatibility with any Flutter app.
class AiChatController extends ChangeNotifier {
  final AiAgentApiClient apiClient;
  final AiAgentConfig config;
  final RateLimiter rateLimiter;

  List<ChatMessage> _messages = [];
  bool _isInitialized = false;
  bool _isTyping = false;
  bool _isHandoff = false;
  String? _errorMessage;
  late String _sessionId;
  String? contactId;

  AiChatController({
    required this.apiClient,
    required this.config,
    this.contactId,
    String? initialSessionId,
  })  : rateLimiter = RateLimiter(interval: config.floodThrottleInterval),
        _sessionId = initialSessionId ?? 'session_${DateTime.now().millisecondsSinceEpoch}';

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isInitialized => _isInitialized;
  bool get isTyping => _isTyping;
  bool get isHandoff => _isHandoff;
  String? get errorMessage => _errorMessage;
  String get sessionId => _sessionId;

  /// Initializes conversation with Welcome message.
  Future<void> initialize({String? customWelcomeMessage, List<String>? defaultOptions}) async {
    if (_isInitialized) return;

    try {
      final initData = await apiClient.initWidget(contactId: contactId);
      final tenantConfig = initData['config'] as Map<String, dynamic>? ?? {};

      final welcomeText = customWelcomeMessage ??
          tenantConfig['welcomeMessage']?.toString() ??
          'Hello! How can I assist you with CEO Suite services today?';

      final optionsRaw = defaultOptions ?? tenantConfig['welcomeMessageOptions'];

      _messages = [
        ChatMessage(
          id: 'welcome_${DateTime.now().millisecondsSinceEpoch}',
          sender: MessageSender.bot,
          text: welcomeText,
          type: optionsRaw != null ? ResponseType.options : ResponseType.text,
          options: QuickReplyOption.parseList(optionsRaw),
          timestamp: DateTime.now(),
        ),
      ];

      _isInitialized = true;
      _errorMessage = null;
    } catch (e) {
      // Offline fallback: still show default welcome message so UI never breaks
      _messages = [
        ChatMessage(
          id: 'welcome_fallback',
          sender: MessageSender.bot,
          text: customWelcomeMessage ?? 'Welcome to CEO Suite Portal! How can we assist you today?',
          timestamp: DateTime.now(),
        ),
      ];
      _isInitialized = true;
      _errorMessage = 'Note: Connected in offline fallback mode.';
    } finally {
      notifyListeners();
    }
  }

  /// Sends a text message from the user.
  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    // Rate limiter anti-flood check
    if (!rateLimiter.allowAction()) {
      _errorMessage = 'Mohon tunggu sebentar sebelum mengirim pesan kembali.';
      notifyListeners();
      return;
    }

    _errorMessage = null;

    final userMsgId = 'user_${DateTime.now().millisecondsSinceEpoch}';
    final userMsg = ChatMessage(
      id: userMsgId,
      sender: MessageSender.user,
      text: trimmed,
      timestamp: DateTime.now(),
      status: MessageStatus.sending,
    );

    // Optimistic UI Update: add user message immediately
    _messages.add(userMsg);
    _isTyping = true;
    notifyListeners();

    try {
      final botReply = await apiClient.sendMessage(
        sessionId: _sessionId,
        message: trimmed,
        contactId: contactId,
      );

      // Update user message status to sent
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] = _messages[userIdx].copyWith(status: MessageStatus.sent);
      }

      // Add bot reply
      _messages.add(botReply);

      if (botReply.isHandoff) {
        _isHandoff = true;
      }
    } catch (e) {
      // Mark user message with error
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] = _messages[userIdx].copyWith(status: MessageStatus.error);
      }

      _errorMessage = 'Gagal mengirim pesan: ${e.toString()}';
    } finally {
      _isTyping = false;
      notifyListeners();
    }
  }

  /// Sends a Quick Reply option selection.
  Future<void> selectOption(QuickReplyOption option) async {
    await sendMessage(option.value.isNotEmpty ? option.value : option.label);
  }

  /// Resets conversation and session.
  void restartChat() {
    _sessionId = 'session_${DateTime.now().microsecondsSinceEpoch}';
    _isHandoff = false;
    _isInitialized = false;
    _messages.clear();
    _errorMessage = null;
    rateLimiter.reset();
    initialize();
  }
}
