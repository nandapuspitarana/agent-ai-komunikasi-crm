/// Version of this SDK. Keep in sync with `version:` in pubspec.yaml and with
/// SDK_LATEST_VERSION in the backend's src/lib/version.ts (a test enforces both).
const String aiAgentSdkVersion = '1.1.0';

/// How this SDK compares with what the server considers current.
enum SdkStatus {
  /// At (or ahead of) the latest release.
  current,

  /// Still works, but a newer SDK is available.
  updateAvailable,

  /// Older than the minimum the server supports: update required.
  unsupported,

  /// Versions could not be compared (server too old to report them, or unparsable).
  unknown,
}

/// Compares "1.2.3", "1.2.3+4" or "1.2.3-beta" style versions (suffixes ignored).
/// Returns a negative, zero or positive number, or `null` if either side is not a version.
int? compareVersions(String? a, String? b) {
  final pa = _parse(a);
  final pb = _parse(b);
  if (pa == null || pb == null) return null;
  for (var i = 0; i < 3; i++) {
    if (pa[i] != pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

List<int>? _parse(String? v) {
  if (v == null) return null;
  final m = RegExp(r'^\s*v?(\d+)\.(\d+)\.(\d+)').firstMatch(v);
  if (m == null) return null;
  return [
    int.parse(m.group(1)!),
    int.parse(m.group(2)!),
    int.parse(m.group(3)!)
  ];
}

/// Version information reported by the CRM backend (`GET /api/version`, or the
/// `version` block of `POST /api/widget/init`).
class ServerVersionInfo {
  /// Server release, e.g. `1.1.0`.
  final String serverVersion;

  /// Widget/mobile API contract version.
  final String apiVersion;

  /// Short git commit of the deployed build, when the server was built with one.
  final String? commit;
  final String? builtAt;

  /// Newest SDK release the server knows about.
  final String? latestSdk;

  /// Oldest SDK release the server still supports.
  final String? minSupportedSdk;

  /// The SDK version this client is running.
  final String clientSdk;

  const ServerVersionInfo({
    required this.serverVersion,
    required this.apiVersion,
    this.commit,
    this.builtAt,
    this.latestSdk,
    this.minSupportedSdk,
    this.clientSdk = aiAgentSdkVersion,
  });

  factory ServerVersionInfo.fromJson(Map<String, dynamic> json,
      {String clientSdk = aiAgentSdkVersion}) {
    final sdk = json['sdk'] is Map
        ? Map<String, dynamic>.from(json['sdk'] as Map)
        : const <String, dynamic>{};
    return ServerVersionInfo(
      serverVersion: json['version']?.toString() ?? 'unknown',
      apiVersion: json['apiVersion']?.toString() ?? 'unknown',
      commit: json['commit']?.toString(),
      builtAt: json['builtAt']?.toString(),
      latestSdk: sdk['latest']?.toString(),
      minSupportedSdk: sdk['minSupported']?.toString(),
      clientSdk: clientSdk,
    );
  }

  /// Computed locally from this client's own version, so it does not depend on
  /// the server having recognised the caller.
  SdkStatus get status {
    final vsMin = compareVersions(clientSdk, minSupportedSdk);
    final vsLatest = compareVersions(clientSdk, latestSdk);
    if (vsMin == null || vsLatest == null) return SdkStatus.unknown;
    if (vsMin < 0) return SdkStatus.unsupported;
    return vsLatest < 0 ? SdkStatus.updateAvailable : SdkStatus.current;
  }

  bool get isUpdateAvailable =>
      status == SdkStatus.updateAvailable || status == SdkStatus.unsupported;
  bool get isUpdateRequired => status == SdkStatus.unsupported;

  @override
  String toString() =>
      'ServerVersionInfo(server: $serverVersion, api: $apiVersion, commit: $commit, sdk: $clientSdk -> latest: $latestSdk, status: ${status.name})';
}
