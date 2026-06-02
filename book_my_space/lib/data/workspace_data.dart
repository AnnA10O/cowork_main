import '../theme/app_colors.dart';
import 'package:flutter/material.dart';

// ---------------------------------------------------------------------------
// Seat option — a single bookable option inside a category
// ---------------------------------------------------------------------------
class SeatOption {
  final String id;
  final String label;
  final double price; // per hour
  final String status; // 'available' | 'filling_fast' | 'occupied'
  final Color statusColor;
  final List<String> perks;
  final String imageUrl;
  // Seat type for filter chips — one of: 'shared_desk' | 'dedicated_desk' |
  // 'private_cabin' | 'team_space' | 'meeting_room'
  final String seatType;
  final int availableCount;
  final int totalCount;

  const SeatOption({
    required this.id,
    required this.label,
    required this.price,
    required this.status,
    required this.statusColor,
    required this.perks,
    required this.imageUrl,
    required this.seatType,
    this.availableCount = 0,
    this.totalCount = 0,
  });

  String get priceLabel => '₹${price.toInt()}';
}

// ---------------------------------------------------------------------------
// Seat category — a grouping of seat options (e.g. "Lounge Area")
// ---------------------------------------------------------------------------
class SeatCategory {
  final String id;
  final String label;
  final IconData icon;
  final String description;
  final List<SeatOption> options;

  const SeatCategory({
    required this.id,
    required this.label,
    required this.icon,
    required this.description,
    required this.options,
  });
}

// ---------------------------------------------------------------------------
// Space info — full detail record for a workspace
// ---------------------------------------------------------------------------
class SpaceInfo {
  final String id;
  final String name;
  final String subtitle;
  final String imageUrl;
  final double rating;
  final int reviews;
  final double startingPrice;
  final String priceLabel;
  final String description;
  final List<Map<String, dynamic>> amenities; // {icon: IconData, label: String}
  final String? badge;
  final bool showSchedulePicker; // false for FMCIII-style (seat-selection flow)
  final List<SeatCategory> seatCategories;

  const SpaceInfo({
    required this.id,
    required this.name,
    required this.subtitle,
    required this.imageUrl,
    required this.rating,
    required this.reviews,
    required this.startingPrice,
    required this.priceLabel,
    required this.description,
    required this.amenities,
    this.badge,
    required this.showSchedulePicker,
    required this.seatCategories,
  });
}

// ---------------------------------------------------------------------------
// WorkspaceDataService — single source of truth
// ---------------------------------------------------------------------------
class WorkspaceDataService {
  WorkspaceDataService._();

  static const _fmciiiCategories = [
    SeatCategory(
      id: 'lounge',
      label: 'Lounge Area',
      icon: Icons.weekend,
      description: 'Relaxed seating with panoramic views',
      options: [
        SeatOption(
          id: 'window_lounge',
          label: 'Window Lounge',
          price: 55,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['Panoramic View', 'Extra Privacy', 'Priority Service'],
          imageUrl:
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        ),
        SeatOption(
          id: 'center_lounge',
          label: 'Center Lounge',
          price: 40,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          seatType: 'shared_desk',
          perks: ['Aisle Access', 'Social Zone', 'Shared Table'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'meeting_pod',
      label: 'Meeting Pod',
      icon: Icons.meeting_room,
      description: 'Sound-dampened pods for focused sessions',
      options: [
        SeatOption(
          id: 'pod_4',
          label: 'Pod for 4',
          price: 80,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'meeting_room',
          perks: ['4K Screen', 'Whiteboard', 'Soundproof'],
          imageUrl:
          'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=800&q=80',
        ),
        SeatOption(
          id: 'pod_2',
          label: 'Pod for 2',
          price: 50,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'meeting_room',
          perks: ['HD Screen', 'Quiet Zone', 'Ergonomic Chairs'],
          imageUrl:
          'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'executive_desk',
      label: 'Executive Desk',
      icon: Icons.desktop_windows,
      description: 'Premium dedicated desks with full amenities',
      options: [
        SeatOption(
          id: 'exec_window',
          label: 'Window Executive',
          price: 65,
          status: 'occupied',
          statusColor: AppColors.occupied,
          seatType: 'dedicated_desk',
          perks: ['City View', 'Dual Monitor', 'Dedicated Locker'],
          imageUrl:
          'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80',
        ),
        SeatOption(
          id: 'exec_standard',
          label: 'Standard Executive',
          price: 45,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'dedicated_desk',
          perks: ['Single Monitor', 'Power Strip', 'Ergonomic Chair'],
          imageUrl:
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'private_cabin',
      label: 'Private Cabin',
      icon: Icons.lock_outline,
      description: 'Fully enclosed private workspaces',
      options: [
        SeatOption(
          id: 'cabin_a',
          label: 'Cabin A — Solo',
          price: 90,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'private_cabin',
          perks: ['Lock & Key', 'Dual Monitor', 'Private Line'],
          imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
        ),
        SeatOption(
          id: 'cabin_b',
          label: 'Cabin B — Duo',
          price: 120,
          status: 'occupied',
          statusColor: AppColors.occupied,
          seatType: 'private_cabin',
          perks: ['Seated for 2', 'Whiteboard', 'Soundproof'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'team_space',
      label: 'Team Space',
      icon: Icons.groups_outlined,
      description: 'Open collaborative zone for small teams',
      options: [
        SeatOption(
          id: 'team_alpha',
          label: 'Alpha Zone (4–6)',
          price: 160,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'team_space',
          perks: ['Projector', 'Breakout Area', 'Standing Desks'],
          imageUrl:
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
        ),
        SeatOption(
          id: 'team_beta',
          label: 'Beta Zone (2–4)',
          price: 100,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          seatType: 'team_space',
          perks: ['HD Screen', 'Collaboration Wall', 'Coffee Station'],
          imageUrl:
          'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
        ),
      ],
    ),
  ];


  static const _glassHouseCategories = [
    SeatCategory(
      id: 'private_office',
      label: 'Private Office',
      icon: Icons.business_center,
      description: 'Fully enclosed glass offices for teams',
      options: [
        SeatOption(
          id: 'office_6',
          label: 'Team Office (6)',
          price: 240,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'team_space',
          perks: ['Whiteboard Wall', 'Video Conf', 'Locker Room'],
          imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
        ),
        SeatOption(
          id: 'office_4',
          label: 'Small Office (4)',
          price: 180,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          seatType: 'team_space',
          perks: ['HD Screen', 'Private Entry', 'Climate Control'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'hot_desk',
      label: 'Hot Desk',
      icon: Icons.computer,
      description: 'Flexible desks in shared open area',
      options: [
        SeatOption(
          id: 'window_desk',
          label: 'Window Desk',
          price: 35,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'dedicated_desk',
          perks: ['Natural Light', 'USB-C Dock', 'Sit-Stand'],
          imageUrl:
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
        ),
        SeatOption(
          id: 'standard_desk',
          label: 'Standard Desk',
          price: 25,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['Power Strip', 'Fast WiFi', 'Ergonomic'],
          imageUrl:
          'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
        ),
      ],
    ),
  ];

  static const _hiveSohoCategories = [
    SeatCategory(
      id: 'creative_bench',
      label: 'Creative Bench',
      icon: Icons.brush,
      description: 'Open benches ideal for creatives',
      options: [
        SeatOption(
          id: 'bench_front',
          label: 'Front Row Bench',
          price: 18,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['Natural Light', 'Inspiration Wall', 'Fast WiFi'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
        ),
        SeatOption(
          id: 'bench_back',
          label: 'Back Row Bench',
          price: 12,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['Quiet Corner', 'Standing Option', 'Power Points'],
          imageUrl:
          'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'focus_booth',
      label: 'Focus Booth',
      icon: Icons.headset_mic,
      description: 'Semi-private booths for deep work',
      options: [
        SeatOption(
          id: 'solo_booth',
          label: 'Solo Booth',
          price: 22,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          seatType: 'private_cabin',
          perks: ['Acoustic Panels', 'Monitor Mount', 'Task Lighting'],
          imageUrl:
          'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
        ),
      ],
    ),
  ];

  static const _theDeckCategories = [
    SeatCategory(
      id: 'open_plan',
      label: 'Open Plan',
      icon: Icons.table_chart,
      description: 'Airy open workspace with rooftop views',
      options: [
        SeatOption(
          id: 'rooftop_desk',
          label: 'Rooftop Desk',
          price: 20,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          seatType: 'shared_desk',
          perks: ['Outdoor View', 'Fresh Air Zone', 'Power Rail'],
          imageUrl:
          'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800&q=80',
        ),
        SeatOption(
          id: 'interior_desk',
          label: 'Interior Desk',
          price: 15,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['AC Zone', 'Quiet Area', 'Ergonomic Chair'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'cabin',
      label: 'Private Cabin',
      icon: Icons.cabin,
      description: 'Enclosed cabins for privacy',
      options: [
        SeatOption(
          id: 'cabin_std',
          label: 'Standard Cabin',
          price: 45,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'private_cabin',
          perks: ['Lock & Key', 'Dedicated Line', 'Whiteboard'],
          imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
        ),
      ],
    ),
  ];

  static const _atlasLabsCategories = [
    SeatCategory(
      id: 'innovation_desk',
      label: 'Innovation Desk',
      icon: Icons.lightbulb_outline,
      description: 'Collaborative desks for builders',
      options: [
        SeatOption(
          id: 'maker_desk',
          label: 'Maker Desk',
          price: 15,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'dedicated_desk',
          perks: ['3D Printer Access', 'Tool Bench', 'Fast WiFi'],
          imageUrl:
          'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
        ),
        SeatOption(
          id: 'collab_desk',
          label: 'Collab Desk',
          price: 10,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'shared_desk',
          perks: ['Whiteboard Nearby', 'Open Space', 'Standing Desk'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
        ),
      ],
    ),
  ];

  static const _vaultPrimeCategories = [
    SeatCategory(
      id: 'boardroom',
      label: 'Boardroom',
      icon: Icons.groups,
      description: 'Executive boardroom for leadership meetings',
      options: [
        SeatOption(
          id: 'full_board',
          label: 'Full Boardroom (12)',
          price: 300,
          status: 'occupied',
          statusColor: AppColors.occupied,
          seatType: 'meeting_room',
          perks: ['4K Projector', 'Video Bridge', 'Catering Service'],
          imageUrl:
          'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80',
        ),
        SeatOption(
          id: 'half_board',
          label: 'Half Boardroom (6)',
          price: 180,
          status: 'occupied',
          statusColor: AppColors.occupied,
          seatType: 'meeting_room',
          perks: ['HD Screen', 'Whiteboard', 'Tea Service'],
          imageUrl:
          'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
        ),
      ],
    ),
    SeatCategory(
      id: 'meeting_room',
      label: 'Meeting Room',
      icon: Icons.meeting_room,
      description: 'Smaller meeting rooms for up to 4',
      options: [
        SeatOption(
          id: 'room_a',
          label: 'Room A',
          price: 80,
          status: 'available',
          statusColor: AppColors.available,
          seatType: 'meeting_room',
          perks: ['HD Screen', 'Conference Phone', 'Natural Light'],
          imageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        ),
      ],
    ),
  ];

  // Default fallback categories for any unlisted space
  static List<SeatCategory> _defaultCategories(String spaceName) => [
    SeatCategory(
      id: 'standard',
      label: 'Standard Seat',
      icon: Icons.chair,
      description: 'Comfortable working seats',
      options: [
        SeatOption(
          id: 'standard_a',
          label: '$spaceName — Seat A',
          price: 30,
          status: 'available',
          statusColor: AppColors.available,
          perks: ['WiFi', 'Power', 'Coffee'],
          seatType: 'standard',
          imageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        ),
        SeatOption(
          id: 'standard_b',
          label: '$spaceName — Seat B',
          price: 20,
          status: 'filling_fast',
          statusColor: AppColors.fillingFast,
          perks: ['WiFi', 'Shared Desk'],
          seatType: 'standard',
          imageUrl:
          'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
        ),
      ],
    ),
  ];

  static const _spaces = <String, SpaceInfo>{
    'fmciii': SpaceInfo(
      id: 'fmciii',
      name: 'FMCIII',
      subtitle: 'Executive Lounge • BKC, Mumbai',
      imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      rating: 4.9,
      reviews: 128,
      startingPrice: 40,
      priceLabel: '/ hour',
      description:
      'FMCIII is a meticulously engineered workspace designed for the high-performing professional. Blending modern corporate reliability with an atmosphere of quiet luxury, this environment features sound-dampened meeting pods, ergonomic workstations, and panoramic views of the Mumbai skyline.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'Gigabit Fiber'},
        {'icon': Icons.coffee, 'label': 'Artisan Café'},
        {'icon': Icons.print, 'label': 'Secure Print'},
        {'icon': Icons.videocam, 'label': '4K VC Pods'},
      ],
      badge: 'PREMIUM PARTNER',
      showSchedulePicker: false,
      seatCategories: _fmciiiCategories,
    ),
    'glass_house': SpaceInfo(
      id: 'glass_house',
      name: 'The Glass House',
      subtitle: 'Private Office • 4-6 People • 2nd Floor',
      imageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
      rating: 4.9,
      reviews: 120,
      startingPrice: 180,
      priceLabel: '/ hour',
      description:
      'Designed for high-performance teams, The Glass House offers a seamless blend of transparency and privacy. Situated on the 2nd floor of one of BKC\'s premier office towers, it provides sweeping views of the atrium while maintaining soundproof integrity for your most critical strategy sessions.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'High-speed WiFi'},
        {'icon': Icons.ac_unit, 'label': 'Climate Control'},
        {'icon': Icons.print, 'label': 'Smart Printing'},
        {'icon': Icons.local_parking, 'label': 'On-site Parking'},
      ],
      showSchedulePicker: false,
      seatCategories: _glassHouseCategories,
    ),
    'hive_soho': SpaceInfo(
      id: 'hive_soho',
      name: 'Hive CP',
      subtitle: 'Creative Cowork • Connaught Place, Delhi',
      imageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
      rating: 4.8,
      reviews: 95,
      startingPrice: 12,
      priceLabel: '/ hr',
      description:
      'Hive CP is a vibrant creative co-working studio nestled in the heart of Connaught Place. With exposed brick walls, industrial lighting, and an energetic community of freelancers and entrepreneurs, it is the ideal place to spark creativity and connect with like-minded professionals.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'Super-fast WiFi'},
        {'icon': Icons.coffee, 'label': 'Coffee Bar'},
        {'icon': Icons.event, 'label': 'Community Events'},
        {'icon': Icons.print, 'label': 'Print Station'},
      ],
      showSchedulePicker: false,
      seatCategories: _hiveSohoCategories,
    ),
    'the_deck': SpaceInfo(
      id: 'the_deck',
      name: 'The Deck Co-Work',
      subtitle: 'Rooftop Workspace • Koramangala, Bengaluru',
      imageUrl:
      'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=1200&q=80',
      rating: 4.9,
      reviews: 87,
      startingPrice: 15,
      priceLabel: '/ hr',
      description:
      'The Deck offers a one-of-a-kind rooftop co-working experience in the heart of Koramangala. With open-air seating, unobstructed city views, and a buzzing atmosphere, it is designed for those who work best when inspired by their surroundings.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'Fast WiFi'},
        {'icon': Icons.wb_sunny, 'label': 'Rooftop Access'},
        {'icon': Icons.coffee, 'label': 'Coffee Kiosk'},
        {'icon': Icons.print, 'label': 'Print Zone'},
      ],
      showSchedulePicker: false,
      seatCategories: _theDeckCategories,
    ),
    'atlas_labs': SpaceInfo(
      id: 'atlas_labs',
      name: 'Atlas Labs',
      subtitle: 'Innovation Hub • Whitefield, Bengaluru',
      imageUrl:
      'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1200&q=80',
      rating: 4.7,
      reviews: 62,
      startingPrice: 10,
      priceLabel: '/ hr',
      description:
      'Atlas Labs is an innovation-first co-working space for technologists, makers, and entrepreneurs. Equipped with prototyping tools, 3D printers, and collaborative open desks, it is where the next generation of products are built.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'Gigabit WiFi'},
        {'icon': Icons.coffee, 'label': 'Coffee Lounge'},
        {'icon': Icons.build, 'label': 'Maker Tools'},
        {'icon': Icons.print, 'label': '3D Printing'},
      ],
      showSchedulePicker: false,
      seatCategories: _atlasLabsCategories,
    ),
    'vault_prime': SpaceInfo(
      id: 'vault_prime',
      name: 'Vault Prime Suite',
      subtitle: 'Executive Meetings • Nariman Point, Mumbai',
      imageUrl:
      'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=80',
      rating: 5.0,
      reviews: 44,
      startingPrice: 80,
      priceLabel: '/ session',
      description:
      'Vault Prime Suite delivers an uncompromising meeting experience at the prestigious Nariman Point, Mumbai. With premium furnishings, state-of-the-art AV, and a dedicated concierge, every session feels like a boardroom that means business.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'Gigabit Fiber'},
        {'icon': Icons.coffee, 'label': 'Concierge Service'},
        {'icon': Icons.videocam, 'label': '4K Conferencing'},
        {'icon': Icons.local_parking, 'label': 'Valet Parking'},
      ],
      showSchedulePicker: false,
      seatCategories: _vaultPrimeCategories,
    ),
  };

  /// Returns the [SpaceInfo] for [spaceId], or a generated fallback.
  static SpaceInfo getSpace(String spaceId) {
    if (_spaces.containsKey(spaceId)) {
      return _spaces[spaceId]!;
    }
    // Fallback for unknown space IDs
    final name = spaceId
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : w)
        .join(' ');
    return SpaceInfo(
      id: spaceId,
      name: name,
      subtitle: 'Co-working Space • India',
      imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      rating: 4.5,
      reviews: 30,
      startingPrice: 20,
      priceLabel: '/ hr',
      description:
      'A modern, fully-equipped co-working space designed to help you do your best work in a comfortable and productive environment.',
      amenities: [
        {'icon': Icons.wifi, 'label': 'High-speed WiFi'},
        {'icon': Icons.coffee, 'label': 'Coffee Bar'},
        {'icon': Icons.print, 'label': 'Printing'},
        {'icon': Icons.ac_unit, 'label': 'Climate Control'},
      ],
      showSchedulePicker: false,
      seatCategories: _defaultCategories(name),
    );
  }
}