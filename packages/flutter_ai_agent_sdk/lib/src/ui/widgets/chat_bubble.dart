import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/chat_message.dart';
import '../../models/quick_reply_option.dart';
import '../../models/response_type.dart';
import '../theme/ai_chat_theme.dart';
import 'info_card_view.dart';

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

  const ChatBubble({
    super.key,
    required this.message,
    required this.theme,
    this.onLaunchUrl,
    this.showInlineOptions = false,
    this.optionsEnabled = false,
    this.selectedOptionValue,
    this.onOptionSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.sender.isUser;
    final timeStr = DateFormat('HH:mm').format(message.timestamp);

    final bubble = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: message.sender.isAgent
                  ? const Color(0xFF3B82F6).withOpacity(0.15)
                  : theme.primaryColor.withOpacity(0.12),
              child: Icon(
                message.sender.isAgent
                    ? Icons.support_agent_rounded
                    : Icons.smart_toy_rounded,
                size: 16,
                color: message.sender.isAgent
                    ? const Color(0xFF3B82F6)
                    : theme.primaryColor,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.76,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? theme.userBubbleColor : theme.botBubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(theme.bubbleRadius),
                  topRight: Radius.circular(theme.bubbleRadius),
                  bottomLeft: Radius.circular(isUser ? theme.bubbleRadius : 4),
                  bottomRight: Radius.circular(isUser ? 4 : theme.bubbleRadius),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment:
                    isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  // Sender name tag when a human agent takes over
                  if (!isUser &&
                      message.sender.isAgent &&
                      message.senderName != null &&
                      message.senderName!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        message.senderName!,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                    ),

                  // Text Content
                  SelectableText(
                    message.text,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: isUser ? theme.userTextColor : theme.botTextColor,
                      height: 1.38,
                    ),
                  ),

                  // Info Card Embed
                  if (message.type == ResponseType.card && message.card != null)
                    InfoCardView(
                        card: message.card!,
                        theme: theme,
                        onLaunchUrl: onLaunchUrl),

                  // Timestamp & Status icon
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontSize: 10,
                          color: (isUser
                              ? Colors.white70
                              : const Color(0xFF94A3B8)),
                        ),
                      ),
                      if (isUser) ...[
                        const SizedBox(width: 4),
                        if (message.status == MessageStatus.sending)
                          const SizedBox(
                            width: 10,
                            height: 10,
                            child: CircularProgressIndicator(
                                strokeWidth: 1.5, color: Colors.white70),
                          )
                        else if (message.status == MessageStatus.error)
                          const Icon(Icons.error_outline_rounded,
                              size: 12, color: Colors.amberAccent)
                        else
                          const Icon(Icons.done_rounded,
                              size: 12, color: Colors.white70),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    if (!showInlineOptions || isUser || message.options.isEmpty) return bubble;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        bubble,
        Padding(
          // 14 (row padding) + 28 (avatar) + 8 (gap): align chips with the bubble
          padding:
              const EdgeInsets.only(left: 50, right: 14, top: 2, bottom: 6),
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
        // chips sit at left:50 / right:14 inside the list; never wider than that so long labels wrap
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width - 64),
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
          tooltip: opt.label,
          onPressed: canTap ? () => onOptionSelected!(opt) : null,
        ),
      ),
    );
  }
}
