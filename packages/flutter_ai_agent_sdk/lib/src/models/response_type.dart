/// Response types supported by the CRM AI Agent engine.
enum ResponseType {
  text,
  options,
  card,
  form,
  handoff;

  static ResponseType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'options':
        return ResponseType.options;
      case 'card':
        return ResponseType.card;
      case 'form':
        return ResponseType.form;
      case 'handoff':
        return ResponseType.handoff;
      case 'text':
      default:
        return ResponseType.text;
    }
  }

  String toApiValue() => name;
}
