import 'package:flutter/material.dart';

class HandoffBanner extends StatelessWidget {
  final VoidCallback? onDismiss;

  const HandoffBanner({super.key, this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2), // Rose 50
        border: Border(
          bottom: BorderSide(color: Colors.red.shade200, width: 1),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.red.shade100,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.support_agent_rounded, size: 16, color: Color(0xFFB91C1C)),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Percakapan telah dialihkan ke Tim Layanan Pelanggan (Human Agent). Mohon tunggu balasan.',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: Color(0xFF991B1B),
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
