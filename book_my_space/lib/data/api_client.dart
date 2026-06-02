import 'dart:convert';
import 'dart:developer' as dev;
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  // Dev: run with `flutter run` (requires: adb reverse tcp:3000 tcp:3000)
  // Prod: run with `flutter build apk --dart-define=API_URL=https://api.yourbackend.com/api/v1`
  static String baseUrl = const String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000/api/v1');

  static String? _authToken;
  static Map<String, dynamic>? _currentUser;

  static String? get authToken => _authToken;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static bool get isAuthenticated => _authToken != null;

  static void setBaseUrl(String newUrl) {
    baseUrl = newUrl;
  }

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      final userStr = prefs.getString('current_user');
      if (userStr != null) {
        _currentUser = jsonDecode(userStr);
      }
      dev.log('API: Initialized auth token: $_authToken');

      // Smart auto-detect local network configuration on Android
      if (!kIsWeb && Platform.isAndroid && baseUrl.contains('localhost')) {
        dev.log('API: Testing local server connectivity on $baseUrl...');
        try {
          // Probe localhost (with a short timeout to prevent blocking app startup)
          final testUri = Uri.parse('$baseUrl/mobile/workspaces');
          await http.get(testUri).timeout(const Duration(milliseconds: 600));
          dev.log('API: Localhost server resolved successfully! Keeping baseUrl: $baseUrl');
        } catch (e) {
          dev.log('API: Localhost unreachable on Android ($e). Checking Emulator loopback...');
          final emulatorUrl = baseUrl.replaceAll('localhost', '10.0.2.2');
          try {
            final testUri = Uri.parse('$emulatorUrl/mobile/workspaces');
            await http.get(testUri).timeout(const Duration(milliseconds: 600));
            baseUrl = emulatorUrl;
            dev.log('API: Emulator detected! Automatically mapped baseUrl to: $baseUrl');
          } catch (e2) {
            dev.log('API WARNING: Both localhost and emulator loopback are unreachable. If using a physical Android device, please execute "adb reverse tcp:3000 tcp:3000" in your terminal to forward port 3000, or check your server configuration.');
          }
        }
      }
    } catch (e) {
      dev.log('API Error (init): $e');
    }
  }

  static Future<Map<String, dynamic>?> login({
    required String email,
    required String password,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/auth/login');
      dev.log('API: Logging in to: $uri');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        final token = data['accessToken'];
        final user = data['user'];
        if (token != null) {
          _authToken = token;
          _currentUser = user != null ? Map<String, dynamic>.from(user) : null;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_token', token);
          if (user != null) {
            await prefs.setString('current_user', jsonEncode(user));
          }
          return Map<String, dynamic>.from(data);
        }
      }
    } catch (e) {
      dev.log('API Error (login): $e', error: e);
    }
    return null;
  }

  static Future<Map<String, dynamic>?> loginWithFirebase({
    required String idToken,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/auth/firebase');
      dev.log('API: Logging in with Firebase to: $uri');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        final token = data['accessToken'];
        final user = data['user'];
        if (token != null) {
          _authToken = token;
          _currentUser = user != null ? Map<String, dynamic>.from(user) : null;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_token', token);
          if (user != null) {
            await prefs.setString('current_user', jsonEncode(user));
          }
          return Map<String, dynamic>.from(data);
        }
      }
    } catch (e) {
      dev.log('API Error (loginWithFirebase): $e', error: e);
    }
    return null;
  }

  static Future<void> logout() async {
    _authToken = null;
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      await prefs.remove('current_user');
    } catch (e) {
      dev.log('API Error (logout): $e');
    }
  }

  /// GET /mobile/workspaces — Fetch listing of all workspaces
  static Future<List<Map<String, dynamic>>?> fetchWorkspaces({String? search, String? city}) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/workspaces').replace(
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          if (city != null && city.isNotEmpty) 'city': city,
        },
      );
      
      dev.log('API: Fetching workspaces from: $uri');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = data['data']?['workspaces'] ?? data['workspaces'];
        if (list is List) {
          return List<Map<String, dynamic>>.from(list.map((w) => Map<String, dynamic>.from(w)));
        }
      }
    } catch (e) {
      dev.log('API Error (fetchWorkspaces): $e', error: e);
    }
    return null;
  }

  /// GET /mobile/workspaces?limit=1 — Fetch total count of workspaces
  static Future<int> fetchTotalWorkspacesCount() async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/workspaces?limit=1');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final payload = data['data'] ?? data;
        if (payload['total'] != null) {
          return payload['total'] as int;
        }
      }
    } catch (e) {
      dev.log('API Error (fetchTotalWorkspacesCount): $e');
    }
    return 84;
  }

  /// GET /mobile/workspaces/:id — Fetch full detail of a specific workspace
  static Future<Map<String, dynamic>?> fetchWorkspaceDetail(String id) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/workspaces/$id');
      dev.log('API: Fetching detail from: $uri');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
    } catch (e) {
      dev.log('API Error (fetchWorkspaceDetail): $e', error: e);
    }
    return null;
  }

  /// GET /mobile/workspaces/:id/availability?date=YYYY-MM-DD — Fetch desk availability
  static Future<List<Map<String, dynamic>>?> fetchDeskAvailability(String workspaceId, String date, {String? startTime, String? endTime}) async {
    try {
      String url = '$baseUrl/mobile/workspaces/$workspaceId/availability?date=$date';
      if (startTime != null) url += '&startTime=${Uri.encodeComponent(startTime)}';
      if (endTime != null) url += '&endTime=${Uri.encodeComponent(endTime)}';
      
      final uri = Uri.parse(url);
      dev.log('API: Fetching desk availability from: $uri');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        if (data is List) {
          return List<Map<String, dynamic>>.from(data.map((d) => Map<String, dynamic>.from(d)));
        }
      }
    } catch (e) {
      dev.log('API Error (fetchDeskAvailability): $e', error: e);
    }
    return null;
  }

  /// GET /mobile/workspaces/:id/extra-services — Fetch extra services for workspace
  static Future<List<Map<String, dynamic>>?> fetchExtraServices(String workspaceId) async {
    try {
      final uri = Uri.parse('$baseUrl/workspaces/$workspaceId/extra-services');
      dev.log('API: Fetching extra services from: $uri');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        if (data is List) {
          return List<Map<String, dynamic>>.from(data.map((d) => Map<String, dynamic>.from(d)));
        }
      }
    } catch (e) {
      dev.log('API Error (fetchExtraServices): $e', error: e);
    }
    return null;
  }

  /// POST /mobile/bookings — Create a desk booking on the live server
  static Future<Map<String, dynamic>?> createBooking({
    required String workspaceId,
    required String deskId,
    required String pricingPlanId,
    required String startTime,
    required String endTime,
    List<String>? bookedSlots,
    String? couponCode,
    List<Map<String, dynamic>>? extras,
    required String authToken,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/bookings');
      final body = jsonEncode({
        'workspaceId': workspaceId,
        'deskId': deskId,
        'pricingPlanId': pricingPlanId,
        'startTime': startTime,
        'endTime': endTime,
        if (bookedSlots != null && bookedSlots.isNotEmpty) 'bookedSlots': bookedSlots,
        if (couponCode != null) 'couponCode': couponCode,
        if (extras != null && extras.isNotEmpty) 'extras': extras,
      });

      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: body,
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Map<String, dynamic>.from(data['data'] ?? data);
      }
    } catch (e) {
      dev.log('API Error (createBooking): $e', error: e);
    }
    return null;
  }

  /// PATCH /mobile/bookings/:id/cancel — Cancel a booking
  static Future<bool> cancelBooking(String bookingId, String authToken) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/bookings/$bookingId/cancel');
      final response = await http.patch(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return true;
      }
    } catch (e) {
      dev.log('API Error (cancelBooking): $e', error: e);
    }
    return false;
  }

  /// GET /mobile/bookings/my — Fetch customer's real bookings
  static Future<List<Map<String, dynamic>>?> fetchMyBookings(String authToken) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/bookings/my');
      dev.log('API: Fetching customer bookings from: $uri');
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        if (data is List) {
          return List<Map<String, dynamic>>.from(data.map((b) => Map<String, dynamic>.from(b)));
        }
      }
    } catch (e) {
      dev.log('API Error (fetchMyBookings): $e', error: e);
    }
    return null;
  }
}
