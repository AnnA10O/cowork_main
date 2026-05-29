import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_colors.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  final _pageController = PageController();
  int _currentPage = 0;

  static const _slides = [
    _OnboardingSlide(
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
      tag: 'DISCOVER',
      title: 'Find Your Perfect\nWorkspace',
      subtitle: 'Discover premium co-working spaces across India with just a few taps.',
      badgeIcon: Icons.wifi,
      badgeLabel: 'Ultra-fast WiFi',
      gradientColors: [Color(0xFF0A1628), Color(0xFF1A3A6B)],
    ),
    _OnboardingSlide(
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
      tag: 'SIMPLE BOOKING',
      title: 'Book in\nMinutes',
      subtitle: 'Pick a seat, choose your time, pay securely — all without leaving the app.',
      badgeIcon: Icons.bolt,
      badgeLabel: 'Instant Booking',
      gradientColors: [Color(0xFF0D1117), Color(0xFF1E3A5F)],
    ),
    _OnboardingSlide(
      image: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
      tag: 'COMMUNITY',
      title: 'Work Smarter\nTogether',
      subtitle: 'Join 1,200+ professionals. Flexible plans starting at just ₹150/hr.',
      badgeIcon: Icons.groups,
      badgeLabel: '1,200+ Members',
      gradientColors: [Color(0xFF0A0F1E), Color(0xFF1A2744)],
    ),
  ];

  void _next() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_seen', true);
    if (mounted) context.go('/login');
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      body: Stack(children: [
        // Page content
        PageView.builder(
          controller: _pageController,
          itemCount: _slides.length,
          onPageChanged: (i) => setState(() => _currentPage = i),
          itemBuilder: (_, i) => _slides[i],
        ),

        // Top bar: logo + skip
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo
                Row(children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.workspaces, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 8),
                  Text('DeskHive',
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white)),
                ]),
                // Skip
                GestureDetector(
                  onTap: _finish,
                  child: Text('Skip',
                      style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.white60,
                          fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
        ),

        // Bottom controls
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      final active = i == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: active ? 28 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary : Colors.white24,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),
                  // Next / Get Started button
                  GestureDetector(
                    onTap: _next,
                    child: Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF2563EB), Color(0xFFEC4899)],
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _currentPage == _slides.length - 1 ? 'Get Started' : 'Next',
                            style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded,
                              color: Colors.white, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single slide
// ─────────────────────────────────────────────────────────────────────────────
class _OnboardingSlide extends StatelessWidget {
  final String image, tag, title, subtitle, badgeLabel;
  final IconData badgeIcon;
  final List<Color> gradientColors;

  const _OnboardingSlide({
    required this.image,
    required this.tag,
    required this.title,
    required this.subtitle,
    required this.badgeIcon,
    required this.badgeLabel,
    required this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Image card with floating badge
      Expanded(
        flex: 6,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 88, 24, 0),
          child: Stack(children: [
            // Rounded image
            ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Image.network(
                image,
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                    decoration: BoxDecoration(
                        gradient: LinearGradient(colors: gradientColors),
                        borderRadius: BorderRadius.circular(28))),
              ),
            ),
            // Gradient overlay
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black.withOpacity(0.3)],
                ),
              ),
            ),
            // Badge
            Positioned(
              bottom: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(40),
                  border: Border.all(color: Colors.white.withOpacity(0.3)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 12,
                    )
                  ],
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(badgeIcon, color: Colors.white, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('FEATURE',
                          style: GoogleFonts.inter(
                              fontSize: 9,
                              color: Colors.white60,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w600)),
                      Text(badgeLabel,
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.white,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),

      // Text section
      Expanded(
        flex: 4,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(32, 24, 32, 80),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: Text(tag,
                    style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        letterSpacing: 1.2)),
              ),
              const SizedBox(height: 14),
              Text(title,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      height: 1.15,
                      letterSpacing: -0.5)),
              const SizedBox(height: 12),
              Text(subtitle,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                      fontSize: 14,
                      color: Colors.white60,
                      height: 1.55)),
            ],
          ),
        ),
      ),
    ]);
  }
}
