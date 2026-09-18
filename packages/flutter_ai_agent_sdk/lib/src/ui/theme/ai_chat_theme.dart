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

  /// Additional theme attributes for dark mode & input styling
  final Color? cardBackgroundColor;
  final Color? inputBackgroundColor;
  final Color? inputFillColor;
  final Color? inputTextColor;
  final Color? inputHintColor;
  final Color? appBarBackgroundColor;
  final Color? appBarTextColor;

  const AiChatTheme({
    this.primaryColor = const Color(0xFF801517), // CEO Suite Executive Red
    this.userBubbleColor = const Color(0xFF801517),
    this.userTextColor = Colors.white,
    this.botBubbleColor = const Color(0xFFF1F5F9), // Slate 100
    this.botTextColor = const Color(0xFF1E293B),   // Slate 800
    this.backgroundColor = const Color(0xFFF8FAFC), // Slate 50
    this.cardBorderColor = const Color(0xFFE2E8F0), // Slate 200
    this.bubbleRadius = 16.0,
    this.cardBackgroundColor,
    this.inputBackgroundColor,
    this.inputFillColor,
    this.inputTextColor,
    this.inputHintColor,
    this.appBarBackgroundColor,
    this.appBarTextColor,
  });

  /// Evaluates whether the theme is dark based on backgroundColor luminance
  bool get isDark =>
      ThemeData.estimateBrightnessForColor(backgroundColor) == Brightness.dark;

  Color get resolvedCardBackgroundColor =>
      cardBackgroundColor ?? (isDark ? const Color(0xFF1E1E20) : Colors.white);

  Color get resolvedInputBackgroundColor =>
      inputBackgroundColor ?? (isDark ? const Color(0xFF18181A) : Colors.white);

  Color get resolvedInputFillColor =>
      inputFillColor ?? (isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9));

  Color get resolvedInputTextColor =>
      inputTextColor ?? (isDark ? const Color(0xFFF2F2F2) : const Color(0xFF0F172A));

  Color get resolvedInputHintColor =>
      inputHintColor ?? (isDark ? const Color(0xFF8E8E93) : const Color(0xFF94A3B8));

  Color get resolvedAppBarBackgroundColor =>
      appBarBackgroundColor ?? (isDark ? const Color(0xFF1C1C1E) : Colors.white);

  Color get resolvedAppBarTextColor =>
      appBarTextColor ?? (isDark ? Colors.white : const Color(0xFF0F172A));

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
        cardBackgroundColor: Color(0xFF1E1E20),
        inputBackgroundColor: Color(0xFF18181A),
        inputFillColor: Color(0xFF27272A),
        inputTextColor: Color(0xFFF2F2F2),
        inputHintColor: Color(0xFF8E8E93),
        appBarBackgroundColor: Color(0xFF1C1C1E),
        appBarTextColor: Colors.white,
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
      cardBackgroundColor: Colors.white,
      inputBackgroundColor: Colors.white,
      inputFillColor: Color(0xFFF1F5F9),
      inputTextColor: Color(0xFF0F172A),
      inputHintColor: Color(0xFF94A3B8),
      appBarBackgroundColor: Colors.white,
      appBarTextColor: Color(0xFF0F172A),
    );
  }
}
