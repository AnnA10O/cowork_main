
// WorkspaceModel — describes a bookable workspace location
class WorkspaceModel {
  final String id;
  final String name;
  final String location;
  final String imageUrl;
  final double rating;
  final int reviewCount;
  final double pricePerHour;
  final double? pricePerDay;
  final String type; // 'desk', 'cabin', 'meeting', 'lounge'
  final List<String> amenities;
  final AvailabilityStatus status;
  final bool isPremium;
  final String? badge;
  final String description;

  const WorkspaceModel({
    required this.id,
    required this.name,
    required this.location,
    required this.imageUrl,
    required this.rating,
    required this.reviewCount,
    required this.pricePerHour,
    this.pricePerDay,
    required this.type,
    required this.amenities,
    required this.status,
    this.isPremium = false,
    this.badge,
    this.description = '',
  });
}

enum AvailabilityStatus { available, fillingFast, occupied }

// SeatModel — a single bookable seat option (used for legacy compatibility)
class SeatModel {
  final String id;
  final String label;
  final String type;
  final double price;
  final AvailabilityStatus status;
  final List<String> perks;
  final String imageUrl;

  const SeatModel({
    required this.id,
    required this.label,
    required this.type,
    required this.price,
    required this.status,
    required this.perks,
    required this.imageUrl,
  });
}