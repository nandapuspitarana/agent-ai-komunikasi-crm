import 'package:flutter/material.dart';

/// Configuration for the AI Agent Client.
/// Matches the CRM Tenant and API deployment.
class AiAgentConfig {
  /// Base URL of the CRM backend (e.g. 'https://cb242.ceosuite.com' or 'http://10.0.2.2:8201' for emulator)
  final String apiUrl;

  /// Unique Tenant Identifier (e.g. 'default-tenant')
  final String tenantId;

  /// Display name of the bot (e.g. 'CEO Suite Executive Assistant')
  final String botName;

  /// Brand primary color (Default CEO Suite Executive Red #801517)
  final Color primaryColor;

  /// Connection and request timeout duration
  final Duration timeout;

  /// Client-side rate-limiter interval to prevent spam / rapid double clicks
  final Duration floodThrottleInterval;

  const AiAgentConfig({
    required this.apiUrl,
    required this.tenantId,
    this.botName = 'CEO Suite Assistant',
    this.primaryColor = const Color(0xFF801517),
    this.timeout = const Duration(seconds: 30),
    this.floodThrottleInterval = const Duration(milliseconds: 1200),
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
