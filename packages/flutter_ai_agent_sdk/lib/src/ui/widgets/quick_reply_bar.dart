import 'package:flutter/material.dart';
import '../../models/quick_reply_option.dart';
import '../theme/ai_chat_theme.dart';

class QuickReplyBar extends StatelessWidget {
  final List<QuickReplyOption> options;
  final ValueChanged<QuickReplyOption> onOptionSelected;
  final AiChatTheme theme;

  const QuickReplyBar({
    super.key,
    required this.options,
    required this.onOptionSelected,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) return const SizedBox.shrink();

    final isDark = theme.isDark || Theme.of(context).brightness == Brightness.dark;
    final chipBg = theme.cardBackgroundColor ?? (isDark ? const Color(0xFF222225) : Colors.white);

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final opt = options[index];
          return ActionChip(
            label: Text(opt.label),
            labelStyle: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: theme.primaryColor,
            ),
            backgroundColor: chipBg,
            side: BorderSide(
              color: theme.primaryColor.withOpacity(isDark ? 0.5 : 0.35),
              width: 1.2,
            ),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 1,
            shadowColor: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            onPressed: () => onOptionSelected(opt),
          );
        },
      ),
    );
  }
}
