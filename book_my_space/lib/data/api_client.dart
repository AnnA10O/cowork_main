import 'dart:convert';
import 'dart:developer' as dev;
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  // Use http://10.0.2.2:3000/api/v1 for Android Emulator loopback,
  // http://localhost:3000/api/v1 for Web/iOS, or your custom local network IP.
  static String baseUrl = 'http://localhost:3000/api/v1';

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
      // Auto-detect Android Emulator disabled to allow physical device port forwarding (adb reverse)
      /*
      if (!kIsWeb && Platform.isAndroid) {
        if (baseUrl.contains('localhost')) {
          baseUrl = baseUrl.replaceAll('localhost', '10.0.2.2');
          dev.log('API: Auto-mapped localhost to 10.0.2.2 for Android: $baseUrl');
        }
      }
      */

      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      final userStr = prefs.getString('current_user');
      if (userStr != null) {
        _currentUser = jsonDecode(userStr);
      }
      dev.log('API: Initialized auth token: $_authToken');
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
      dev.log('API Error (fetchWorkspaces): $e. Seamlessly falling back to local synthetic data.', error: e);
    }
    return null;
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
      dev.log('API Error (fetchWorkspaceDetail): $e. Seamlessly falling back to local synthetic data.', error: e);
    }
    return null;
  }

  /// GET /mobile/workspaces/:id/availability?date=YYYY-MM-DD — Fetch desk availability
  static Future<List<Map<String, dynamic>>?> fetchDeskAvailability(String id, String date) async {
    try {
      final uri = Uri.parse('$baseUrl/mobile/workspaces/$id/availability').replace(
        queryParameters: {'date': date},
      );
      dev.log('API: Fetching desk availability from: $uri');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'] ?? body;
        if (data is List) {
          return List<Map<String, dynamic>>.from(data.map((d) => Map<String, dynamic>.from(d)));
        }
      }
    } catch (e) {
      dev.log('API Error (fetchDeskAvailability): $e. Seamlessly falling back to local synthetic data.', error: e);
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
    String? couponCode,
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
        if (couponCode != null) 'couponCode': couponCode,
      });

      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: body,
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Map<String, dynamic>.from(data['data'] ?? data);
      }
    } catch (e) {
      dev.log('API Error (createBooking): $e', error: e);
    }
    return null;
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
      ).timeout(const Duration(seconds: 5));

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
