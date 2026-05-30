import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'data/api_client.dart';
import 'theme/app_theme.dart';
import 'router/app_router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Read onboarding flag before launching — so the router redirect works
  final prefs = await SharedPreferences.getInstance();
  onboardingSeen = prefs.getBool('onboarding_seen') ?? false;

  // Initialize Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('Firebase initialized successfully.');
  } catch (e) {
    debugPrint('Firebase core initialization skipped or failed: $e');
  }

  // Load API client config & session tokens
  await ApiClient.init();

  runApp(const BookMySpaceApp());
}

class BookMySpaceApp extends StatelessWidget {
  const BookMySpaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Book My Space',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
