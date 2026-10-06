import 'package:flutter/material.dart';

/// Configuration for the AI Agent Client.
/// Matches the CRM Tenant and API deployment.
class AiAgentConfig {
  /// Base URL of the CRM backend (e.g. 'https://cb242.ceosuite.com' or 'http://10.0.2.2:8201' for emulator)
  final String apiUrl;

  /// Unique Tenant Identifier (e.g. 'default-tenant')
  final String tenantId;

  /// Display name of the tenant (e.g. 'CEO Suite')
  final String? tenantName;

  /// Display name of the bot (e.g. 'agentbot' or 'CEO Suite Assistant')
  final String botName;

  /// Brand primary color (Default CEO Suite Executive Red #801517)
  final Color primaryColor;

  /// Connection and request timeout duration
  final Duration timeout;

  /// Client-side rate-limiter interval to prevent spam / rapid double clicks
  final Duration floodThrottleInterval;

  /// Bot message shown after a lead form was submitted.
  final String formSuccessMessage;

  /// Shown next to a lead form when submitting failed.
  final String formErrorMessage;

  /// Action label on info cards (e.g. 'View Location Details' or 'Lihat Detail Lokasi').
  /// If null, defaults to 'View Location Details' or tenant-configured text.
  final String? cardActionLabel;

  /// Top header banner title on info cards (e.g. 'Featured Information').
  /// If null, defaults to 'Featured Information' or tenant-configured text.
  final String? cardBannerTitle;

  /// Polling interval for live sync (e.g. human agent replies). Defaults to 3 seconds.
  final Duration pollingInterval;

  /// Whether background polling is automatically enabled. Defaults to true.
  final bool enablePolling;

  const AiAgentConfig({
    required this.apiUrl,
    required this.tenantId,
    this.tenantName,
    this.botName = 'CEO Suite Assistant',
    this.primaryColor = const Color(0xFF801517),
    this.timeout = const Duration(seconds: 30),
    this.floodThrottleInterval = const Duration(milliseconds: 1200),
    this.formSuccessMessage =
        'Thank you! Your details have been submitted. Our team will contact you soon.',
    this.formErrorMessage =
        'Failed to submit the form. Please check your connection and try again.',
    this.cardActionLabel,
    this.cardBannerTitle,
    this.pollingInterval = const Duration(seconds: 3),
    this.enablePolling = false,
  });

  /// Sanitizes the base API URL to remove trailing slashes.
  String get sanitizedApiUrl {
    var url = apiUrl.trim();
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }
}
