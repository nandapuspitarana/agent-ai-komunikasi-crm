import 'package:flutter/material.dart';
import '../controller/ai_chat_controller.dart';
import '../models/quick_reply_option.dart';
import 'theme/ai_chat_theme.dart';
import 'widgets/chat_bubble.dart';
import 'widgets/handoff_banner.dart';
import 'widgets/quick_reply_bar.dart';

class AiChatView extends StatefulWidget {
  final AiChatController controller;
  final AiChatTheme theme;
  final String? title;
  final VoidCallback? onClose;
  final ValueChanged<String>? onLaunchUrl;
  final bool showAppBar;

  const AiChatView({
    super.key,
    required this.controller,
    this.theme = const AiChatTheme(),
    this.title,
    this.onClose,
    this.onLaunchUrl,
    this.showAppBar = true,
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
    if (!widget.controller.isInitialized) {
      widget.controller.initialize();
    }
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
                ],
              ),
            ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(vertical: 12),
              itemCount: controller.messages.length + (controller.isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                // Typing indicator bubble at the end
                if (index == controller.messages.length && controller.isTyping) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: theme.primaryColor.withOpacity(0.12),
                          child: Icon(Icons.smart_toy_rounded, size: 16, color: theme.primaryColor),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: theme.botBubbleColor,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Assistant is typing...',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final msg = controller.messages[index];
                return RepaintBoundary(
                  child: ChatBubble(
                    message: msg,
                    theme: theme,
                    onLaunchUrl: widget.onLaunchUrl,
                  ),
                );
              },
            ),
          ),

          // Quick reply chips
          if (activeOptions.isNotEmpty && !controller.isTyping)
            QuickReplyBar(
              options: activeOptions,
              theme: theme,
              onOptionSelected: (opt) => controller.selectOption(opt),
            ),

          // Input Bar (Mobile responsive with dark mode support)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: inputBg,
              border: Border(top: BorderSide(color: inputBorderColor, width: 0.8)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: inputFill,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isDark ? theme.cardBorderColor : Colors.transparent,
                          width: 0.8,
                        ),
                      ),
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
                          hintText: 'Ketik pesan Anda di sini...',
                          hintStyle: TextStyle(
                            fontSize: 13,
                            color: inputHintColor,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: InkWell(
                      onTap: _handleSend,
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: theme.primaryColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: theme.primaryColor.withOpacity(0.35),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                  ),
                ],
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
                  widget.title ?? controller.tenantName ?? controller.config.botName,
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
                          : (controller.tenantName != null ? 'Online  ${controller.config.botName}' : 'Online 24/7 Support'),
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

