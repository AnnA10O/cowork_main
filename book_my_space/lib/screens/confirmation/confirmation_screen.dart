import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme/app_colors.dart';

class ConfirmationScreen extends StatelessWidget {
  final Map<String, dynamic> bookingData;
  const ConfirmationScreen({super.key, required this.bookingData});

  @override
  Widget build(BuildContext context) {
    final spaceName = bookingData['spaceName']?.toString() ?? 'Workspace';
    final ref = bookingData['ref']?.toString() ?? bookingData['bookingRef']?.toString() ?? 'N/A';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
            child: Column(
              children: [
                // Success header
                Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryContainer.withOpacity(0.4),
                            blurRadius: 30,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        size: 48,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Booking Confirmed!',
                      style: GoogleFonts.inter(
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your workspace is ready for you.',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // E-Pass Ticket
                _EPassTicket(
                  spaceName: spaceName,
                  ref: ref,
                  seatLabel: bookingData['seatType']?.toString() ?? 'Workspace Seat',
                  dateLabel: bookingData['date']?.toString() ?? 'N/A',
                  timeLabel: bookingData['startTime']?.toString() ?? 'N/A',
                ),

                const SizedBox(height: 32),

                // Action buttons
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(
                    'Add to Calendar',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 2),
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.ios_share),
                  label: Text(
                    'Share Pass',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onSurface,
                    backgroundColor: AppColors.surfaceContainerHighest,
                    side: BorderSide.none,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                GestureDetector(
                  onTap: () => context.go('/bookings'),
                  child: Text(
                    'View All Bookings',
                    style: GoogleFonts.inter(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EPassTicket extends StatelessWidget {
  final String spaceName;
  final String ref;
  final String seatLabel;
  final String dateLabel;
  final String timeLabel;

  const _EPassTicket({
    required this.spaceName,
    required this.ref,
    required this.seatLabel,
    required this.dateLabel,
    required this.timeLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 40,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        children: [
          // Ticket top (cream)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: AppColors.creamSurface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      spaceName,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.background,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '#$ref',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.05,
                          color: AppColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // QR Code
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.outlineVariant.withOpacity(0.2),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: QrImageView(
                    data: 'BOOKMYSPACE-$ref-INDIA',
                    version: QrVersions.auto,
                    size: 160,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'SCAN FOR ENTRY',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.1,
                    color: AppColors.outline,
                  ),
                ),
              ],
            ),
          ),

          // Serrated edge
          Container(
            height: 20,
            color: AppColors.creamSurface,
            child: Row(
              children: [
                _notch(left: true),
                Expanded(
                  child: CustomPaint(
                    painter: _DashedLinePainter(),
                  ),
                ),
                _notch(left: false),
              ],
            ),
          ),

          // Ticket bottom (cream with texture)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            decoration: const BoxDecoration(
              color: AppColors.creamSurface,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _TicketField(
                        label: 'WORKSPACE',
                        value: spaceName,
                        isLeft: true,
                      ),
                    ),
                    Expanded(
                      child: _TicketField(
                        label: 'SEAT',
                        value: seatLabel,
                        isLeft: false,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: _TicketField(
                        label: 'DATE',
                        value: dateLabel,
                        isLeft: true,
                        isSmall: true,
                      ),
                    ),
                    Expanded(
                      child: _TicketField(
                        label: 'TIME',
                        value: timeLabel,
                        isLeft: false,
                        isSmall: true,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _notch({required bool left}) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: AppColors.background,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _TicketField extends StatelessWidget {
  final String label;
  final String value;
  final bool isLeft;
  final bool isSmall;

  const _TicketField({
    required this.label,
    required this.value,
    required this.isLeft,
    this.isSmall = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: isLeft ? CrossAxisAlignment.start : CrossAxisAlignment.end,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.08,
            color: AppColors.outline,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: isSmall ? 15 : 18,
            fontWeight: FontWeight.w600,
            color: AppColors.background,
          ),
        ),
      ],
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.outlineVariant.withOpacity(0.4)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const dashWidth = 8.0;
    const dashSpace = 6.0;
    double startX = 0;
    final y = size.height / 2;

    while (startX < size.width) {
      canvas.drawLine(Offset(startX, y), Offset(startX + dashWidth, y), paint);
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(_) => false;
}