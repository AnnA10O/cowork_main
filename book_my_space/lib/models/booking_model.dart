class BookingModel {
  final String id;
  final String spaceName;
  final String spaceLocation;
  final String spaceImageUrl;
  final String workspaceName;
  final String seatId;
  final String location;
  final DateTime date;
  final String startTime;
  final String endTime;
  final double totalAmount;
  final String bookingRef;

  /// UI bucket: 'upcoming' | 'past' | 'cancelled' | 'pending' | 'rejected'
  final String status;

  /// Raw backend status: PENDING | CONFIRMED | COMPLETED | CANCELLED | REJECTED
  final String rawStatus;

  /// Parsed DateTime for timer math
  final DateTime startDateTime;
  final DateTime endDateTime;

  /// Merged continuous slots [[start,end],[start,end],...]
  /// If a booking has [8-9] and [9-10] they merge into [[8,10]].
  /// If non-continuous: [[8,9],[10,11]].
  final List<List<DateTime>> slots;

  const BookingModel({
    required this.id,
    required this.spaceName,
    required this.spaceLocation,
    required this.spaceImageUrl,
    required this.workspaceName,
    required this.seatId,
    required this.location,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.totalAmount,
    required this.bookingRef,
    required this.status,
    required this.rawStatus,
    required this.startDateTime,
    required this.endDateTime,
    this.slots = const [],
  });

  // ── Helpers ──────────────────────────────────────────────────────

  List<List<DateTime>> get _effectiveSlots =>
      slots.isNotEmpty ? slots : [[startDateTime, endDateTime]];

  /// true when booking is CONFIRMED and we are inside any slot window
  bool get isLive {
    if (rawStatus != 'CONFIRMED') return false;
    final now = DateTime.now();
    return _effectiveSlots.any((s) => now.isAfter(s[0]) && now.isBefore(s[1]));
  }

  /// true 5 min before the FIRST slot that hasn't started yet
  bool get isPreWarning {
    if (rawStatus != 'CONFIRMED') return false;
    final upcoming = nextSlot;
    if (upcoming == null) return false;
    final now = DateTime.now();
    final fiveBefore = upcoming[0].subtract(const Duration(minutes: 5));
    return now.isAfter(fiveBefore) && now.isBefore(upcoming[0]);
  }

  bool get isExpired => DateTime.now().isAfter(endDateTime);

  Duration get totalActiveDuration {
    Duration total = Duration.zero;
    for (final s in _effectiveSlots) {
      total += s[1].difference(s[0]);
    }
    return total;
  }

  /// Active time remaining right now (only counts current + future slot time)
  Duration get remainingActiveDuration {
    if (rawStatus != 'CONFIRMED') return Duration.zero;
    final now = DateTime.now();
    Duration remaining = Duration.zero;
    for (final s in _effectiveSlots) {
      if (now.isBefore(s[0])) {
        remaining += s[1].difference(s[0]);
      } else if (now.isBefore(s[1])) {
        remaining += s[1].difference(now);
      }
    }
    return remaining;
  }

  /// The slot currently active (now inside [start, end])
  List<DateTime>? get currentSlot {
    if (rawStatus != 'CONFIRMED') return null;
    final now = DateTime.now();
    for (final s in _effectiveSlots) {
      if (now.isAfter(s[0]) && now.isBefore(s[1])) return s;
    }
    return null;
  }

  /// Next upcoming slot that hasn't started
  List<DateTime>? get nextSlot {
    if (rawStatus != 'CONFIRMED') return null;
    final now = DateTime.now();
    for (final s in _effectiveSlots) {
      if (now.isBefore(s[0])) return s;
    }
    return null;
  }

  /// Whether the timer should be shown (CONFIRMED + not yet fully expired)
  bool get shouldShowTimer =>
      rawStatus == 'CONFIRMED' && !isExpired;
}