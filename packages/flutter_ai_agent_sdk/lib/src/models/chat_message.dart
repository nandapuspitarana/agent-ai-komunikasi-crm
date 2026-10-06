import 'card_payload.dart';
import 'form_payload.dart';
import 'html_reply_parser.dart';
import 'quick_reply_option.dart';
import 'response_type.dart';

enum MessageSender {
  user,
  bot,
  agent;

  bool get isUser => this == MessageSender.user;
  bool get isBot => this == MessageSender.bot;
  bool get isAgent => this == MessageSender.agent;
}

enum MessageStatus {
  sending,
  sent,
  error;
}

class ChatMessage {
  final String id;
  final MessageSender sender;
  final String? senderName;
  final ResponseType type;
  final String text;
  final List<QuickReplyOption> options;
  final CardPayload? card;
  final FormPayload? form;
  final DateTime timestamp;
  final MessageStatus status;
  final bool isHandoff;
  final String? sessionId;

  /// True for the greeting built from the server's welcome config (or the
  /// offline fallback). Lets the controller refresh a stale, persisted welcome.
  final bool isWelcome;

  /// True once the user submitted this message's [form]; the form is then locked.
  final bool formSubmitted;

  const ChatMessage({
    required this.id,
    required this.sender,
    this.senderName,
    required this.text,
    this.type = ResponseType.text,
    this.options = const [],
    this.card,
    this.form,
    required this.timestamp,
    this.status = MessageStatus.sent,
    this.isHandoff = false,
    this.sessionId,
    this.isWelcome = false,
    this.formSubmitted = false,
  });

  /// Whether this message is the greeting. Also recognises welcome messages
  /// persisted by older SDK versions, which have no [isWelcome] flag.
  bool get looksLikeWelcome => isWelcome || (sender.isBot && id.startsWith('welcome'));

  /// Factory for constructing a bot reply from raw CRM API response.
  factory ChatMessage.fromApiResponse({
    required String id,
    required String rawReply,
    String? responseType,
    dynamic rawOptions,
    bool handoffOccurred = false,
    String? senderName,
    String? sessionId,
  }) {
    ResponseType parsedType = ResponseType.fromString(responseType);

    // Auto-detect handoff tag in reply text
    bool isHandoff = handoffOccurred || rawReply.contains('[HANDOFF_REQUESTED]');
    String cleanText = rawReply.replaceAll('[HANDOFF_REQUESTED]', '').trim();

    // Check for Info Card HTML
    CardPayload? card;
    if (parsedType == ResponseType.card ||
        cleanText.contains("class='card'") ||
        cleanText.contains('class="card"')) {
      card = CardPayload.parseFromHtmlOrText(cleanText);
      if (card != null) {
        parsedType = ResponseType.card;
        cleanText = card.title;
      }
    }

    // Check for Lead Form HTML
    FormPayload? form;
    if (parsedType == ResponseType.form ||
        cleanText.contains("class='form-card'") ||
        cleanText.contains('class="form-card"')) {
      form = FormPayload.parseFromHtml(cleanText);
      if (form != null) {
        parsedType = ResponseType.form;
        cleanText = form.introMessage;
      }
    }

    // Parse options
    var options = QuickReplyOption.parseList(rawOptions);

    // Older backends embed quick-reply buttons as HTML inside the reply text.
    // Recover them as real options and never show raw tags in the bubble.
    if (card == null && form == null && cleanText.contains('<')) {
      final parsed = HtmlReplyParser.parse(cleanText);
      cleanText = parsed.text;
      if (options.isEmpty) options = parsed.options;
    }

    if (options.isNotEmpty && parsedType == ResponseType.text) {
      parsedType = ResponseType.options;
    }

    return ChatMessage(
      id: id,
      sender: isHandoff ? MessageSender.agent : MessageSender.bot,
      senderName: senderName,
      text: cleanText,
      type: parsedType,
      options: options,
      card: card,
      form: form,
      timestamp: DateTime.now(),
      status: MessageStatus.sent,
      isHandoff: isHandoff,
      sessionId: sessionId,
    );
  }

  /// Factory for constructing a message from the server sync/polling response.
  factory ChatMessage.fromSyncJson(Map<String, dynamic> json, {String? defaultAgentName}) {
    final id = json['id']?.toString() ?? 'msg_${DateTime.now().millisecondsSinceEpoch}';
    final senderType = (json['senderType']?.toString() ?? json['sender']?.toString() ?? 'bot').toLowerCase();
    final rawText = json['content']?.toString() ?? json['text']?.toString() ?? '';
    final createdAtStr = json['createdAt']?.toString() ?? json['timestamp']?.toString();
    final timestamp = createdAtStr != null
        ? DateTime.tryParse(createdAtStr) ?? DateTime.now()
        : DateTime.now();

    final MessageSender sender;
    if (senderType == 'user') {
      sender = MessageSender.user;
    } else if (senderType == 'agent') {
      sender = MessageSender.agent;
    } else {
      sender = MessageSender.bot;
    }

    final isHandoff = sender == MessageSender.agent;
    final senderName = json['senderName']?.toString() ??
        (sender == MessageSender.agent ? (defaultAgentName ?? 'Live Support') : null);

    return ChatMessage(
      id: id,
      sender: sender,
      senderName: senderName,
      text: rawText.replaceAll('[HANDOFF_REQUESTED]', '').trim(),
      timestamp: timestamp,
      status: MessageStatus.sent,
      isHandoff: isHandoff,
      sessionId: json['sessionId']?.toString(),
    );
  }

  /// Creates a copy of this message with updated status.
  ChatMessage copyWith({
    String? text,
    MessageStatus? status,
    bool? isHandoff,
    String? senderName,
    String? sessionId,
    bool? formSubmitted,
  }) {
    return ChatMessage(
      id: id,
      sender: sender,
      senderName: senderName ?? this.senderName,
      text: text ?? this.text,
      type: type,
      options: options,
      card: card,
      form: form,
      timestamp: timestamp,
      status: status ?? this.status,
      isHandoff: isHandoff ?? this.isHandoff,
      sessionId: sessionId ?? this.sessionId,
      isWelcome: isWelcome,
      formSubmitted: formSubmitted ?? this.formSubmitted,
    );
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    var rawText = json['text'] as String? ?? '';
    final card = json['card'] != null
        ? CardPayload.fromJson(Map<String, dynamic>.from(json['card'] as Map))
        : null;
    final form = json['form'] != null
        ? FormPayload.fromJson(Map<String, dynamic>.from(json['form'] as Map))
        : null;

    if (card == null && form == null && rawText.contains('<')) {
      final parsed = HtmlReplyParser.parse(rawText);
      rawText = parsed.text;
    }

    return ChatMessage(
      id: json['id'] as String? ?? 'msg_${DateTime.now().millisecondsSinceEpoch}',
      sender: MessageSender.values.firstWhere(
        (s) => s.name == json['sender'],
        orElse: () => MessageSender.bot,
      ),
      senderName: json['senderName'] as String?,
      text: rawText,
      type: ResponseType.fromString(json['type'] as String?),
      options: (json['options'] as List<dynamic>?)
              ?.map((o) => QuickReplyOption.fromJson(Map<String, dynamic>.from(o as Map)))
              .toList() ??
          const [],
      card: card,
      form: form,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      status: MessageStatus.sent,
      isHandoff: json['isHandoff'] == true,
      sessionId: json['sessionId'] as String?,
      isWelcome: json['isWelcome'] == true,
      formSubmitted: json['formSubmitted'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'sender': sender.name,
        'senderName': senderName,
        'type': type.name,
        'text': text,
        'options': options.map((o) => o.toJson()).toList(),
        'card': card?.toJson(),
        'form': form?.toJson(),
        'timestamp': timestamp.toIso8601String(),
        'isHandoff': isHandoff,
        'sessionId': sessionId,
        'isWelcome': isWelcome,
        'formSubmitted': formSubmitted,
      };
}
