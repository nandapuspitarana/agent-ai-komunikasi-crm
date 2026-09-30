import 'package:flutter/material.dart';
import '../controller/ai_chat_controller.dart';
import '../models/quick_reply_option.dart';
import 'quick_reply_style.dart';
import 'theme/ai_chat_theme.dart';
import 'widgets/chat_bubble.dart';
import 'widgets/handoff_banner.dart';
import 'widgets/lead_form_view.dart';
import 'widgets/quick_reply_bar.dart';

class AiChatView extends StatefulWidget {
  final AiChatController controller;
  final AiChatTheme theme;
  final String? title;
  final VoidCallback? onClose;
  final ValueChanged<String>? onLaunchUrl;
  final bool showAppBar;
  final String? inputHintText;

  /// Where quick-reply options render. Defaults to chips under the bubble.
  final QuickReplyStyle quickReplyStyle;

  /// Labels of the lead form rendered for `responseType: form` replies.
  final LeadFormStrings formStrings;

  /// Show the sender's name above bot/agent bubbles (as the web widget does).
  final bool showSenderName;

  /// Small caption above the first message (web: "Conversation started").
  final String? conversationStartedLabel;

  /// When set, a "talk to a human" button is shown above the input while the
  /// bot is answering (web: `talkToAgentBtn`). Tapping it sends
  /// [talkToAgentMessage].
  final String? talkToAgentLabel;
  final String talkToAgentMessage;

  const AiChatView({
    super.key,
    required this.controller,
    this.theme = const AiChatTheme(),
    this.title,
    this.onClose,
    this.onLaunchUrl,
    this.showAppBar = true,
    this.inputHintText,
    this.quickReplyStyle = QuickReplyStyle.inline,
    this.formStrings = const LeadFormStrings(),
    this.showSenderName = true,
    this.conversationStartedLabel,
    this.talkToAgentLabel,
    this.talkToAgentMessage = 'Saya ingin bicara dengan agen manusia',
  });

  @override
  State<AiChatView> createState() => _AiChatViewState();
}

class _AiChatViewState extends State<AiChatView> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    // Idempotent: fetches config on first open, refreshes a restored session's
    // greeting, retries after an offline fallback, and is a no-op otherwise.
    widget.controller.initialize();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) {
      setState(() {});
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSend() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    _inputController.clear();
    widget.controller.sendMessage(text);
  }

  Widget _buildTypingIndicator(AiChatTheme theme, bool isDark) {
    return Semantics(
      label: 'Assistant is typing',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: CircleAvatar(
                radius: 12,
                backgroundColor: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE2E8F0),
                child: const Icon(Icons.smart_toy_rounded, size: 14, color: Color(0xFF64748B)),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: theme.botBubbleColor,
                border: Border.all(color: theme.resolvedBotBubbleBorderColor),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(theme.bubbleRadius),
                  topRight: Radius.circular(theme.bubbleRadius),
                  bottomLeft: const Radius.circular(4),
                  bottomRight: Radius.circular(theme.bubbleRadius),
                ),
              ),
              child: const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF94A3B8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final theme = widget.theme;

    // Detect dark mode from theme or ambient context
    final isDark = theme.isDark || Theme.of(context).brightness == Brightness.dark;

    final inputBg = theme.inputBackgroundColor ?? (isDark ? const Color(0xFF18181A) : Colors.white);
    final inputFill = theme.inputFillColor ?? (isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9));
    final inputTextColor = theme.inputTextColor ?? (isDark ? const Color(0xFFF2F2F2) : const Color(0xFF0F172A));
    final inputHintColor = theme.inputHintColor ?? (isDark ? const Color(0xFF8E8E93) : const Color(0xFF94A3B8));
    final inputBorderColor = isDark ? theme.cardBorderColor : Colors.grey.shade200;

    // Extract quick reply options from the last bot message
    final lastBotMessage = controller.messages.isNotEmpty && controller.messages.last.sender.isBot
        ? controller.messages.last
        : null;
    final activeOptions = lastBotMessage?.options ?? const <QuickReplyOption>[];
    final useBar = widget.quickReplyStyle == QuickReplyStyle.bar;
    final captionRows = widget.conversationStartedLabel != null ? 1 : 0;

    final bodyContent = Column(
        children: [
          // Human handoff banner if active
          if (controller.isHandoff) HandoffBanner(isDark: isDark),

          // Error notification banner if any
          if (controller.errorMessage != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: isDark ? const Color(0xFF332008) : Colors.amber.shade50,
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 16,
                    color: isDark ? Colors.amber.shade300 : Colors.amber.shade900,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      controller.errorMessage!,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.amber.shade200 : Colors.amber.shade900,
                      ),
                    ),
                  ),
                  if (controller.needsRetry)
                    TextButton(
                      onPressed: () => controller.initialize(),
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        minimumSize: const Size(48, 32),
                      ),
                      child: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                ],
              ),
            ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.symmetric(vertical: 12),
              itemCount: captionRows + controller.messages.length + (controller.isTyping ? 1 : 0),
              itemBuilder: (context, rawIndex) {
                if (captionRows == 1 && rawIndex == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4, bottom: 12),
                    child: Center(
                      child: Text(
                        widget.conversationStartedLabel!,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                    ),
                  );
                }
                final index = rawIndex - captionRows;

                // Typing indicator bubble at the end
                if (index == controller.messages.length && controller.isTyping) {
                  return _buildTypingIndicator(theme, isDark);
                }

                final msg = controller.messages[index];
                final isLatest = index == controller.messages.length - 1;

                // Which option (if any) the user picked from this message
                String? selectedValue;
                if (msg.options.isNotEmpty && index + 1 < controller.messages.length) {
                  final next = controller.messages[index + 1];
                  if (next.sender.isUser) {
                    for (final o in msg.options) {
                      if (o.value == next.text || o.label == next.text) {
                        selectedValue = o.value;
                        break;
                      }
                    }
                  }
                }

                return RepaintBoundary(
                  child: ChatBubble(
                    message: msg,
                    theme: theme,
                    onLaunchUrl: widget.onLaunchUrl,
                    formStrings: widget.formStrings,
                    showSenderName: widget.showSenderName,
                    onSubmitForm: (m, values) => controller.submitForm(m.id, values),
                    showInlineOptions: !useBar,
                    optionsEnabled: isLatest && !controller.isTyping && msg.sender.isBot,
                    selectedOptionValue: selectedValue,
                    onOptionSelected: (opt) => controller.selectOption(opt),
                  ),
                );
              },
            ),
          ),

          // Quick reply chips (legacy bar style)
          if (useBar && activeOptions.isNotEmpty && !controller.isTyping)
            QuickReplyBar(
              options: activeOptions,
              theme: theme,
              onOptionSelected: (opt) => controller.selectOption(opt),
            ),

          // "Talk to a human": only while the bot is answering, like the web widget
          if (widget.talkToAgentLabel != null && !controller.isHandoff)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  key: const ValueKey('talk_to_agent'),
                  onPressed: controller.isTyping
                      ? null
                      : () => controller.sendMessage(widget.talkToAgentMessage),
                  icon: const Icon(Icons.phone_in_talk_outlined, size: 14),
                  label: Text(widget.talkToAgentLabel!),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                    backgroundColor: isDark ? const Color(0xFF1E1E20) : Colors.white,
                    side: BorderSide(color: isDark ? theme.cardBorderColor : const Color(0xFFE2E8F0)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    textStyle: const TextStyle(fontSize: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ),

          // Input bar: one pill with the send button inside it (as on the web)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: inputBg,
              border: Border(top: BorderSide(color: inputBorderColor, width: 0.8)),
            ),
            child: SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.only(left: 18, right: 5),
                decoration: BoxDecoration(
                  color: inputFill,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: isDark ? theme.cardBorderColor : Colors.transparent,
                    width: 0.8,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        textInputAction: TextInputAction.send,
                        keyboardType: TextInputType.multiline,
                        minLines: 1,
                        maxLines: 4,
                        style: TextStyle(
                          fontSize: 14,
                          color: inputTextColor,
                          height: 1.3,
                        ),
                        cursorColor: theme.primaryColor,
                        onSubmitted: (_) => _handleSend(),
                        decoration: InputDecoration(
                          hintText: widget.inputHintText ?? 'Type your message here...',
                          hintStyle: TextStyle(
                            fontSize: 13,
                            color: inputHintColor,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    ValueListenableBuilder<TextEditingValue>(
                      valueListenable: _inputController,
                      builder: (context, value, _) {
                        final canSend = value.text.trim().isNotEmpty;
                        return Opacity(
                          opacity: canSend ? 1 : 0.5,
                          child: InkWell(
                            onTap: _handleSend,
                            borderRadius: BorderRadius.circular(24),
                            child: Container(
                              padding: const EdgeInsets.all(9),
                              decoration: BoxDecoration(
                                color: theme.primaryColor,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: theme.primaryColor.withOpacity(0.3),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.send_rounded, color: Colors.white, size: 16),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );

    if (!widget.showAppBar) {
      return Container(
        color: theme.backgroundColor,
        child: bodyContent,
      );
    }

    return Scaffold(
      backgroundColor: theme.backgroundColor,
      appBar: AppBar(
        elevation: 0.5,
        backgroundColor: theme.resolvedAppBarBackgroundColor,
        titleSpacing: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: theme.resolvedAppBarTextColor,
          ),
          onPressed: () {
            if (widget.onClose != null) {
              widget.onClose!();
            } else {
              Navigator.of(context).maybePop();
            }
          },
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: controller.isHandoff ? const Color(0xFF2563EB) : theme.primaryColor,
              child: Icon(
                controller.isHandoff ? Icons.support_agent_rounded : Icons.smart_toy_rounded,
                size: 18,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.title ?? controller.tenantName ?? controller.botName,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: theme.resolvedAppBarTextColor,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: controller.isHandoff ? const Color(0xFF3B82F6) : const Color(0xFF22C55E),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      controller.isHandoff
                          ? 'Online  ${controller.currentAgentName ?? "Human Agent"}'
                          : (controller.tenantName != null ? 'Online  ${controller.botName}' : 'Online 24/7 Support'),
                      style: TextStyle(
                        fontSize: 10.5,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.refresh_rounded,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              size: 20,
            ),
            tooltip: 'Restart Conversation',
            onPressed: () => controller.restartChat(),
          ),
        ],
      ),
      body: bodyContent,
    );
  }
}
