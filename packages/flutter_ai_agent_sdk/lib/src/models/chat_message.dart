import 'card_payload.dart';
import 'form_payload.dart';
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
  });

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
    if (parsedType == ResponseType.card || cleanText.contains("class='card'")) {
      card = CardPayload.parseFromHtmlOrText(cleanText);
      if (card != null) {
        parsedType = ResponseType.card;
        cleanText = card.title;
      }
    }

    // Check for Lead Form HTML
    FormPayload? form;
    if (parsedType == ResponseType.form || cleanText.contains("class='form-card'")) {
      form = FormPayload.parseFromHtml(cleanText);
      if (form != null) {
        parsedType = ResponseType.form;
        cleanText = form.introMessage;
      }
    }

    // Parse options
    final options = QuickReplyOption.parseList(rawOptions);
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

  /// Creates a copy of this message with updated status.
  ChatMessage copyWith({
    String? text,
    MessageStatus? status,
    bool? isHandoff,
    String? senderName,
    String? sessionId,
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
      };
}
