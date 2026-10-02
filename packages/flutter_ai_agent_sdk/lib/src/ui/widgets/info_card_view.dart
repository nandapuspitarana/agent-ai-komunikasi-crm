import 'package:flutter/material.dart';
import '../../models/card_payload.dart';
import '../theme/ai_chat_theme.dart';

/// User-facing strings of [InfoCardView]; override them to localise or customize per tenant.
class InfoCardStrings {
  final String actionLabel;
  final String bannerTitle;

  const InfoCardStrings({
    this.actionLabel = 'View Location Details',
    this.bannerTitle = 'Featured Information',
  });
}

class InfoCardView extends StatelessWidget {
  final CardPayload card;
  final AiChatTheme theme;
  final ValueChanged<String>? onLaunchUrl;
  final InfoCardStrings strings;
  final String? actionLabel;
  final String? bannerTitle;

  const InfoCardView({
    super.key,
    required this.card,
    required this.theme,
    this.onLaunchUrl,
    this.strings = const InfoCardStrings(),
    this.actionLabel,
    this.bannerTitle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = theme.isDark || Theme.of(context).brightness == Brightness.dark;
    final cardBg = theme.cardBackgroundColor ?? (isDark ? const Color(0xFF1E1E20) : Colors.white);
    final titleColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final descColor = isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
    final bannerBg = isDark ? const Color(0xFF2B2317) : Colors.amber.shade50;
    final bannerTextColor = isDark ? Colors.amber.shade300 : Colors.amber.shade900;
    final bannerIconColor = isDark ? Colors.amber.shade400 : Colors.amber.shade800;

    final effectiveBanner = (card.bannerTitle != null && card.bannerTitle!.isNotEmpty)
        ? card.bannerTitle!
        : (bannerTitle != null && bannerTitle!.isNotEmpty)
            ? bannerTitle!
            : strings.bannerTitle;

    final effectiveAction = (card.actionLabel != null && card.actionLabel!.isNotEmpty)
        ? card.actionLabel!
        : (actionLabel != null && actionLabel!.isNotEmpty)
            ? actionLabel!
            : strings.actionLabel;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.cardBorderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.25 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header Icon Banner
            Container(
              height: 48,
              width: double.infinity,
              color: bannerBg,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Icon(Icons.apartment_rounded, color: bannerIconColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    effectiveBanner,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: bannerTextColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            // Card Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    card.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: descColor,
                      height: 1.4,
                    ),
                  ),
                  if (card.linkUrl != null) ...[
                    const SizedBox(height: 10),
                    InkWell(
                      onTap: () => onLaunchUrl?.call(card.linkUrl!),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              effectiveAction,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: theme.primaryColor,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.arrow_forward_rounded, size: 14, color: theme.primaryColor),
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (card.ctaNote != null && card.ctaNote!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        card.ctaNote!,
                        style: const TextStyle(fontSize: 10.5, fontStyle: FontStyle.italic, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
