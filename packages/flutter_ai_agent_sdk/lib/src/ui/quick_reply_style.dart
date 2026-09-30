/// Where quick-reply options are rendered in [AiChatView].
enum QuickReplyStyle {
  /// Chips attached below the bot bubble that offered them (default).
  /// Only the latest bot message is tappable; older ones stay visible but
  /// disabled, with the chosen option highlighted.
  inline,

  /// Legacy: one horizontal chip strip above the input, for the last bot message only.
  bar,
}
