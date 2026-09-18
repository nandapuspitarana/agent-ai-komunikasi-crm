import 'package:flutter/material.dart';

class HandoffBanner extends StatelessWidget {
  final VoidCallback? onDismiss;
  final bool? isDark;

  const HandoffBanner({super.key, this.onDismiss, this.isDark});

  @override
  Widget build(BuildContext context) {
    final effectiveDark = isDark ?? (Theme.of(context).brightness == Brightness.dark);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: effectiveDark ? const Color(0xFF2D1418) : const Color(0xFFFEF2F2), // Rose 50 / Dark rose
        border: Border(
          bottom: BorderSide(
            color: effectiveDark ? const Color(0xFF5C1D24) : Colors.red.shade200,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: effectiveDark ? const Color(0xFF4C1D24) : Colors.red.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.support_agent_rounded,
              size: 16,
              color: effectiveDark ? const Color(0xFFF87171) : const Color(0xFFB91C1C),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Percakapan telah dialihkan ke Tim Layanan Pelanggan (Human Agent). Mohon tunggu balasan.',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: effectiveDark ? const Color(0xFFFCA5A5) : const Color(0xFF991B1B),
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
