import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  int _locationToIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/map')) return 1;
    if (location.startsWith('/space-types') || location.startsWith('/spaces')) return 2;
    if (location.startsWith('/bookings')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _locationToIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(currentIndex: currentIndex),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  const _BottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.home_outlined,       Icons.home,            'Home',     '/home'),
      (Icons.map_outlined,        Icons.map,             'Map',      '/map'),
      (Icons.workspaces_outlined, Icons.workspaces,      'Spaces',   '/space-types'),
      (Icons.event_available_outlined, Icons.event_available, 'Bookings', '/bookings'),
      (Icons.person_outline,      Icons.person,          'Profile',  '/profile'),
    ];

    return Container(
      height: 80,
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainer,
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant, width: 0.5),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final (outlinedIcon, filledIcon, label, path) = entry.value;
          final isActive = currentIndex == i;
          return GestureDetector(
            onTap: () => context.go(path),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: isActive
                  ? BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(24),
                    )
                  : null,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isActive ? filledIcon : outlinedIcon,
                    color: isActive
                        ? AppColors.onPrimaryContainer
                        : AppColors.onSurfaceVariant,
                    size: 22,
                  ),
                  const SizedBox(height: 2),
                  Text(label,
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
                        color: isActive
                            ? AppColors.onPrimaryContainer
                            : AppColors.onSurfaceVariant,
                      )),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}