import 'dart:convert';
import 'dart:developer' as dev;
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/api_client.dart';

// Must be top-level for FCM background handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await NotificationService._showLocalFromRemote(message);
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _fcm = FirebaseMessaging.instance;
  final _local = FlutterLocalNotificationsPlugin();

  final List<Map<String, dynamic>> _inAppNotifs = [];
  int _unreadCount = 0;
  final List<VoidCallback> _listeners = [];

  int get unreadCount => _unreadCount;
  List<Map<String, dynamic>> get notifications => List.unmodifiable(_inAppNotifs);

  void addListener(VoidCallback cb) => _listeners.add(cb);
  void removeListener(VoidCallback cb) => _listeners.remove(cb);
  void _notify() {
    for (final cb in _listeners) {
      cb();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────

  Future<void> init() async {
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    const androidChannel = AndroidNotificationChannel(
      'coworkhq_main',
      'CoWork HQ',
      description: 'Booking and workspace notifications',
      importance: Importance.high,
    );

    await _local
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    await _local.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: _onLocalTap,
    );

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    FirebaseMessaging.onMessage.listen(_onForeground);
    FirebaseMessaging.onMessageOpenedApp.listen(_onOpenedApp);

    await _registerToken();
    _fcm.onTokenRefresh.listen(_sendTokenToBackend);
    await _loadCached();
  }

  // ── Token ─────────────────────────────────────────────────────────

  Future<void> _registerToken() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        dev.log('FCM token: $token');
        await _sendTokenToBackend(token);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('fcm_token', token);
      }
    } catch (e) {
      dev.log('FCM token error: $e');
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    final auth = ApiClient.authToken;
    if (auth == null) return;
    try {
      await ApiClient.registerFcmToken(token, auth);
    } catch (e) {
      dev.log('FCM register error: $e');
    }
  }

  // Re-register after login (authToken now available)
  Future<void> onLogin() async {
    await _registerToken();
    final auth = ApiClient.authToken;
    if (auth != null) await loadFromBackend(auth);
  }

  // ── Push handlers ─────────────────────────────────────────────────

  Future<void> _onForeground(RemoteMessage message) async {
    dev.log('FCM foreground: ${message.notification?.title}');
    await _showLocalFromRemote(message);
    _addInApp({
      'id': message.messageId ?? DateTime.now().toIso8601String(),
      'title': message.notification?.title ?? 'Notification',
      'body': message.notification?.body ?? '',
      'type': message.data['type'] ?? 'general',
      'data': message.data,
      'isRead': false,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  static Future<void> _showLocalFromRemote(RemoteMessage message) async {
    final local = FlutterLocalNotificationsPlugin();
    final notif = message.notification;
    if (notif == null) return;
    await local.show(
      id: notif.hashCode,
      title: notif.title,
      body: notif.body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'coworkhq_main',
          'CoWork HQ',
          channelDescription: 'Booking and workspace notifications',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _onLocalTap(NotificationResponse response) {
    dev.log('Notification tapped: ${response.payload}');
  }

  void _onOpenedApp(RemoteMessage message) {
    dev.log('App opened from notification: ${message.data}');
  }

  // ── Schedule slot reminder ────────────────────────────────────────
  // Shows a local notification at scheduledAt via Future.delayed.
  // For production replace with flutter_local_notifications zonedSchedule.

  Future<void> scheduleSlotReminder({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledAt,
  }) async {
    final diff = scheduledAt.difference(DateTime.now());
    if (diff.isNegative) return;
    Future.delayed(diff, () async {
      await _local.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'coworkhq_main',
            'CoWork HQ',
            channelDescription: 'Booking and workspace notifications',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentSound: true,
          ),
        ),
      );
    });
  }

  // ── In-app bell store ─────────────────────────────────────────────

  void _addInApp(Map<String, dynamic> notif) {
    _inAppNotifs.insert(0, notif);
    if (notif['isRead'] == false) _unreadCount++;
    _persistCache();
    _notify();
  }

  Future<void> loadFromBackend(String authToken) async {
    try {
      final list = await ApiClient.fetchNotifications(authToken);
      if (list == null) return;
      _inAppNotifs
        ..clear()
        ..addAll(list);
      _unreadCount = list.where((n) => n['isRead'] == false).length;
      _persistCache();
      _notify();
    } catch (e) {
      dev.log('Load notifications error: $e');
    }
  }

  Future<void> markAllRead(String authToken) async {
    final ids = _inAppNotifs
        .where((n) => n['isRead'] == false)
        .map((n) => n['id'].toString())
        .toList();
    if (ids.isEmpty) return;
    try {
      await ApiClient.markNotificationsRead(ids, authToken);
      for (final n in _inAppNotifs) {
        n['isRead'] = true;
      }
      _unreadCount = 0;
      _persistCache();
      _notify();
    } catch (e) {
      dev.log('Mark read error: $e');
    }
  }

  Future<void> _persistCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          'notif_cache', jsonEncode(_inAppNotifs.take(50).toList()));
    } catch (_) {}
  }

  Future<void> _loadCached() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('notif_cache');
      if (raw != null) {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _inAppNotifs
          ..clear()
          ..addAll(list);
        _unreadCount = list.where((n) => n['isRead'] == false).length;
        _notify();
      }
    } catch (_) {}
  }

  void addBookingNotif({
    required String title,
    required String body,
    required String type,
    String? bookingId,
  }) {
    _addInApp({
      'id': 'local_${DateTime.now().millisecondsSinceEpoch}',
      'title': title,
      'body': body,
      'type': type,
      'data': bookingId != null ? {'bookingId': bookingId} : <String, dynamic>{},
      'isRead': false,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }
}
