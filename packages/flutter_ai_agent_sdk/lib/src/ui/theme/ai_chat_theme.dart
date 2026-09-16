import 'package:flutter/material.dart';

/// Styling and Theme configuration for CEO Suite AI Agent Chat.
class AiChatTheme {
  final Color primaryColor;
  final Color userBubbleColor;
  final Color userTextColor;
  final Color botBubbleColor;
  final Color botTextColor;
  final Color backgroundColor;
  final Color cardBorderColor;
  final double bubbleRadius;

  const AiChatTheme({
    this.primaryColor = const Color(0xFF801517), // CEO Suite Executive Red
    this.userBubbleColor = const Color(0xFF801517),
    this.userTextColor = Colors.white,
    this.botBubbleColor = const Color(0xFFF1F5F9), // Slate 100
    this.botTextColor = const Color(0xFF1E293B),   // Slate 800
    this.backgroundColor = const Color(0xFFF8FAFC), // Slate 50
    this.cardBorderColor = const Color(0xFFE2E8F0), // Slate 200
    this.bubbleRadius = 16.0,
  });

  /// Factory constructor for CEO Suite Executive branding.
  factory AiChatTheme.ceoSuiteExecutive({bool isDark = false}) {
    if (isDark) {
      return const AiChatTheme(
        primaryColor: Color(0xFFFF6B75),
        userBubbleColor: Color(0xFF801517),
        userTextColor: Colors.white,
        botBubbleColor: Color(0xFF28282A),
        botTextColor: Color(0xFFF2F2F2),
        backgroundColor: Color(0xFF111113),
        cardBorderColor: Color(0xFF2C2C2E),
      );
    }
    return const AiChatTheme(
      primaryColor: Color(0xFF801517),
      userBubbleColor: Color(0xFF801517),
      userTextColor: Colors.white,
      botBubbleColor: Color(0xFFF1F5F9),
      botTextColor: Color(0xFF1E293B),
      backgroundColor: Color(0xFFF7F4F0),
      cardBorderColor: Color(0xFFE7DED8),
    );
  }
}
