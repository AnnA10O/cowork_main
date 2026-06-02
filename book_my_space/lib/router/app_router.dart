import 'package:go_router/go_router.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/login/login_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/map/map_screen.dart';
import '../screens/space_type/space_type_screen.dart';
import '../screens/spaces/spaces_screen.dart';
import '../screens/space_detail/space_detail_screen.dart';
import '../screens/seat_selection/seat_selection_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/confirmation/confirmation_screen.dart';
import '../screens/bookings/bookings_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../widgets/main_shell.dart';

// Set by main.dart before the router is used
bool onboardingSeen = false;

final GoRouter appRouter = GoRouter(
  initialLocation: '/onboarding',
  redirect: (context, state) {
    // Skip onboarding if already seen
    if (onboardingSeen && state.matchedLocation == '/onboarding') {
      return '/login';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(
          path: '/home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/map',
          builder: (context, state) => const MapScreen(),
        ),
        GoRoute(
          path: '/space-types',
          builder: (context, state) => const SpaceTypeScreen(),
        ),
        GoRoute(
          path: '/spaces',
          builder: (context, state) {
            final type = state.uri.queryParameters['type'] ?? 'all';
            return SpacesScreen(spaceType: type);
          },
        ),
        GoRoute(
          path: '/bookings',
          builder: (context, state) => const BookingsScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/space/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return SpaceDetailScreen(spaceId: id);
      },
    ),
    GoRoute(
      path: '/seat-selection/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return SeatSelectionScreen(spaceId: id);
      },
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return CheckoutScreen(bookingData: extra ?? {});
      },
    ),
    GoRoute(
      path: '/confirmation',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return ConfirmationScreen(bookingData: extra ?? {});
      },
    ),
  ],
);