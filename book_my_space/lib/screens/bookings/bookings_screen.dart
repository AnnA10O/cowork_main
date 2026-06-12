// lib/screens/bookings/bookings_screen.dart
// Full rewrite: timer, pending/confirmed states, multi-slot awareness,
// 5-min pre-warning, auto-expire to Past tab, in-app notifications.

import 'dart:async';
import 'dart:developer' as dev;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../data/api_client.dart';
import '../../models/booking_model.dart';
import '../../services/notification_service.dart';
import '../../theme/app_colors.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<BookingModel> _bookings = [];
  bool _isLoading = false;

  // Global 1-second tick that all timer cards subscribe to
  late Timer _globalTick;
  int _tickCount = 0;

  // Track which bookings we already scheduled 5-min reminders for
  final Set<String> _scheduledReminders = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadBookings();

    _globalTick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        _checkAndAutoExpire();
        setState(() => _tickCount++);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _globalTick.cancel();
    super.dispose();
  }

  // ── Data load ────────────────────────────────────────────────────

  Future<void> _loadBookings() async {
    final token = ApiClient.authToken;
    if (token == null) return;
    setState(() => _isLoading = true);
    try {
      final results = await ApiClient.fetchMyBookings(token);
      if (results != null && mounted) {
        final list = results.map(_mapBooking).toList();
        setState(() => _bookings = list);
        _scheduleReminders(list);
      }
    } catch (e) {
      dev.log('Bookings load error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Map raw API → BookingModel ────────────────────────────────────

  BookingModel _mapBooking(Map<String, dynamic> b) {
    final ws = b['workspace'] as Map? ?? {};
    final desk = b['desk'] as Map? ?? {};
    final raw = (b['status'] as String? ?? 'PENDING');

    DateTime startDT = DateTime.now();
    DateTime endDT = DateTime.now().add(const Duration(hours: 1));
    String startFmt = '09:00 AM';
    String endFmt = '10:00 AM';

    try {
      if (b['startTime'] != null) {
        startDT = DateTime.parse(b['startTime']).toLocal();
        startFmt = DateFormat('hh:mm a').format(startDT);
      }
      if (b['endTime'] != null) {
        endDT = DateTime.parse(b['endTime']).toLocal();
        endFmt = DateFormat('hh:mm a').format(endDT);
      }
    } catch (e) {
      dev.log('Date parse error: $e');
    }

    // Parse bookedSlots from backend (array of ISO strings)
    List<List<DateTime>> slots = [];
    final rawSlots = b['bookedSlots'];
    if (rawSlots is List && rawSlots.isNotEmpty) {
      final parsed = rawSlots
          .map((s) {
        try {
          return DateTime.parse(s.toString()).toLocal();
        } catch (_) {
          return null;
        }
      })
          .whereType<DateTime>()
          .toList()
        ..sort();

      for (final slotStart in parsed) {
        final slotEnd = slotStart.add(const Duration(hours: 1));
        if (slots.isNotEmpty &&
            slots.last[1].isAtSameMomentAs(slotStart)) {
          slots[slots.length - 1] = [slots.last[0], slotEnd];
        } else {
          slots.add([slotStart, slotEnd]);
        }
      }
    }

    final amount = _parseDouble(b['finalAmount']);
    final id = b['id']?.toString() ?? '';
    final ref =
    id.length > 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();
    final uiStatus = _mapStatus(raw, startDT, endDT);

    final images = ws['images'];
    final imageUrl = (images is List && images.isNotEmpty)
        ? (images[0]['url']?.toString() ?? '')
        : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80';

    return BookingModel(
      id: id,
      spaceName: ws['name']?.toString() ?? 'Workspace',
      spaceLocation: ws['address']?.toString() ??
          ws['city']?.toString() ??
          'Location',
      spaceImageUrl: imageUrl.isEmpty
          ? 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80'
          : imageUrl,
      workspaceName: ws['name']?.toString() ?? 'Workspace',
      seatId: 'Desk ${desk['deskNumber']?.toString() ?? 'A'}',
      location: ws['city']?.toString() ?? 'Location',
      date: startDT,
      startTime: startFmt,
      endTime: endFmt,
      totalAmount: amount,
      bookingRef: ref,
      status: uiStatus,
      rawStatus: raw,
      startDateTime: startDT,
      endDateTime: endDT,
      slots: slots,
    );
  }

  String _mapStatus(String raw, DateTime start, DateTime end) {
    final now = DateTime.now();
    switch (raw) {
      case 'PENDING':
        return 'pending';
      case 'REJECTED':
        return 'rejected';
      case 'CANCELLED':
        return 'cancelled';
      case 'COMPLETED':
        return 'past';
      case 'CONFIRMED':
        if (now.isAfter(end)) return 'past';
        return 'upcoming';
      default:
        return 'past';
    }
  }

  double _parseDouble(dynamic v) {
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0.0;
    return 0.0;
  }

  // ── Schedule 5-min pre-warnings ────────────────────────────────────

  void _scheduleReminders(List<BookingModel> bookings) {
    for (final bk in bookings) {
      if (bk.rawStatus != 'CONFIRMED') continue;
      if (_scheduledReminders.contains(bk.id)) continue;
      _scheduledReminders.add(bk.id);

      final slots =
      bk.slots.isNotEmpty ? bk.slots : [[bk.startDateTime, bk.endDateTime]];

      for (int i = 0; i < slots.length; i++) {
        final slotStart = slots[i][0];
        final reminder = slotStart.subtract(const Duration(minutes: 5));
        NotificationService.instance.scheduleSlotReminder(
          id: '${bk.id}_$i'.hashCode,
          title: '⏰ Your workspace slot starts soon!',
          body:
          'Head to ${bk.spaceName} — your session at ${DateFormat("hh:mm a").format(slotStart)} begins in 5 minutes. Get ready! 🚀',
          scheduledAt: reminder,
        );
      }
    }
  }

  // ── Auto-expire: move CONFIRMED past-end to past bucket ───────────

  void _checkAndAutoExpire() {
    bool changed = false;
    for (int i = 0; i < _bookings.length; i++) {
      final bk = _bookings[i];
      if (bk.rawStatus == 'CONFIRMED' &&
          bk.status == 'upcoming' &&
          bk.isExpired) {
        _bookings[i] = _rebucket(bk, 'past');
        changed = true;
      }
    }
    if (changed && mounted) setState(() {});
  }

  BookingModel _rebucket(BookingModel bk, String newStatus) => BookingModel(
    id: bk.id,
    spaceName: bk.spaceName,
    spaceLocation: bk.spaceLocation,
    spaceImageUrl: bk.spaceImageUrl,
    workspaceName: bk.workspaceName,
    seatId: bk.seatId,
    location: bk.location,
    date: bk.date,
    startTime: bk.startTime,
    endTime: bk.endTime,
    totalAmount: bk.totalAmount,
    bookingRef: bk.bookingRef,
    status: newStatus,
    rawStatus: bk.rawStatus,
    startDateTime: bk.startDateTime,
    endDateTime: bk.endDateTime,
    slots: bk.slots,
  );

  // ── Filters ───────────────────────────────────────────────────────

  List<BookingModel> get _upcoming => _bookings
      .where((b) => b.status == 'upcoming' || b.status == 'pending')
      .toList();

  List<BookingModel> get _past =>
      _bookings.where((b) => b.status == 'past').toList();

  List<BookingModel> get _cancelled => _bookings
      .where((b) => b.status == 'cancelled' || b.status == 'rejected')
      .toList();

  // ── Build ──────────────────────────────────────────────────────────

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
          _NotifBellButton(),
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
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Upcoming'),
                  if (_upcoming.isNotEmpty) ...[
                    const SizedBox(width: 5),
                    _TabBadge(
                        count: _upcoming.length, color: AppColors.primary),
                  ]
                ],
              ),
            ),
            const Tab(text: 'Past'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Cancelled'),
                  if (_cancelled.isNotEmpty) ...[
                    const SizedBox(width: 5),
                    _TabBadge(
                        count: _cancelled.length,
                        color: const Color(0xFFEF4444)),
                  ]
                ],
              ),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(
          child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
        controller: _tabController,
        children: [
          _BookingList(
            bookings: _upcoming,
            tab: 'upcoming',
            tickCount: _tickCount,
            onRefresh: _loadBookings,
            onCancel: _loadBookings,
          ),
          _BookingList(
            bookings: _past,
            tab: 'past',
            tickCount: _tickCount,
            onRefresh: _loadBookings,
          ),
          _BookingList(
            bookings: _cancelled,
            tab: 'cancelled',
            tickCount: _tickCount,
            onRefresh: _loadBookings,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification bell button
// ─────────────────────────────────────────────────────────────────────────────

class _NotifBellButton extends StatefulWidget {
  @override
  State<_NotifBellButton> createState() => _NotifBellButtonState();
}

class _NotifBellButtonState extends State<_NotifBellButton> {
  @override
  void initState() {
    super.initState();
    NotificationService.instance.addListener(_rebuild);
  }

  @override
  void dispose() {
    NotificationService.instance.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final count = NotificationService.instance.unreadCount;
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined,
              color: AppColors.onSurfaceVariant),
          onPressed: () => _showNotifPanel(context),
        ),
        if (count > 0)
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              width: 16,
              height: 16,
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                count > 9 ? '9+' : count.toString(),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800),
              ),
            ),
          ),
      ],
    );
  }

  void _showNotifPanel(BuildContext context) {
    final notifs = NotificationService.instance.notifications;
    final auth = ApiClient.authToken;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _NotifPanel(
        notifs: notifs,
        onMarkAll: auth == null
            ? null
            : () {
          NotificationService.instance.markAllRead(auth);
          Navigator.pop(ctx);
        },
      ),
    );
  }
}

// ── Notification panel ────────────────────────────────────────────────────────

class _NotifPanel extends StatelessWidget {
  final List<Map<String, dynamic>> notifs;
  final VoidCallback? onMarkAll;
  const _NotifPanel({required this.notifs, this.onMarkAll});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 12),
        Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(2))),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
          child: Row(
            children: [
              Text('Notifications',
                  style: GoogleFonts.inter(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w700,
                      fontSize: 17)),
              const Spacer(),
              if (onMarkAll != null)
                TextButton(
                  onPressed: onMarkAll,
                  child: Text('Mark all read',
                      style: GoogleFonts.inter(
                          color: AppColors.primary, fontSize: 12)),
                ),
            ],
          ),
        ),
        const Divider(color: Colors.white10, height: 1),
        SizedBox(
          height: 340,
          child: notifs.isEmpty
              ? Center(
              child: Text('All clear! No new notifications.',
                  style: GoogleFonts.inter(
                      color: AppColors.onSurfaceVariant, fontSize: 13)))
              : ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: notifs.length,
            separatorBuilder: (_, __) =>
            const Divider(color: Colors.white10, height: 1),
            itemBuilder: (_, i) {
              final n = notifs[i];
              final isRead = n['isRead'] == true;
              return ListTile(
                dense: true,
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(_notifIcon(n['type']),
                      style: const TextStyle(fontSize: 16)),
                ),
                title: Text(n['title']?.toString() ?? '',
                    style: GoogleFonts.inter(
                        color: isRead
                            ? AppColors.onSurfaceVariant
                            : AppColors.onSurface,
                        fontWeight: isRead
                            ? FontWeight.w400
                            : FontWeight.w600,
                        fontSize: 12)),
                subtitle: Text(n['body']?.toString() ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11)),
                trailing: isRead
                    ? null
                    : Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle)),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  String _notifIcon(dynamic type) {
    switch (type?.toString()) {
      case 'booking_confirmed':
        return '🎉';
      case 'booking_pending':
        return '⏳';
      case 'booking_cancelled':
        return '❌';
      case 'booking_rejected':
        return '🚫';
      case 'new_booking':
        return '📅';
      case 'payment_success':
        return '💰';
      case 'new_issue':
        return '🔧';
      default:
        return '🔔';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking list per tab
// ─────────────────────────────────────────────────────────────────────────────

class _BookingList extends StatelessWidget {
  final List<BookingModel> bookings;
  final String tab;
  final int tickCount;
  final RefreshCallback? onRefresh;
  final VoidCallback? onCancel;

  const _BookingList({
    required this.bookings,
    required this.tab,
    required this.tickCount,
    this.onRefresh,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return onRefresh != null
          ? RefreshIndicator(
        onRefresh: onRefresh!,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height - 200,
            child: const _EmptyState(),
          ),
        ),
      )
          : const _EmptyState();
    }

    final listView = ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      itemCount: bookings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 14),
      itemBuilder: (_, i) => _BookingCard(
        booking: bookings[i],
        isPastTab: tab == 'past',
        tickCount: tickCount,
        onCancelSuccess: onCancel,
      ),
    );

    return onRefresh != null
        ? RefreshIndicator(onRefresh: onRefresh!, child: listView)
        : listView;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single booking card
// ─────────────────────────────────────────────────────────────────────────────

class _BookingCard extends StatelessWidget {
  final BookingModel booking;
  final bool isPastTab;
  final int tickCount;
  final VoidCallback? onCancelSuccess;

  const _BookingCard({
    required this.booking,
    required this.isPastTab,
    required this.tickCount,
    this.onCancelSuccess,
  });

  @override
  Widget build(BuildContext context) {
    final bk = booking;
    final dateStr = DateFormat('EEE, d MMM yyyy').format(bk.date);
    final isPending = bk.rawStatus == 'PENDING';
    final isConfirmed = bk.rawStatus == 'CONFIRMED';
    final isPreWarning = isConfirmed && bk.isPreWarning;
    final isLive = isConfirmed && bk.isLive;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending
              ? const Color(0xFFF59E0B).withOpacity(0.4)
              : isLive
              ? AppColors.primary.withOpacity(0.35)
              : Colors.white.withOpacity(0.08),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Pending or pre-warning banner ────────────────────────
          if (isPending) _PendingBanner(),
          if (isPreWarning && !isPending) _PreWarningBanner(booking: bk),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Image + info row ─────────────────────────────
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        bk.spaceImageUrl,
                        width: 76,
                        height: 76,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 76,
                          height: 76,
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
                          Row(
                            children: [
                              _RefChip(ref: bk.bookingRef),
                              const Spacer(),
                              _StatusChip(bk: bk),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            bk.spaceName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              color: AppColors.onSurface,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 3),
                          _InfoRow(
                              icon: Icons.location_on_outlined,
                              text: bk.spaceLocation),
                          const SizedBox(height: 3),
                          _InfoRow(
                              icon: Icons.calendar_today_rounded,
                              text: dateStr),
                          const SizedBox(height: 2),
                          _InfoRow(
                              icon: Icons.schedule_rounded,
                              text: '${bk.startTime} – ${bk.endTime}'),
                        ],
                      ),
                    ),
                  ],
                ),

                // ── Seat + amount row ─────────────────────────────
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.chair_outlined,
                        color: AppColors.onSurfaceVariant, size: 13),
                    const SizedBox(width: 4),
                    Text(bk.seatId,
                        style: GoogleFonts.inter(
                            color: AppColors.onSurfaceVariant, fontSize: 11.5)),
                    const Spacer(),
                    Text(
                      '₹${bk.totalAmount.toStringAsFixed(0)}',
                      style: GoogleFonts.inter(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),

                // ── Timer section (only CONFIRMED, not past tab) ──
                if (isConfirmed && !isPastTab && !bk.isExpired) ...[
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white10, height: 1),
                  const SizedBox(height: 12),
                  _TimerSection(booking: bk, tickCount: tickCount),
                ],

                // ── Pending message ───────────────────────────────
                if (isPending) ...[
                  const SizedBox(height: 10),
                  const Divider(color: Colors.white10, height: 1),
                  const SizedBox(height: 10),
                  _PendingMessage(),
                ],

                const SizedBox(height: 12),
                const Divider(color: Colors.white10, height: 1),
                const SizedBox(height: 12),

                // ── Action buttons ────────────────────────────────
                _ActionRow(
                  booking: bk,
                  isPastTab: isPastTab,
                  onCancelSuccess: onCancelSuccess,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending banner (top of card)
// ─────────────────────────────────────────────────────────────────────────────

class _PendingBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      color: const Color(0xFFF59E0B).withOpacity(0.15),
      child: Row(
        children: [
          const Icon(Icons.hourglass_top_rounded,
              color: Color(0xFFF59E0B), size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Manager is reviewing your booking — you\'ll hear back shortly.',
              style: GoogleFonts.inter(
                color: const Color(0xFFF59E0B),
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5-min pre-warning banner
// ─────────────────────────────────────────────────────────────────────────────

class _PreWarningBanner extends StatelessWidget {
  final BookingModel booking;
  const _PreWarningBanner({required this.booking});

  @override
  Widget build(BuildContext context) {
    final nextSlot = booking.nextSlot;
    if (nextSlot == null) return const SizedBox.shrink();
    final diff = nextSlot[0].difference(DateTime.now());
    final secs = diff.inSeconds.clamp(0, 300);
    final mm = (secs ~/ 60).toString().padLeft(2, '0');
    final ss = (secs % 60).toString().padLeft(2, '0');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      color: const Color(0xFF10B981).withOpacity(0.12),
      child: Row(
        children: [
          const Icon(Icons.notifications_active_rounded,
              color: Color(0xFF10B981), size: 15),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Your session begins in  $mm:$ss  — head to the workspace now! 🚀',
              style: GoogleFonts.inter(
                color: const Color(0xFF10B981),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending message block (inside card body)
// ─────────────────────────────────────────────────────────────────────────────

class _PendingMessage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withOpacity(0.07),
        borderRadius: BorderRadius.circular(10),
        border:
        Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What happens next?',
            style: GoogleFonts.inter(
              color: const Color(0xFFF59E0B),
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          _Step(n: '1', text: 'Manager reviews your booking request'),
          _Step(n: '2', text: 'You\'ll get a notification once approved'),
          _Step(
              n: '3', text: 'Your E-Pass unlocks and timer activates'),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final String n;
  final String text;
  const _Step({required this.n, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(n,
                style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFF59E0B))),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                    height: 1.4)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timer section — full slot-aware countdown
// ─────────────────────────────────────────────────────────────────────────────

class _TimerSection extends StatelessWidget {
  final BookingModel booking;
  final int tickCount; // forces rebuild every second from parent

  const _TimerSection({required this.booking, required this.tickCount});

  @override
  Widget build(BuildContext context) {
    final bk = booking;
    final remaining = bk.remainingActiveDuration;
    final isLive = bk.isLive;
    final nextSlot = bk.nextSlot;

    if (!isLive && nextSlot == null) {
      return _timerChip(
          icon: Icons.check_circle_outline_rounded,
          color: const Color(0xFF10B981),
          label: 'Session Complete',
          value: 'Expired');
    }

    if (!isLive && nextSlot != null) {
      // Between slots — show countdown to next slot start
      final toNext = nextSlot[0].difference(DateTime.now());
      if (toNext.isNegative) return const SizedBox.shrink();
      return _timerChip(
          icon: Icons.schedule_rounded,
          color: const Color(0xFFF59E0B),
          label: 'Next slot starts in',
          value: _formatDuration(toNext));
    }

    // Live — show remaining active time
    final totalSecs = remaining.inSeconds;
    final hrs = totalSecs ~/ 3600;
    final mins = (totalSecs % 3600) ~/ 60;
    final secs = totalSecs % 60;

    String display;
    if (hrs > 0) {
      display =
      '${hrs}h ${mins.toString().padLeft(2, '0')}m ${secs.toString().padLeft(2, '0')}s';
    } else {
      display =
      '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.12),
            AppColors.primaryContainer.withOpacity(0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.play_circle_fill_rounded,
                color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SESSION IN PROGRESS',
                  style: GoogleFonts.inter(
                    color: AppColors.primary,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  display,
                  style: GoogleFonts.inter(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
          Text(
            'remaining',
            style: GoogleFonts.inter(
                color: AppColors.onSurfaceVariant, fontSize: 11),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    if (h > 0) return '${h}h ${m.toString().padLeft(2, '0')}m';
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Widget _timerChip({
    required IconData icon,
    required Color color,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: GoogleFonts.inter(
                      color: AppColors.onSurfaceVariant, fontSize: 10)),
              Text(value,
                  style: GoogleFonts.inter(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 15)),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action row
// ─────────────────────────────────────────────────────────────────────────────

class _ActionRow extends StatelessWidget {
  final BookingModel booking;
  final bool isPastTab;
  final VoidCallback? onCancelSuccess;

  const _ActionRow({
    required this.booking,
    required this.isPastTab,
    this.onCancelSuccess,
  });

  @override
  Widget build(BuildContext context) {
    final bk = booking;
    final isPending = bk.rawStatus == 'PENDING';
    final isConfirmed = bk.rawStatus == 'CONFIRMED';
    final canCancel = isPending || (isConfirmed && !bk.isExpired);

    if (isPastTab) {
      return _ActionBtn(
        icon: Icons.history_rounded,
        label: 'View Details',
        fgColor: AppColors.onSurfaceVariant,
        borderColor: AppColors.outlineVariant.withOpacity(0.4),
        onPressed: () => _showDetails(context, bk),
      );
    }

    if (isPending) {
      return Row(
        children: [
          if (canCancel)
            Expanded(
              child: _ActionBtn(
                icon: Icons.cancel_outlined,
                label: 'Cancel Request',
                fgColor: const Color(0xFFEF4444),
                borderColor: const Color(0xFFEF4444).withOpacity(0.4),
                onPressed: () => _confirmCancel(context),
              ),
            ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: _ActionBtn(
            icon: Icons.qr_code_rounded,
            label: 'E-Pass',
            fgColor: AppColors.primary,
            borderColor: AppColors.primary.withOpacity(0.4),
            onPressed: () => _openEPass(context, bk),
          ),
        ),
        if (canCancel) ...[
          const SizedBox(width: 10),
          Expanded(
            child: _ActionBtn(
              icon: Icons.cancel_outlined,
              label: 'Cancel',
              fgColor: const Color(0xFFEF4444),
              borderColor: const Color(0xFFEF4444).withOpacity(0.4),
              onPressed: () => _confirmCancel(context),
            ),
          ),
        ],
      ],
    );
  }

  void _openEPass(BuildContext context, BookingModel bk) {
    Future.microtask(() {
      if (context.mounted) {
        context.push('/confirmation', extra: {
          'spaceName': bk.spaceName,
          'bookingRef': bk.bookingRef,
          'date': DateFormat('d MMM yyyy').format(bk.date),
          'startTime': bk.startTime,
          'endTime': bk.endTime,
          'seatId': bk.seatId,
          'location': bk.spaceLocation,
          'totalAmount': bk.totalAmount,
        });
      }
    });
  }

  void _showDetails(BuildContext context, BookingModel bk) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceContainer,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(bk.spaceName,
                style: GoogleFonts.inter(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 17)),
            const SizedBox(height: 12),
            _DetailRow('Booking Ref', bk.bookingRef),
            _DetailRow(
                'Date', DateFormat('EEE, d MMM yyyy').format(bk.date)),
            _DetailRow('Time', '${bk.startTime} – ${bk.endTime}'),
            _DetailRow('Seat', bk.seatId),
            _DetailRow(
                'Amount', '₹${bk.totalAmount.toStringAsFixed(0)}'),
            _DetailRow('Status', bk.rawStatus),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _DetailRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Text('$label: ',
            style: GoogleFonts.inter(
                color: AppColors.onSurfaceVariant, fontSize: 12)),
        Text(value,
            style: GoogleFonts.inter(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w600,
                fontSize: 12)),
      ],
    ),
  );

  void _confirmCancel(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceContainer,
        title: Text('Cancel Booking?',
            style: GoogleFonts.inter(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w700)),
        content: Text(
            booking.rawStatus == 'PENDING'
                ? 'Your pending request will be withdrawn.'
                : 'You\'ll receive an 85% refund within 3-5 business days.',
            style: GoogleFonts.inter(
                color: AppColors.onSurfaceVariant, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Keep',
                style: GoogleFonts.inter(color: AppColors.primary)),
          ),
          TextButton(
            onPressed: () async {
              final nav = Navigator.of(ctx);
              final messenger = ScaffoldMessenger.of(context);
              nav.pop();
              final token = ApiClient.authToken;
              if (token == null) return;
              messenger.showSnackBar(
                  const SnackBar(content: Text('Cancelling...')));
              final ok =
              await ApiClient.cancelBooking(booking.id, token);
              if (ok) {
                messenger.showSnackBar(
                    const SnackBar(content: Text('Booking cancelled.')));
                onCancelSuccess?.call();
              } else {
                messenger.showSnackBar(const SnackBar(
                    content: Text('Failed to cancel.')));
              }
            },
            child: Text('Cancel Booking',
                style: GoogleFonts.inter(
                    color: const Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color fgColor;
  final Color borderColor;
  final VoidCallback onPressed;

  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.fgColor,
    required this.borderColor,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 14),
        label: Text(label,
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w600, fontSize: 12)),
        style: OutlinedButton.styleFrom(
          foregroundColor: fgColor,
          side: BorderSide(color: borderColor),
          padding: const EdgeInsets.symmetric(vertical: 9),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10)),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          minimumSize: const Size(0, 0),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final BookingModel bk;
  const _StatusChip({required this.bk});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (bk.rawStatus) {
      case 'PENDING':
        color = const Color(0xFFF59E0B);
        label = 'Pending Review';
        break;
      case 'CONFIRMED':
        color = bk.isLive ? const Color(0xFF10B981) : AppColors.primary;
        label = bk.isLive ? 'Live' : 'Confirmed';
        break;
      case 'CANCELLED':
        color = const Color(0xFFEF4444);
        label = 'Cancelled';
        break;
      case 'REJECTED':
        color = const Color(0xFFEF4444);
        label = 'Rejected';
        break;
      case 'COMPLETED':
        color = AppColors.onSurfaceVariant;
        label = 'Completed';
        break;
      default:
        color = AppColors.onSurfaceVariant;
        label = bk.rawStatus;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.13),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: GoogleFonts.inter(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 10)),
    );
  }
}

class _RefChip extends StatelessWidget {
  final String ref;
  const _RefChip({required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(ref,
          style: GoogleFonts.inter(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
              fontSize: 10,
              letterSpacing: 0.5)),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.onSurfaceVariant, size: 11),
        const SizedBox(width: 4),
        Expanded(
          child: Text(text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant, fontSize: 11.5)),
        ),
      ],
    );
  }
}

class _TabBadge extends StatelessWidget {
  final int count;
  final Color color;
  const _TabBadge({required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(10)),
      child: Text(count.toString(),
          style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w800)),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_outlined,
              color: AppColors.onSurfaceVariant, size: 54),
          const SizedBox(height: 16),
          Text('No bookings here',
              style: GoogleFonts.inter(
                  color: AppColors.onSurface,
                  fontWeight: FontWeight.w600,
                  fontSize: 18)),
          const SizedBox(height: 8),
          Text('Find and book your perfect workspace',
              style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant, fontSize: 14)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go('/space-types'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                  horizontal: 28, vertical: 13),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Browse Spaces',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}