import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Gradient accent top line
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, AppColors.primary, Colors.transparent],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  const Spacer(),
                  // Branding
                  Column(
                    children: [
                      // Logo
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryContainer.withOpacity(0.3),
                              blurRadius: 20,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.workspaces,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Book My Space',
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Welcome Back',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Sign in to your professional sanctuary.',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),

                  // Social login buttons
                  _SocialButton(
                    onTap: () => context.go('/home'),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _googleLogo(),
                        const SizedBox(width: 12),
                        Text(
                          'Continue with Google',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.05,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ],
                    ),
                    color: Colors.transparent,
                    border: true,
                  ),
                  const SizedBox(height: 12),

                  _SocialButton(
                    onTap: () => context.go('/home'),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.apple, color: Color(0xFF051424), size: 22),
                        const SizedBox(width: 12),
                        Text(
                          'Continue with Apple',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: const Color(0xFF051424),
                          ),
                        ),
                      ],
                    ),
                    color: AppColors.onSurface,
                    border: false,
                  ),
                  const SizedBox(height: 20),

                  // Divider
                  Row(
                    children: [
                      Expanded(
                        child: Divider(
                          color: AppColors.outlineVariant.withOpacity(0.3),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'OR',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.outline,
                            letterSpacing: 0.05,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: AppColors.outlineVariant.withOpacity(0.3),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  _SocialButton(
                    onTap: () => context.go('/home'),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.phone_iphone, color: AppColors.primary, size: 22),
                        const SizedBox(width: 12),
                        Text(
                          'Continue with Phone',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.05,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ],
                    ),
                    color: Colors.transparent,
                    border: true,
                  ),

                  const SizedBox(height: 32),

                  // Footer links
                  RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                      children: [
                        const TextSpan(text: "Don't have an account? "),
                        TextSpan(
                          text: 'Request Access',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Availability indicator
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.05),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.available,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '84 SPACES AVAILABLE NOW',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                            letterSpacing: 0.05,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),

                  // Terms
                  Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppColors.outline,
                        ),
                        children: const [
                          TextSpan(text: 'By continuing, you agree to our '),
                          TextSpan(
                            text: 'Terms of Service',
                            style: TextStyle(decoration: TextDecoration.underline),
                          ),
                          TextSpan(text: ' and '),
                          TextSpan(
                            text: 'Privacy Policy',
                            style: TextStyle(decoration: TextDecoration.underline),
                          ),
                          TextSpan(text: '.'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _googleLogo() {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GoogleLogoPainter()),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  final Color color;
  final bool border;

  const _SocialButton({
    required this.child,
    required this.onTap,
    required this.color,
    required this.border,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 48,
        width: double.infinity,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(8),
          border: border
              ? Border.all(color: AppColors.outlineVariant)
              : null,
        ),
        child: Center(child: child),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paths = [
      (
      'M 18 10.25 C 18 9.56 17.94 8.9 17.82 8.27 H 10 V 11.75 H 14.48 C 14.26 12.87 13.62 13.81 12.65 14.44 V 16.67 H 15.46 C 17.08 15.19 18 12.93 18 10.25 Z',
      const Color(0xFF4285F4)
      ),
      (
      'M 10 19 C 12.22 19 14.08 18.27 15.47 16.97 L 12.66 14.74 C 11.94 15.23 11.03 15.52 10 15.52 C 7.86 15.52 6.05 14.04 5.41 12.07 H 2.53 V 14.37 C 3.93 17.1 6.78 19 10 19 Z',
      const Color(0xFF34A853)
      ),
      (
      'M 5.41 12.07 C 5.24 11.56 5.14 11.02 5.14 10.47 C 5.14 9.92 5.24 9.38 5.41 8.87 V 6.57 H 2.53 C 1.94 7.76 1.61 9.07 1.61 10.47 C 1.61 11.87 1.94 13.18 2.53 14.37 L 5.41 12.07 Z',
      const Color(0xFFFBBC05)
      ),
      (
      'M 10 5.41 C 11.14 5.41 12.16 5.82 12.95 6.58 L 15.27 4.26 C 13.82 2.91 11.96 2.08 10 2.08 C 6.78 2.08 3.93 3.98 2.53 6.71 L 5.41 9.01 C 6.05 7.04 7.86 5.56 10 5.41 Z',
      const Color(0xFFEA4335)
      ),
    ];
    for (final (pathStr, color) in paths) {
      // Draw basic Google G
    }
    // Simplified: draw colored circles
    final paint = Paint()..color = const Color(0xFF4285F4);
    canvas.drawCircle(Offset(size.width / 2, size.height / 2), size.width / 2, paint);
    paint.color = Colors.white;
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'G',
        style: TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(
        (size.width - textPainter.width) / 2,
        (size.height - textPainter.height) / 2,
      ),
    );
  }

  @override
  bool shouldRepaint(_) => false;
}