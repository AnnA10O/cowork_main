import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../data/app_data.dart';
import '../../models/booking_model.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<BookingModel> _filtered(String status) =>
      AppData.bookings.where((b) => b.status == status).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(
          'My Bookings',
          style: GoogleFonts.inter(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded,
                color: AppColors.onSurfaceVariant),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Filter coming soon')));
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 2.5,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.onSurfaceVariant,
          labelStyle:
          GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
          unselectedLabelStyle:
          GoogleFonts.inter(fontWeight: FontWeight.w400, fontSize: 14),
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Active'),
            Tab(text: 'Past'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _BookingList(
              bookings: _filtered('confirmed') + _filtered('upcoming'),
              tab: 'upcoming'),
          _BookingList(bookings: [], tab: 'active'),
          _BookingList(bookings: _filtered('completed'), tab: 'past'),
        ],
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  final List<BookingModel> bookings;
  final String tab;
  const _BookingList({required this.bookings, required this.tab});

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return _EmptyState();
    }
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: bookings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 14),
      itemBuilder: (context, i) => _BookingCard(booking: bookings[i]),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final BookingModel booking;
  const _BookingCard({required this.booking});

  Color get _statusColor {
    switch (booking.status) {
      case 'confirmed':
        return const Color(0xFF10B981);
      case 'upcoming':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF9CA3AF);
    }
  }

  String get _statusLabel {
    switch (booking.status) {
      case 'confirmed':
        return 'Confirmed';
      case 'upcoming':
        return 'Upcoming';
      default:
        return 'Completed';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEE, d MMM yyyy').format(booking.date);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top row: image + info ────────────────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  booking.spaceImageUrl,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 80,
                    height: 80,
                    color: AppColors.surfaceContainer,
                    child: const Icon(Icons.image_not_supported_outlined,
                        color: Colors.white24),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Ref + status
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            booking.bookingRef,
                            style: GoogleFonts.inter(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 10,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _statusColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _statusLabel,
                            style: GoogleFonts.inter(
                              color: _statusColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      booking.spaceName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            color: AppColors.onSurfaceVariant, size: 12),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            booking.spaceLocation,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 11.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded,
                            color: AppColors.onSurfaceVariant, size: 11),
                        const SizedBox(width: 4),
                        Text(
                          dateStr,
                          style: GoogleFonts.inter(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 11.5,
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Icon(Icons.schedule_rounded,
                            color: AppColors.onSurfaceVariant, size: 11),
                        const SizedBox(width: 4),
                        Text(
                          '${booking.startTime} – ${booking.endTime}',
                          style: GoogleFonts.inter(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(color: Colors.white12, height: 1),
          const SizedBox(height: 12),

          // ── Action buttons ───────────────────────────────────────────
          // FIX: use IntrinsicHeight + explicit sizing instead of bare
          // Expanded inside Row, which caused "BoxConstraints forces an
          // infinite width" and blank screens on navigation.
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.qr_code_rounded,
                  label: 'View E-Pass',
                  foregroundColor: AppColors.primary,
                  borderColor: AppColors.primary.withOpacity(0.5),
                  onPressed: () {
                    // FIX: use Future.microtask so navigation fires after
                    // the current frame completes, avoiding layout errors
                    // that caused the destination screen to be blank.
                    Future.microtask(() {
                      if (context.mounted) {
                        context.push('/confirmation', extra: {
                          'spaceName': booking.spaceName,
                          'bookingRef': booking.bookingRef,
                          'date':
                          DateFormat('d MMM yyyy').format(booking.date),
                          'startTime': booking.startTime,
                          'endTime': booking.endTime,
                          'seatId': booking.seatId,
                          'location': booking.spaceLocation,
                          'totalAmount': booking.totalAmount,
                        });
                      }
                    });
                  },
                ),
              ),
              if (booking.status == 'upcoming' ||
                  booking.status == 'confirmed') ...[
                const SizedBox(width: 10),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.cancel_outlined,
                    label: 'Cancel',
                    foregroundColor: const Color(0xFFEF4444),
                    borderColor: const Color(0xFFEF4444).withOpacity(0.5),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          backgroundColor: AppColors.surfaceContainer,
                          title: Text(
                            'Cancel Booking?',
                            style: GoogleFonts.inter(
                                color: AppColors.onSurface,
                                fontWeight: FontWeight.w700),
                          ),
                          content: Text(
                            'This action cannot be undone.',
                            style: GoogleFonts.inter(
                                color: AppColors.onSurfaceVariant),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: Text('Keep',
                                  style: GoogleFonts.inter(
                                      color: AppColors.primary)),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                      Text('Cancellation coming soon')),
                                );
                              },
                              child: Text('Cancel',
                                  style: GoogleFonts.inter(
                                      color: const Color(0xFFEF4444))),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/// Extracted button widget with explicit constraints to prevent the
/// "BoxConstraints forces an infinite width" error that occurred when
/// OutlinedButton.icon was placed directly inside Expanded in a Row.
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color foregroundColor;
  final Color borderColor;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.foregroundColor,
    required this.borderColor,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity, // bounds the button so it never gets infinite width
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 15),
        label: Text(
          label,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: foregroundColor,
          side: BorderSide(color: borderColor),
          padding: const EdgeInsets.symmetric(vertical: 9),
          shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          // FIX: shrink tap target so Flutter doesn't try to expand the
          // button beyond its natural/bounded size.
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          minimumSize: const Size(0, 0),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_outlined,
              color: AppColors.onSurfaceVariant, size: 56),
          const SizedBox(height: 16),
          Text(
            'No bookings yet',
            style: GoogleFonts.inter(
              color: AppColors.onSurface,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Find and book your perfect workspace',
            style:
            GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 14),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go('/space-types'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: Colors.white,
              padding:
              const EdgeInsets.symmetric(horizontal: 28, vertical: 13),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(
              'Browse Spaces',
              style:
              GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}