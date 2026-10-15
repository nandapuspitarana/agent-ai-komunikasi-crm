import 'dart:async';
import 'package:flutter/foundation.dart';
import '../client/ai_agent_api_client.dart';
import '../config/ai_agent_config.dart';
import '../models/chat_message.dart';
import '../models/quick_reply_option.dart';
import '../models/response_type.dart';
import '../models/html_reply_parser.dart';
import '../security/rate_limiter.dart';
import '../ui/widgets/contact_funnel_modal.dart';
import '../version.dart';

/// State Controller for the AI Chat Widget.
/// Uses standard [ChangeNotifier] for complete compatibility with any Flutter app.
class AiChatController extends ChangeNotifier {
  final AiAgentApiClient apiClient;
  final AiAgentConfig config;
  final RateLimiter rateLimiter;

  List<ChatMessage> _messages = [];
  bool _isInitialized = false;
  bool _configLoaded = false;
  bool _initFailed = false;
  Future<void>? _initFuture;
  ChatMessage? _lastWelcome;
  ServerVersionInfo? _versionInfo;
  bool _isTyping = false;
  bool _isSending = false;
  bool _isHandoff = false;
  bool _humanHandoffEnabled = true;
  String? _fallbackEmail;
  String? _tenantName;
  String? _botName;
  String? _currentAgentName;
  String? _cardActionLabel;
  String? _cardBannerTitle;
  String? _tenantLanguage;
  Map<String, dynamic>? _contactFormConfig;
  String? _errorMessage;
  late String _sessionId;
  Timer? _pollTimer;
  bool _isSyncing = false;

  /// Session id the server has confirmed in a reply. Forms are only recorded
  /// against a session the server knows (a fresh client id has no row yet).
  String? _serverSessionId;
  final Set<String> _submittingForms = {};
  final String? contactId;

  AiChatController({
    AiAgentApiClient? apiClient,
    required this.config,
    this.contactId,
    String? initialSessionId,
    List<ChatMessage>? initialMessages,
    String? emailCenter,
  })  : apiClient = apiClient ?? AiAgentApiClient(config: config),
        rateLimiter = RateLimiter(interval: config.floodThrottleInterval),
        _sessionId = initialSessionId ?? _newSessionId(),
        _messages = initialMessages != null ? List.from(initialMessages) : [],
        _humanHandoffEnabled = config.humanHandoffEnabled ?? true,
        _fallbackEmail = config.fallbackEmail,
        _emailCenter = emailCenter,
        _isInitialized = initialMessages != null && initialMessages.isNotEmpty;

  static int _sessionSeq = 0;

  /// Client-side session id. The counter keeps ids unique even when two are
  /// created within one clock tick (coarse timers, e.g. on Windows).
  static String _newSessionId() =>
      'session_${DateTime.now().microsecondsSinceEpoch}_${_sessionSeq++}';

  List<ChatMessage> get messages => List.unmodifiable(_messages);

  /// Restores previously persisted messages into controller state.
  void restoreMessages(List<ChatMessage> messages, {String? sessionId}) {
    if (messages.isEmpty) return;
    _messages = List.from(messages);
    if (sessionId != null && sessionId.isNotEmpty) {
      _sessionId = sessionId;
      if (!sessionId.startsWith('session_')) {
        _serverSessionId = sessionId;
      }
    }
    _isInitialized = true;
    for (final m in messages.reversed) {
      if (m.sessionId != null && m.sessionId!.isNotEmpty) {
        _serverSessionId = m.sessionId;
        break;
      }
    }
    // Config may already have been fetched (init finished before the restore
    // landed): apply the fresh greeting over a stale persisted one.
    final welcome = _lastWelcome;
    if (welcome != null) _refreshWelcome(welcome);
    notifyListeners();
    if (config.enablePolling) startPolling();
  }

  bool get isInitialized => _isInitialized;

  /// Server/API/SDK versions, as reported by the backend during [initialize]
  /// or the last [checkVersion]. `null` until known (or for servers too old to report it).
  ServerVersionInfo? get versionInfo => _versionInfo;

  /// Whether this SDK is current, outdated or unsupported according to the server.
  SdkStatus get sdkStatus => _versionInfo?.status ?? SdkStatus.unknown;

  /// Asks the server for its versions (`GET /api/version`). Returns `null` if
  /// the check fails; never throws, so it is safe to call fire-and-forget.
  Future<ServerVersionInfo?> checkVersion() async {
    try {
      final info = await apiClient.fetchServerVersion();
      _versionInfo = info;
      notifyListeners();
      return info;
    } catch (_) {
      return null;
    }
  }

  /// True when the last attempt to load the server config failed, so the UI
  /// can offer a retry. [initialize] can be called again to retry.
  bool get needsRetry => _initFailed;
  bool get isTyping => _isTyping;
  bool get isSending => _isSending;
  bool get isHandoff => _isHandoff;
  bool get humanHandoffEnabled => _humanHandoffEnabled;
  String? get fallbackEmail => _fallbackEmail ?? config.fallbackEmail;
  String? get tenantName => _tenantName ?? config.tenantName;
  String get botName => _botName ?? config.botName;
  String? get currentAgentName => _currentAgentName;
  String? get cardActionLabel => _cardActionLabel ?? config.cardActionLabel;
  String? get cardBannerTitle => _cardBannerTitle ?? config.cardBannerTitle;
  String? get tenantLanguage => _tenantLanguage;
  Map<String, dynamic>? get contactFormConfig => _contactFormConfig;

  String? _emailCenter;
  String? get emailCenter => _emailCenter;
  set emailCenter(String? value) {
    if (_emailCenter != value) {
      _emailCenter = value;
      notifyListeners();
    }
  }

  /// Dynamic responder name:
  /// - When in handoff mode: returns the human agent's name (or 'Live Support' fallback).
  /// - When in bot mode: returns the dynamic bot name (e.g. 'Claire' or resolved from CRM server).
  String get activeResponderName {
    if (_isHandoff) {
      return (_currentAgentName != null && _currentAgentName!.isNotEmpty)
          ? _currentAgentName!
          : 'Live Support';
    }
    return botName;
  }

  /// Resolves contact funnel strings using tenant language and contactForm settings.
  ContactFunnelStrings resolveContactFunnelStrings([ContactFunnelStrings? custom]) {
    if (custom != null && custom != const ContactFunnelStrings()) {
      return custom;
    }
    return ContactFunnelStrings.fromConfig(
      contactFormConfig: _contactFormConfig,
      language: _tenantLanguage,
    );
  }

  String? get errorMessage => _errorMessage;
  String get sessionId => _sessionId;

  /// Initializes the conversation with the welcome message from the server.
  ///
  /// Safe to call repeatedly and concurrently:
  /// * concurrent calls share one request;
  /// * a no-op once the config has been loaded;
  /// * if history was restored (or an earlier attempt fell back offline) it
  ///   only refreshes the greeting and bot names and never replaces the history.
  Future<void> initialize(
      {String? customWelcomeMessage, List<String>? defaultOptions}) {
    final inFlight = _initFuture;
    if (inFlight != null) return inFlight;
    if (_isInitialized && _configLoaded) return Future.value();

    late final Future<void> future;
    future = _loadConfig(customWelcomeMessage, defaultOptions).whenComplete(() {
      if (identical(_initFuture, future)) _initFuture = null;
    });
    _initFuture = future;
    return future;
  }

  Future<void> _loadConfig(
      String? customWelcomeMessage, List<String>? defaultOptions) async {
    try {
      final initData = await apiClient.initWidget(contactId: contactId);
      final tenantConfig = initData['config'] as Map<String, dynamic>? ?? {};

      final versionJson = initData['version'];
      if (versionJson is Map) {
        _versionInfo =
            ServerVersionInfo.fromJson(Map<String, dynamic>.from(versionJson));
      }

      // Resolve tenant name dynamically from CRM init data if present
      final fetchedTenantName = tenantConfig['tenantName']?.toString() ??
          tenantConfig['name']?.toString();
      if (fetchedTenantName != null && fetchedTenantName.isNotEmpty) {
        _tenantName = fetchedTenantName;
      }

      // Resolve bot name dynamically from CRM init data if present
      final fetchedBotName = tenantConfig['botName']?.toString() ??
          tenantConfig['agentName']?.toString() ??
          (tenantConfig['initialFlow'] is Map
              ? tenantConfig['initialFlow']['name']?.toString()
              : null);
      if (fetchedBotName != null && fetchedBotName.isNotEmpty) {
        _botName = fetchedBotName;
      }

      // Resolve info card strings dynamically from CRM init data if present
      final fetchedCardAction = tenantConfig['cardActionLabel']?.toString() ??
          tenantConfig['cardActionText']?.toString() ??
          tenantConfig['infoCardActionLabel']?.toString();
      if (fetchedCardAction != null && fetchedCardAction.isNotEmpty) {
        _cardActionLabel = fetchedCardAction;
      }

      final fetchedBannerTitle = tenantConfig['cardBannerTitle']?.toString() ??
          tenantConfig['infoCardBannerTitle']?.toString();
      if (fetchedBannerTitle != null && fetchedBannerTitle.isNotEmpty) {
        _cardBannerTitle = fetchedBannerTitle;
      }

      if (tenantConfig.containsKey('humanHandoffEnabled')) {
        _humanHandoffEnabled = tenantConfig['humanHandoffEnabled'] as bool? ?? true;
      } else if (config.humanHandoffEnabled != null) {
        _humanHandoffEnabled = config.humanHandoffEnabled!;
      }

      final fetchedFallbackEmail = tenantConfig['fallbackEmail']?.toString();
      if (fetchedFallbackEmail != null && fetchedFallbackEmail.isNotEmpty) {
        _fallbackEmail = fetchedFallbackEmail;
      }

      final fetchedLanguage = tenantConfig['language']?.toString();
      if (fetchedLanguage != null && fetchedLanguage.isNotEmpty) {
        _tenantLanguage = fetchedLanguage;
      }

      if (tenantConfig['contactForm'] is Map) {
        _contactFormConfig =
            Map<String, dynamic>.from(tenantConfig['contactForm'] as Map);
      }

      final welcome =
          _buildWelcome(tenantConfig, customWelcomeMessage, defaultOptions);
      _lastWelcome = welcome;
      _configLoaded = true;
      _initFailed = false;
      _errorMessage = null;

      if (_messages.isEmpty) {
        _messages = [welcome];
      } else {
        // History exists (restored while the request was in flight, or a
        // persisted session): keep it and only refresh a stale greeting.
        _refreshWelcome(welcome);
      }
      _isInitialized = true;
    } catch (e) {
      _initFailed = true;
      if (_messages.isEmpty) {
        // Offline fallback: still show a welcome message so the UI never
        // breaks. Marked as welcome so a later successful init replaces it.
        _messages = [
          ChatMessage(
            id: 'welcome_fallback',
            sender: MessageSender.bot,
            senderName: botName,
            text: customWelcomeMessage ?? _fallbackWelcomeText,
            timestamp: DateTime.now(),
            isWelcome: true,
          ),
        ];
        _errorMessage = 'Note: Connected in offline fallback mode.';
      }
      _isInitialized = true;
    } finally {
      if (config.enablePolling) startPolling();
      notifyListeners();
    }
  }

  String get _defaultWelcomeText {
    final name = tenantName;
    return (name != null && name.isNotEmpty)
        ? 'Hello! How can I assist you with $name today?'
        : 'Hello! How can I assist you today?';
  }

  String get _fallbackWelcomeText {
    final name = tenantName;
    return (name != null && name.isNotEmpty)
        ? 'Welcome to $name! How can we assist you today?'
        : 'Welcome! How can we assist you today?';
  }

  ChatMessage _buildWelcome(
    Map<String, dynamic> tenantConfig,
    String? customWelcomeMessage,
    List<String>? defaultOptions,
  ) {
    final serverText = tenantConfig['welcomeMessage']?.toString().trim();
    final welcomeText = customWelcomeMessage ??
        ((serverText != null && serverText.isNotEmpty)
            ? serverText
            : _defaultWelcomeText);

    // Structured `welcomeOptions` (new servers) wins over the legacy comma string.
    final optionsRaw = defaultOptions ??
        tenantConfig['welcomeOptions'] ??
        tenantConfig['welcomeMessageOptions'];
    var options = QuickReplyOption.parseList(optionsRaw);

    // An explicit text/form welcome must not show leftover buttons.
    final declaredType = tenantConfig['welcomeMessageType']?.toString();
    if (defaultOptions == null &&
        (declaredType == 'text' || declaredType == 'form')) {
      options = const [];
    }

    return ChatMessage(
      id: 'welcome_${DateTime.now().millisecondsSinceEpoch}',
      sender: MessageSender.bot,
      senderName: botName,
      text: welcomeText,
      type: options.isNotEmpty ? ResponseType.options : ResponseType.text,
      options: options,
      timestamp: DateTime.now(),
      isWelcome: true,
    );
  }

  /// Replaces a stale greeting at the head of the history (different text or
  /// buttons, or the offline fallback) without touching anything after it.
  void _refreshWelcome(ChatMessage fresh) {
    if (_messages.isEmpty) return;
    final first = _messages.first;
    if (!first.looksLikeWelcome) return;

    final sameOptions = first.options.length == fresh.options.length &&
        List.generate(first.options.length, (i) => i).every((i) =>
            first.options[i].label == fresh.options[i].label &&
            first.options[i].value == fresh.options[i].value);
    if (first.isWelcome && first.text == fresh.text && sameOptions) return;

    _messages[0] = ChatMessage(
      id: first.id,
      sender: MessageSender.bot,
      senderName: fresh.senderName,
      text: fresh.text,
      type: fresh.type,
      options: fresh.options,
      timestamp: first.timestamp,
      isWelcome: true,
    );
  }

  /// Sends a text message from the user.
  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isTyping || _isSending) return;
    _isSending = true;

    // Rate limiter anti-flood check
    if (!rateLimiter.allowAction()) {
      _errorMessage = 'Please wait a moment before sending another message.';
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
      final botReply = (_emailCenter != null && _emailCenter!.isNotEmpty)
          ? await apiClient.sendMessage(
              sessionId: _sessionId,
              message: trimmed,
              contactId: contactId,
              emailCenter: _emailCenter,
            )
          : await apiClient.sendMessage(
              sessionId: _sessionId,
              message: trimmed,
              contactId: contactId,
            );

      // Update user message status to sent
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] =
            _messages[userIdx].copyWith(status: MessageStatus.sent);
      }

      // Add bot or agent reply. An empty reply means a human agent already
      // owns the session and will answer from the dashboard: no blank bubble.
      final isEmptyReply = botReply.text.trim().isEmpty &&
          botReply.options.isEmpty &&
          botReply.card == null &&
          botReply.form == null;
      if (!isEmptyReply) _messages.add(botReply);

      // Sync confirmed server sessionId for ongoing turns
      if (botReply.sessionId != null && botReply.sessionId!.isNotEmpty) {
        _sessionId = botReply.sessionId!;
        _serverSessionId = botReply.sessionId;
      }

      if (botReply.isHandoff || botReply.sender.isAgent) {
        _isHandoff = true;
      }

      // Dynamically update responder name from response (bot or human agent)
      if (botReply.senderName != null && botReply.senderName!.isNotEmpty) {
        if (_isHandoff || botReply.sender.isAgent) {
          _currentAgentName = botReply.senderName;
        } else {
          _botName = botReply.senderName;
        }
      }
    } catch (e) {
      // Mark user message with error
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] =
            _messages[userIdx].copyWith(status: MessageStatus.error);
      }

      _errorMessage = 'Failed to send message: ${e.toString()}';
    } finally {
      _isSending = false;
      _isTyping = false;
      notifyListeners();
      if (config.enablePolling) startPolling();
    }
  }

  /// Sends a Quick Reply option selection.
  Future<void> selectOption(QuickReplyOption option) async {
    await sendMessage(option.value.isNotEmpty ? option.value : option.label);
  }

  /// Submits the lead form of message [messageId] with [values] (field name ->
  /// entered text).
  ///
  /// With a webhook the values go through the CRM's form-proxy, then the chat
  /// shows what was sent and a confirmation, like the web widget. Without a
  /// webhook the answers are sent to the agent as a normal message.
  ///
  /// Returns `null` on success, otherwise a message to show next to the form
  /// (which stays editable so the user can retry).
  Future<String?> submitForm(String messageId, Map<String, String> values) async {
    final idx = _messages.indexWhere((m) => m.id == messageId);
    if (idx == -1) return config.formErrorMessage;
    final message = _messages[idx];
    final form = message.form;
    if (form == null || message.formSubmitted) return null;
    if (!_submittingForms.add(messageId)) return null; // double tap

    try {
      final summary = formSummary(values);
      final url = form.webhookUrl;

      if (url == null || url.isEmpty) {
        final before = _messages.length;
        await sendMessage(summary);
        final sent = _messages.length > before &&
            _messages[before].status != MessageStatus.error;
        if (!sent) return _errorMessage ?? config.formErrorMessage;
      } else {
        try {
          await apiClient.submitForm(
            url: url,
            payload: values,
            sessionId: _serverSessionId,
          );
        } catch (_) {
          return config.formErrorMessage;
        }
        _messages.add(ChatMessage(
          id: 'user_form_${DateTime.now().microsecondsSinceEpoch}',
          sender: MessageSender.user,
          text: summary,
          timestamp: DateTime.now(),
        ));
        _messages.add(ChatMessage(
          id: 'bot_form_${DateTime.now().microsecondsSinceEpoch}',
          sender: MessageSender.bot,
          senderName: botName,
          text: config.formSuccessMessage,
          timestamp: DateTime.now(),
        ));
      }

      final at = _messages.indexWhere((m) => m.id == messageId);
      if (at != -1) {
        _messages[at] = _messages[at].copyWith(formSubmitted: true);
      }
      return null;
    } finally {
      _submittingForms.remove(messageId);
      notifyListeners();
    }
  }

  /// Text shown in the chat for a submitted form, same shape as the web widget.
  static String formSummary(Map<String, String> values) =>
      '\u{1F4DD} [Form Submitted]\n'
      '${values.entries.map((e) => '- ${e.key}: ${e.value}').join('\n')}';

  /// Submits the contact / report problem funnel form to the CRM backend (`/api/widget/contact-submit`).
  /// Adds the user submission summary and bot reply to the chat messages.
  Future<bool> submitContactForm({
    required String category,
    required String description,
    String? email,
    String? name,
    String? company,
    String? emailCenter,
  }) async {
    final trimmedCategory = category.trim();
    final trimmedDesc = description.trim();
    if (trimmedCategory.isEmpty || trimmedDesc.isEmpty || _isSending) return false;

    _isSending = true;
    _isTyping = true;
    _errorMessage = null;

    final isId = (_tenantLanguage ?? '').toLowerCase().startsWith('id');
    final userSummary = isId
        ? [
            '📝 [Laporan Masalah ke Perusahaan]',
            '• Kategori: $trimmedCategory',
            if (company != null && company.trim().isNotEmpty) '• Perusahaan: ${company.trim()}',
            if (name != null && name.trim().isNotEmpty) '• Nama: ${name.trim()}',
            if (email != null && email.trim().isNotEmpty) '• Email: ${email.trim()}',
            '• Deskripsi: $trimmedDesc',
          ].join('\n')
        : [
            '📝 [Inquiry / Issue Report to Company]',
            '• Category: $trimmedCategory',
            if (company != null && company.trim().isNotEmpty) '• Company: ${company.trim()}',
            if (name != null && name.trim().isNotEmpty) '• Name: ${name.trim()}',
            if (email != null && email.trim().isNotEmpty) '• Email: ${email.trim()}',
            '• Description: $trimmedDesc',
          ].join('\n');

    final userMsgId = 'user_${DateTime.now().millisecondsSinceEpoch}';
    final userMsg = ChatMessage(
      id: userMsgId,
      sender: MessageSender.user,
      text: userSummary,
      timestamp: DateTime.now(),
      status: MessageStatus.sending,
    );

    _messages.add(userMsg);
    notifyListeners();

    final resolvedEmailCenter = emailCenter ?? _emailCenter;

    try {
      final res = (resolvedEmailCenter != null && resolvedEmailCenter.isNotEmpty)
          ? await apiClient.submitContactForm(
              category: trimmedCategory,
              description: trimmedDesc,
              sessionId: _serverSessionId ?? (_sessionId.startsWith('session_') ? null : _sessionId),
              contactId: contactId,
              email: email,
              name: name,
              company: company,
              language: _tenantLanguage,
              emailCenter: resolvedEmailCenter,
            )
          : await apiClient.submitContactForm(
              category: trimmedCategory,
              description: trimmedDesc,
              sessionId: _serverSessionId ?? (_sessionId.startsWith('session_') ? null : _sessionId),
              contactId: contactId,
              email: email,
              name: name,
              company: company,
              language: _tenantLanguage,
            );

      final serverUserMsg = res['userMessage']?.toString();
      final finalUserText = (serverUserMsg != null && serverUserMsg.isNotEmpty)
          ? serverUserMsg
          : userSummary;
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] = _messages[userIdx].copyWith(
          text: finalUserText,
          status: MessageStatus.sent,
        );
      }

      final serverSession = res['sessionId']?.toString();
      if (serverSession != null && serverSession.isNotEmpty) {
        _sessionId = serverSession;
        _serverSessionId = serverSession;
      }

      final botReplyText = res['botReply']?.toString() ??
          (isId
              ? 'Terima kasih! Pesan dan laporan Anda telah kami teruskan ke tim perusahaan.'
              : 'Thank you! Your message and report has been forwarded to our team.');
      final botMsg = ChatMessage(
        id: 'bot_${DateTime.now().millisecondsSinceEpoch}',
        sender: MessageSender.bot,
        senderName: botName,
        text: botReplyText,
        timestamp: DateTime.now(),
      );
      _messages.add(botMsg);
      return true;
    } catch (e) {
      final userIdx = _messages.indexWhere((m) => m.id == userMsgId);
      if (userIdx != -1) {
        _messages[userIdx] = _messages[userIdx].copyWith(status: MessageStatus.error);
      }
      _errorMessage = 'Failed to submit contact form: $e';
      return false;
    } finally {
      _isSending = false;
      _isTyping = false;
      notifyListeners();
      if (config.enablePolling) startPolling();
    }
  }

  /// Resets conversation and session.
  Future<void> restartChat() async {
    stopPolling();
    _sessionId = _newSessionId();
    _serverSessionId = null;
    _submittingForms.clear();
    _isHandoff = false;
    _currentAgentName = null;
    _botName = null;
    _isInitialized = false;
    _configLoaded = false;
    _initFailed = false;
    _initFuture = null;
    _lastWelcome = null;
    _messages.clear();
    _errorMessage = null;
    rateLimiter.reset();
    await initialize();
  }

  /// Starts periodic polling to sync messages and session status from server.
  void startPolling({Duration? interval}) {
    final pollInterval = interval ?? config.pollingInterval;
    _pollTimer?.cancel();
    syncMessages();
    _pollTimer = Timer.periodic(pollInterval, (_) {
      syncMessages();
    });
  }

  /// Stops periodic polling.
  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  /// Syncs session state and incoming messages from the server.
  Future<void> syncMessages() async {
    final activeSessionId = _serverSessionId ?? (_sessionId.startsWith('session_') ? null : _sessionId);
    if ((activeSessionId == null || activeSessionId.isEmpty) && (contactId == null || contactId!.isEmpty)) return;
    if (_isSyncing) return;

    _isSyncing = true;
    try {
      final syncData = await apiClient.syncMessages(
        sessionId: activeSessionId ?? _sessionId,
        contactId: contactId,
      );
      final confirmedSessionId = syncData['sessionId']?.toString();
      if (confirmedSessionId != null && confirmedSessionId.isNotEmpty) {
        _sessionId = confirmedSessionId;
        _serverSessionId = confirmedSessionId;
      }

      final status = syncData['status']?.toString();
      final agentName = syncData['assignedAgentName']?.toString();
      final rawMessages = syncData['messages'] as List<dynamic>? ?? [];

      bool updated = false;

      // 1. Update session status & agent name
      if (status == 'agent' || status == 'queue') {
        if (!_isHandoff) {
          _isHandoff = true;
          updated = true;
        }
      }
      if (agentName != null && agentName.isNotEmpty && _currentAgentName != agentName) {
        _currentAgentName = agentName;
        updated = true;
      }

      // 2. Identify new messages
      for (final raw in rawMessages) {
        if (raw is! Map) continue;
        final rawMap = Map<String, dynamic>.from(raw);
        final msgId = rawMap['id']?.toString() ?? '';
        final senderType = (rawMap['senderType']?.toString() ?? rawMap['sender']?.toString() ?? '').toLowerCase();

        // Check if message already exists by ID
        final exists = _messages.any((m) => m.id == msgId);
        if (exists) continue;

        final rawText = (rawMap['content']?.toString() ?? rawMap['text']?.toString() ?? '')
            .replaceAll('[HANDOFF_REQUESTED]', '')
            .trim();

        // 1. If it's a user message from this device, match by text to prevent duplication
        if (senderType == 'user') {
          final existingUserIdx = _messages.indexWhere((m) =>
              m.sender == MessageSender.user &&
              (m.text.trim() == rawText || (m.id.startsWith('user_') && m.text.trim() == rawText)));
          if (existingUserIdx != -1) {
            // Update local optimistic ID with the confirmed DB ID
            if (msgId.isNotEmpty && _messages[existingUserIdx].id != msgId) {
              _messages[existingUserIdx] = _messages[existingUserIdx].copyWith(id: msgId);
            }
            continue;
          }
        }

        // 2. If it's a bot or agent message, match by text against existing bot/agent messages
        // to avoid duplicating messages already delivered via the immediate POST response
        if (senderType == 'bot' || senderType == 'agent') {
          final existingIdx = _messages.indexWhere((m) {
            if (m.sender != MessageSender.bot && m.sender != MessageSender.agent) return false;
            if (m.text.trim() == rawText) return true;
            if (m.card != null && (rawText.contains(m.card!.title) || m.card!.title == rawText)) return true;
            if (m.form != null && (rawText.contains(m.form!.introMessage) || m.form!.introMessage == rawText)) return true;
            if (rawText.contains('<')) {
              final parsed = HtmlReplyParser.parse(rawText);
              if (parsed.text.trim() == m.text.trim()) return true;
            }
            return false;
          });
          if (existingIdx != -1) {
            // Update temporary/local ID with confirmed DB ID
            if (_messages[existingIdx].id != msgId && msgId.isNotEmpty) {
              _messages[existingIdx] = _messages[existingIdx].copyWith(id: msgId);
            }
            continue;
          }
        }

        // New incoming message! (e.g. human agent reply, system alert, or bot message)
        final newMsg = ChatMessage.fromSyncJson(rawMap, defaultAgentName: _currentAgentName);
        _messages.add(newMsg);
        updated = true;
      }

      if (updated) {
        notifyListeners();
      }
    } catch (_) {
      // Ignore background network transient errors or unmocked calls in tests
    } finally {
      _isSyncing = false;
    }
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
