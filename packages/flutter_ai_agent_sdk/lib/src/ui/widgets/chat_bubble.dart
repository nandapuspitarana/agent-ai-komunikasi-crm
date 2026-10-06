import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/chat_message.dart';
import '../../models/quick_reply_option.dart';
import '../../models/response_type.dart';
import '../theme/ai_chat_theme.dart';
import 'info_card_view.dart';
import 'lead_form_view.dart';
import 'rich_message_text.dart';

/// One message of the conversation, laid out like the CRM web widget: a small
/// avatar and the sender's name next to bot/agent messages, a bubble with a
/// tail corner, the time underneath, and quick-reply chips below the bubble.
class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final AiChatTheme theme;
  final ValueChanged<String>? onLaunchUrl;

  /// Render [ChatMessage.options] as chips under the bubble.
  final bool showInlineOptions;

  /// Whether the chips can be tapped (latest bot message, not typing).
  final bool optionsEnabled;

  /// Value of the option the user already picked from this message, if any.
  final String? selectedOptionValue;

  final ValueChanged<QuickReplyOption>? onOptionSelected;

  /// Submits the lead form of a [ResponseType.form] message. Returns `null` on
  /// success or an error message to show under the form.
  final Future<String?> Function(ChatMessage message, Map<String, String> values)?
      onSubmitForm;

  final LeadFormStrings formStrings;
  final InfoCardStrings cardStrings;
  final String? cardActionLabel;
  final String? cardBannerTitle;

  /// Show the sender's name above bot/agent bubbles (as the web widget does).
  final bool showSenderName;

  const ChatBubble({
    super.key,
    required this.message,
    required this.theme,
    this.onLaunchUrl,
    this.showInlineOptions = false,
    this.optionsEnabled = false,
    this.selectedOptionValue,
    this.onOptionSelected,
    this.onSubmitForm,
    this.formStrings = const LeadFormStrings(),
    this.cardStrings = const InfoCardStrings(),
    this.cardActionLabel,
    this.cardBannerTitle,
    this.showSenderName = true,
  });

  static const double _avatarRadius = 12;
  static const Color _slate400 = Color(0xFF94A3B8);
  static const Color _slate500 = Color(0xFF64748B);
  static const Color _agentGreen = Color(0xFF059669);

  bool get _hasForm => message.type == ResponseType.form && message.form != null;

  @override
  Widget build(BuildContext context) {
    final isUser = message.sender.isUser;
    final isAgent = message.sender.isAgent;
    final isDark =
        theme.isDark || Theme.of(context).brightness == Brightness.dark;
    final timeStr = DateFormat('HH:mm').format(message.timestamp);

    final senderName = isAgent
        ? ((message.senderName ?? '').isNotEmpty ? message.senderName! : 'Human Agent')
        : message.senderName;
    final showName = showSenderName && !isUser && (senderName ?? '').isNotEmpty;

    final width = MediaQuery.of(context).size.width;
    final maxBubbleWidth = width * (_hasForm ? 0.86 : 0.78);

    final bubbleColor = isUser ? theme.userBubbleColor : theme.botBubbleColor;
    final textColor = isUser ? theme.userTextColor : theme.botTextColor;

    final bubble = Container(
      constraints: BoxConstraints(maxWidth: maxBubbleWidth),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bubbleColor,
        border: isUser
            ? null
            : Border.all(color: theme.resolvedBotBubbleBorderColor, width: 1),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(theme.bubbleRadius),
          topRight: Radius.circular(theme.bubbleRadius),
          bottomLeft: Radius.circular(isUser ? theme.bubbleRadius : 4),
          bottomRight: Radius.circular(isUser ? 4 : theme.bubbleRadius),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (message.text.isNotEmpty || !_hasForm)
            RichMessageText(
              text: message.text,
              onLaunchUrl: onLaunchUrl,
              linkColor: isUser ? Colors.white : theme.primaryColor,
              style: TextStyle(fontSize: 14, color: textColor, height: 1.5),
            ),

          // Info Card Embed
          if (message.type == ResponseType.card && message.card != null)
            InfoCardView(
              card: message.card!,
              theme: theme,
              onLaunchUrl: onLaunchUrl,
              strings: cardStrings,
              actionLabel: cardActionLabel,
              bannerTitle: cardBannerTitle,
            ),

          // Lead form (the CRM Form Builder's form-card)
          if (_hasForm)
            LeadFormView(
              key: ValueKey('lead_form_${message.id}'),
              form: message.form!,
              theme: theme,
              submitted: message.formSubmitted,
              strings: formStrings,
              onSubmit: (values) async =>
                  onSubmitForm == null ? null : onSubmitForm!(message, values),
            ),
        ],
      ),
    );

    final meta = Padding(
      padding: const EdgeInsets.only(top: 4, left: 2, right: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(timeStr, style: const TextStyle(fontSize: 10, color: _slate400)),
          if (isUser) ...[
            const SizedBox(width: 4),
            if (message.status == MessageStatus.sending)
              const SizedBox(
                width: 10,
                height: 10,
                child: CircularProgressIndicator(strokeWidth: 1.5, color: _slate400),
              )
            else if (message.status == MessageStatus.error)
              const Icon(Icons.error_outline_rounded,
                  size: 12, color: Color(0xFFF59E0B))
            else
              const Icon(Icons.done_rounded, size: 12, color: _slate400),
          ],
        ],
      ),
    );

    final avatarBg = isAgent
        ? _agentGreen.withOpacity(0.15)
        : (isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE2E8F0));

    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: CircleAvatar(
                radius: _avatarRadius,
                backgroundColor: avatarBg,
                child: Icon(
                  isAgent ? Icons.person_rounded : Icons.smart_toy_rounded,
                  size: 14,
                  color: isAgent ? _agentGreen : _slate500,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (showName)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 4),
                    child: Text(
                      senderName!,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xFFA1A1AA) : _slate500,
                      ),
                    ),
                  ),
                bubble,
                meta,
              ],
            ),
          ),
        ],
      ),
    );

    if (!showInlineOptions || isUser || message.options.isEmpty) return row;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        row,
        Padding(
          // 14 (row padding) + 24 (avatar) + 8 (gap): align chips with the bubble
          padding:
              const EdgeInsets.only(left: 46, right: 14, top: 0, bottom: 6),
          child: Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (var i = 0; i < message.options.length; i++)
                _buildChip(context, message.options[i], i),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChip(BuildContext context, QuickReplyOption opt, int index) {
    final isDark =
        theme.isDark || Theme.of(context).brightness == Brightness.dark;
    final isSelected =
        selectedOptionValue != null && selectedOptionValue == opt.value;
    final canTap = optionsEnabled && onOptionSelected != null;
    final chipBg = isSelected
        ? theme.primaryColor.withOpacity(isDark ? 0.28 : 0.12)
        : (theme.cardBackgroundColor ??
            (isDark ? const Color(0xFF222225) : Colors.white));

    return Opacity(
      // Used-up chips stay readable but clearly inactive; the chosen one stays prominent.
      opacity: (canTap || isSelected) ? 1 : 0.55,
      child: ConstrainedBox(
        // chips sit at left:46 / right:14 inside the list; never wider than that so long labels wrap
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width - 60),
        child: ActionChip(
          key: ValueKey('quick_reply_${message.id}_$index'),
          label: Text(opt.label, maxLines: 3, overflow: TextOverflow.ellipsis),
          avatar: isSelected
              ? Icon(Icons.check_rounded, size: 16, color: theme.primaryColor)
              : null,
          labelStyle: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: theme.primaryColor,
          ),
          backgroundColor: chipBg,
          disabledColor: chipBg,
          side: BorderSide(
            color: theme.primaryColor.withOpacity(isDark ? 0.5 : 0.35),
            width: isSelected ? 1.6 : 1.2,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          materialTapTargetSize: MaterialTapTargetSize.padded,
          onPressed: canTap ? () => onOptionSelected!(opt) : null,
        ),
      ),
    );
  }
}
