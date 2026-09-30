import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/form_payload.dart';
import '../theme/ai_chat_theme.dart';

/// User-facing strings of [LeadFormView]; override them to localise.
class LeadFormStrings {
  final String required;
  final String invalidEmail;
  final String invalidNumber;
  final String sending;
  final String submitted;

  const LeadFormStrings({
    this.required = 'This field is required',
    this.invalidEmail = 'Enter a valid email address',
    this.invalidNumber = 'Enter a valid number',
    this.sending = 'Sending...',
    this.submitted = 'Form submitted',
  });
}

/// Native version of the CRM Form Builder's `.form-card`: labelled inputs,
/// `required` / email / phone validation and a full-width submit button.
///
/// [onSubmit] receives the values keyed by field name and returns `null` on
/// success or an error message to show under the button. Once [submitted] the
/// card collapses to a confirmation row.
class LeadFormView extends StatefulWidget {
  final FormPayload form;
  final AiChatTheme theme;
  final bool submitted;
  final Future<String?> Function(Map<String, String> values) onSubmit;
  final LeadFormStrings strings;

  const LeadFormView({
    super.key,
    required this.form,
    required this.theme,
    required this.onSubmit,
    this.submitted = false,
    this.strings = const LeadFormStrings(),
  });

  @override
  State<LeadFormView> createState() => _LeadFormViewState();
}

class _LeadFormViewState extends State<LeadFormView> {
  static final RegExp _emailRe = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _text = {};
  final Map<String, String?> _selected = {};
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final f in widget.form.fields) {
      _text[f.name] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _isDark =>
      widget.theme.isDark || Theme.of(context).brightness == Brightness.dark;

  Color get _line => _isDark ? widget.theme.cardBorderColor : const Color(0xFFE5E7EB);
  Color get _labelColor => _isDark ? const Color(0xFFE2E8F0) : const Color(0xFF374151);
  Color get _inputTextColor => _isDark ? const Color(0xFFF2F2F2) : const Color(0xFF374151);
  Color get _hintColor => _isDark ? const Color(0xFF8E8E93) : const Color(0xFF9CA3AF);

  String? _validate(LeadFormField f, String? raw) {
    final v = (raw ?? '').trim();
    if (v.isEmpty) return f.required ? widget.strings.required : null;
    if (f.type == 'email' && !_emailRe.hasMatch(v)) return widget.strings.invalidEmail;
    if (f.type == 'number' && double.tryParse(v) == null) return widget.strings.invalidNumber;
    return null;
  }

  Future<void> _submit() async {
    if (_submitting) return;
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final values = <String, String>{
      for (final f in widget.form.fields)
        f.name: (f.type == 'select' ? _selected[f.name] : _text[f.name]?.text)?.trim() ?? '',
    };

    setState(() {
      _submitting = true;
      _error = null;
    });
    final error = await widget.onSubmit(values);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _error = error;
    });
  }

  Future<void> _pickDate(LeadFormField f) async {
    final now = DateTime.now();
    final initial = DateTime.tryParse(_text[f.name]!.text) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year + 20),
    );
    if (picked == null) return;
    // Same format a browser's <input type="date"> submits.
    final mm = picked.month.toString().padLeft(2, '0');
    final dd = picked.day.toString().padLeft(2, '0');
    _text[f.name]!.text = '${picked.year}-$mm-$dd';
  }

  InputDecoration _decoration(LeadFormField f, {Widget? suffix}) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: c, width: w),
        );
    return InputDecoration(
      hintText: f.placeholder.isEmpty ? null : f.placeholder,
      hintStyle: TextStyle(fontSize: 13, color: _hintColor),
      isDense: true,
      filled: true,
      fillColor: _isDark ? const Color(0xFF27272A) : Colors.white,
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.all(10),
      enabledBorder: border(_line),
      focusedBorder: border(widget.theme.primaryColor, 1.4),
      errorBorder: border(const Color(0xFFDC2626)),
      focusedErrorBorder: border(const Color(0xFFDC2626), 1.4),
      errorStyle: const TextStyle(fontSize: 11),
    );
  }

  Widget _field(LeadFormField f) {
    final style = TextStyle(fontSize: 13, color: _inputTextColor);
    final key = ValueKey('lead_form_field_${f.name}');

    switch (f.type) {
      case 'select':
        return DropdownButtonFormField<String>(
          key: key,
          isExpanded: true,
          style: style,
          dropdownColor: _isDark ? const Color(0xFF27272A) : Colors.white,
          decoration: _decoration(f),
          hint: Text(f.placeholder.isEmpty ? '' : f.placeholder,
              style: TextStyle(fontSize: 13, color: _hintColor)),
          items: [
            for (final o in f.options) DropdownMenuItem(value: o, child: Text(o)),
          ],
          onChanged: (v) => _selected[f.name] = v,
          validator: (v) => _validate(f, v),
        );
      case 'date':
        return TextFormField(
          key: key,
          controller: _text[f.name],
          readOnly: true,
          style: style,
          decoration: _decoration(f,
              suffix: Icon(Icons.calendar_today_rounded, size: 16, color: _hintColor)),
          onTap: () => _pickDate(f),
          validator: (v) => _validate(f, v),
        );
      default:
        final isArea = f.type == 'textarea';
        return TextFormField(
          key: key,
          controller: _text[f.name],
          style: style,
          cursorColor: widget.theme.primaryColor,
          minLines: isArea ? 3 : 1,
          maxLines: isArea ? 6 : 1,
          keyboardType: switch (f.type) {
            'email' => TextInputType.emailAddress,
            'tel' => TextInputType.phone,
            'number' => const TextInputType.numberWithOptions(decimal: true),
            'textarea' => TextInputType.multiline,
            _ => TextInputType.text,
          },
          // The web form strips everything but digits from phone fields.
          inputFormatters: [
            if (f.type == 'tel') FilteringTextInputFormatter.digitsOnly,
          ],
          textInputAction: isArea ? TextInputAction.newline : TextInputAction.next,
          decoration: _decoration(f),
          validator: (v) => _validate(f, v),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme;
    final cardBg = theme.cardBackgroundColor ?? (_isDark ? const Color(0xFF1E1E20) : Colors.white);

    if (widget.submitted) {
      return Container(
        key: const ValueKey('lead_form_submitted'),
        width: double.infinity,
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _line),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFF16A34A)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                widget.strings.submitted,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _labelColor),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      key: const ValueKey('lead_form'),
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _line),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < widget.form.fields.length; i++) ...[
              Padding(
                padding: EdgeInsets.only(top: i == 0 ? 0 : 10, bottom: 5),
                child: Text.rich(
                  TextSpan(
                    text: widget.form.fields[i].label,
                    children: [
                      if (widget.form.fields[i].required)
                        const TextSpan(text: ' *', style: TextStyle(color: Color(0xFFDC2626))),
                    ],
                  ),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _labelColor),
                ),
              ),
              _field(widget.form.fields[i]),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _error!,
                  key: const ValueKey('lead_form_error'),
                  style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626)),
                ),
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: const ValueKey('lead_form_submit'),
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: theme.primaryColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: theme.primaryColor.withOpacity(0.72),
                  disabledForegroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                child: _submitting
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          ),
                          const SizedBox(width: 8),
                          Text(widget.strings.sending),
                        ],
                      )
                    : Text(widget.form.submitLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
