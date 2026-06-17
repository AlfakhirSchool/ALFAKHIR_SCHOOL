import 'dart:io';
import 'dart:convert';

class DnsHelper {
  static final Map<String, String> _cache = {};

  static Future<String> resolveViaDoH(String hostname) async {
    if (_cache.containsKey(hostname)) return _cache[hostname]!;

    // Connect langsung ke IP 8.8.8.8 (Google), bypass DNS sistem
    final socket = await Socket.connect(
      '8.8.8.8', 443,
      timeout: const Duration(seconds: 5),
    );
    final secureSocket = await SecureSocket.secure(
      socket,
      host: 'dns.google', // SNI untuk TLS
    );

    final request =
        'GET /resolve?name=${Uri.encodeComponent(hostname)}&type=A HTTP/1.1\r\n'
        'Host: dns.google\r\n'
        'Accept: application/dns-json\r\n'
        'Connection: close\r\n\r\n';
    secureSocket.add(utf8.encode(request));

    final chunks = <int>[];
    await for (final chunk in secureSocket) {
      chunks.addAll(chunk);
    }
    secureSocket.destroy();

    final response = utf8.decode(chunks);
    final body = response.contains('\r\n\r\n')
        ? response.split('\r\n\r\n').skip(1).join('\r\n\r\n').trim()
        : response;

    final json = jsonDecode(body) as Map<String, dynamic>;
    final answers = json['Answer'] as List?;
    final ip = answers?.firstWhere(
      (a) => a['type'] == 1,
      orElse: () => null,
    )?['data'] as String?;

    if (ip == null) throw SocketException('DoH: no A record for $hostname');
    _cache[hostname] = ip;
    return ip;
  }
}
