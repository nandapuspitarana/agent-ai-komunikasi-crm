import 'package:flutter/material.dart';
import '../theme/ai_chat_theme.dart';

/// Localized and customizable strings for [ContactFunnelModal].
class ContactFunnelStrings {
  final String title;
  final String categoryLabel;
  final String descriptionLabel;
  final String descriptionPlaceholder;
  final String cancel;
  final String submit;
  final String submitting;
  final String required;
  final String failedSubmit;
  final String genericError;
  final List<String> categories;

  const ContactFunnelStrings({
    this.title = 'Contact Company / Report Issue',
    this.categoryLabel = 'Issue Category',
    this.descriptionLabel = 'Issue Description',
    this.descriptionPlaceholder =
        'Briefly describe your issue or inquiry...',
    this.cancel = 'Cancel',
    this.submit = 'Submit Report',
    this.submitting = 'Submitting...',
    this.required = 'This field is required',
    this.failedSubmit = 'Failed to submit report. Please try again.',
    this.genericError = 'An error occurred: ',
    this.categories = const [
      'General Inquiry',
      'Services & Facilities',
      'Technical Issue',
      'Billing & Payment',
      'Partnership',
      'Other',
    ],
  });

  const ContactFunnelStrings.en({
    this.title = 'Contact Company / Report Issue',
    this.categoryLabel = 'Issue Category',
    this.descriptionLabel = 'Issue Description',
    this.descriptionPlaceholder =
        'Briefly describe your issue or inquiry...',
    this.cancel = 'Cancel',
    this.submit = 'Submit Report',
    this.submitting = 'Submitting...',
    this.required = 'This field is required',
    this.failedSubmit = 'Failed to submit report. Please try again.',
    this.genericError = 'An error occurred: ',
    this.categories = const [
      'General Inquiry',
      'Services & Facilities',
      'Technical Issue',
      'Billing & Payment',
      'Partnership',
      'Other',
    ],
  });

  const ContactFunnelStrings.id({
    this.title = 'Hubungi Perusahaan / Laporan',
    this.categoryLabel = 'Kategori Masalah',
    this.descriptionLabel = 'Deskripsi Masalah',
    this.descriptionPlaceholder =
        'Jelaskan kendala atau kebutuhan Anda secara singkat...',
    this.cancel = 'Batal',
    this.submit = 'Kirim Laporan',
    this.submitting = 'Mengirim...',
    this.required = 'Bidang ini wajib diisi',
    this.failedSubmit = 'Gagal mengirim laporan. Silakan coba lagi.',
    this.genericError = 'Terjadi kesalahan: ',
    this.categories = const [
      'Pertanyaan Umum',
      'Layanan & Fasilitas',
      'Kendala Teknis',
      'Billing & Pembayaran',
      'Kemitraan',
      'Lainnya',
    ],
  });

  /// Factory resolving strings based on locale code ('en', 'id', etc.)
  factory ContactFunnelStrings.fromLocale(String? locale) {
    if (locale != null && locale.toLowerCase().startsWith('id')) {
      return const ContactFunnelStrings.id();
    }
    return const ContactFunnelStrings.en();
  }

  /// Factory merging tenant contactForm config with base locale strings.
  factory ContactFunnelStrings.fromConfig({
    Map<String, dynamic>? contactFormConfig,
    String? language,
  }) {
    final base = ContactFunnelStrings.fromLocale(language);
    final formTitle = contactFormConfig?['formTitle']?.toString();
    final buttonLabel = contactFormConfig?['buttonLabel']?.toString();
    final rawCats = contactFormConfig?['categories'];
    List<String>? parsedCats;
    if (rawCats is List && rawCats.isNotEmpty) {
      parsedCats = rawCats.map((c) => c.toString()).toList();
    }

    return ContactFunnelStrings(
      title: (formTitle != null && formTitle.trim().isNotEmpty) ? formTitle : base.title,
      categoryLabel: base.categoryLabel,
      descriptionLabel: base.descriptionLabel,
      descriptionPlaceholder: base.descriptionPlaceholder,
      cancel: base.cancel,
      submit: (buttonLabel != null &&
              buttonLabel.trim().isNotEmpty &&
              buttonLabel != 'Send Email to Company' &&
              buttonLabel != 'Kirim Email ke Perusahaan')
          ? buttonLabel
          : base.submit,
      submitting: base.submitting,
      required: base.required,
      failedSubmit: base.failedSubmit,
      genericError: base.genericError,
      categories: parsedCats ?? base.categories,
    );
  }
}

/// Native Modal Bottom Sheet for collecting support/contact funnel inquiries in-app.
class ContactFunnelModal extends StatefulWidget {
  final AiChatTheme theme;
  final ContactFunnelStrings strings;
  final String? userName;
  final String? userEmail;
  final String? userCompany;
  final Future<bool> Function(String category, String description) onSubmit;

  const ContactFunnelModal({
    super.key,
    required this.theme,
    required this.onSubmit,
    this.strings = const ContactFunnelStrings(),
    this.userName,
    this.userEmail,
    this.userCompany,
  });

  static Future<bool?> show(
    BuildContext context, {
    required AiChatTheme theme,
    required Future<bool> Function(String category, String description) onSubmit,
    ContactFunnelStrings strings = const ContactFunnelStrings(),
    String? userName,
    String? userEmail,
    String? userCompany,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ContactFunnelModal(
        theme: theme,
        strings: strings,
        userName: userName,
        userEmail: userEmail,
        userCompany: userCompany,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  State<ContactFunnelModal> createState() => _ContactFunnelModalState();
}

class _ContactFunnelModalState extends State<ContactFunnelModal> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  late String _selectedCategory;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.strings.categories.isNotEmpty
        ? widget.strings.categories.first
        : 'General Inquiry';
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  bool get _isDark =>
      widget.theme.isDark || Theme.of(context).brightness == Brightness.dark;

  Color get _bg => _isDark ? const Color(0xFF1C1C1E) : Colors.white;
  Color get _borderColor =>
      _isDark ? widget.theme.cardBorderColor : const Color(0xFFE2E8F0);
  Color get _inputBg =>
      _isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF8FAFC);
  Color get _textPrimary =>
      _isDark ? const Color(0xFFF2F2F2) : const Color(0xFF1E293B);
  Color get _textSecondary =>
      _isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final success = await widget.onSubmit(
        _selectedCategory,
        _descriptionCtrl.text.trim(),
      );

      if (mounted) {
        if (success) {
          Navigator.of(context).pop(true);
        } else {
          setState(() {
            _isSubmitting = false;
            _errorMessage = widget.strings.failedSubmit;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = '${widget.strings.genericError}$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final primaryColor = widget.theme.primaryColor;

    final hasProfile = (widget.userName != null && widget.userName!.isNotEmpty) ||
        (widget.userEmail != null && widget.userEmail!.isNotEmpty) ||
        (widget.userCompany != null && widget.userCompany!.isNotEmpty);

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: _borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top drag handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: _isDark
                          ? const Color(0xFF3A3A3C)
                          : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header Row
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.mark_email_read_outlined,
                        size: 20,
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.strings.title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: _textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded, color: _textSecondary, size: 20),
                      onPressed: () => Navigator.of(context).pop(false),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Sender Info Banner (Profile preview)
                if (hasProfile) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _inputBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _borderColor),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.person_outline_rounded,
                          size: 18,
                          color: primaryColor,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      (widget.userName?.isNotEmpty == true
                                              ? widget.userName!
                                              : widget.userEmail) ??
                                          '',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: _textPrimary,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (widget.userCompany != null &&
                                      widget.userCompany!.isNotEmpty) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: primaryColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        widget.userCompany!,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: primaryColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              if (widget.userName != null &&
                                  widget.userEmail != null &&
                                  widget.userEmail!.isNotEmpty)
                                Text(
                                  widget.userEmail!,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: _textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Category Field
                Text(
                  widget.strings.categoryLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: _inputBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _borderColor),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedCategory,
                      isExpanded: true,
                      dropdownColor: _bg,
                      icon: Icon(Icons.keyboard_arrow_down_rounded,
                          color: _textSecondary),
                      style: TextStyle(
                        fontSize: 13,
                        color: _textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                      items: widget.strings.categories.map((cat) {
                        return DropdownMenuItem<String>(
                          value: cat,
                          child: Text(cat),
                        );
                      }).toList(),
                      onChanged: _isSubmitting
                          ? null
                          : (val) {
                              if (val != null) {
                                setState(() => _selectedCategory = val);
                              }
                            },
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Description Field
                Text(
                  widget.strings.descriptionLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _descriptionCtrl,
                  maxLines: 4,
                  minLines: 3,
                  enabled: !_isSubmitting,
                  style: TextStyle(fontSize: 13, color: _textPrimary),
                  decoration: InputDecoration(
                    hintText: widget.strings.descriptionPlaceholder,
                    hintStyle: TextStyle(fontSize: 12, color: _textSecondary),
                    filled: true,
                    fillColor: _inputBg,
                    contentPadding: const EdgeInsets.all(12),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: _borderColor),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: primaryColor, width: 1.5),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.redAccent),
                    ),
                    focusedErrorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return widget.strings.required;
                    }
                    return null;
                  },
                ),

                // Error Message if any
                if (_errorMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Colors.redAccent,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isSubmitting
                            ? null
                            : () => Navigator.of(context).pop(false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _textSecondary,
                          side: BorderSide(color: _borderColor),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          widget.strings.cancel,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isSubmitting
                            ? Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor:
                                          AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    widget.strings.submitting,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                widget.strings.submit,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
