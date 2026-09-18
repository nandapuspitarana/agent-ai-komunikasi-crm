import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/chat_message.dart';
import '../../models/response_type.dart';
import '../theme/ai_chat_theme.dart';
import 'info_card_view.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final AiChatTheme theme;
  final ValueChanged<String>? onLaunchUrl;

  const ChatBubble({
    super.key,
    required this.message,
    required this.theme,
    this.onLaunchUrl,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.sender.isUser;
    final timeStr = DateFormat('HH:mm').format(message.timestamp);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: message.sender.isAgent
                  ? const Color(0xFF3B82F6).withOpacity(0.15)
                  : theme.primaryColor.withOpacity(0.12),
              child: Icon(
                message.sender.isAgent ? Icons.support_agent_rounded : Icons.smart_toy_rounded,
                size: 16,
                color: message.sender.isAgent ? const Color(0xFF3B82F6) : theme.primaryColor,
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
                crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  // Sender name tag when a human agent takes over
                  if (!isUser && message.sender.isAgent && message.senderName != null && message.senderName!.isNotEmpty)
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
                    InfoCardView(card: message.card!, theme: theme, onLaunchUrl: onLaunchUrl),

                  // Timestamp & Status icon
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontSize: 10,
                          color: (isUser ? Colors.white70 : const Color(0xFF94A3B8)),
                        ),
                      ),
                      if (isUser) ...[
                        const SizedBox(width: 4),
                        if (message.status == MessageStatus.sending)
                          const SizedBox(
                            width: 10,
                            height: 10,
                            child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white70),
                          )
                        else if (message.status == MessageStatus.error)
                          const Icon(Icons.error_outline_rounded, size: 12, color: Colors.amberAccent)
                        else
                          const Icon(Icons.done_rounded, size: 12, color: Colors.white70),
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
  }
}
