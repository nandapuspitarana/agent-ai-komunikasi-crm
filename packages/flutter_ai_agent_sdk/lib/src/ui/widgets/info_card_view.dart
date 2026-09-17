import 'package:flutter/material.dart';
import '../../models/card_payload.dart';
import '../theme/ai_chat_theme.dart';

class InfoCardView extends StatelessWidget {
  final CardPayload card;
  final AiChatTheme theme;
  final ValueChanged<String>? onLaunchUrl;

  const InfoCardView({
    super.key,
    required this.card,
    required this.theme,
    this.onLaunchUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.cardBorderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
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
              color: Colors.amber.shade50,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Icon(Icons.apartment_rounded, color: Colors.amber.shade800, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Featured Information',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.amber.shade900,
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
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    card.description,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF334155),
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
                              'Lihat Detail Lokasi',
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
