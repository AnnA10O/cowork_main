import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/glass_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedCategory = 0;
  final _categories = [
    {'label': 'Hot Desks',      'type': 'hot_desk'},
    {'label': 'Cabins',         'type': 'private_cabin'},
    {'label': 'Meeting Rooms',  'type': 'meeting_room'},
    {'label': 'Event Halls',    'type': 'event_hall'},
    {'label': 'Virtual Office', 'type': 'virtual_office'},
  ];

  final _spaces = [
    {
      'name': 'FMCIII',
      'location': 'Canary Wharf',
      'price': '£45/day',
      'status': AvailabilityStatus.available,
      'image': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
      'id': 'fmciii',
    },
    {
      'name': 'The Foundry',
      'location': 'Shoreditch',
      'price': '\$15/hr',
      'status': AvailabilityStatus.available,
      'image': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
      'id': 'foundry',
    },
    {
      'name': 'Canvas Hub',
      'location': 'Soho',
      'price': '\$25/hr',
      'status': AvailabilityStatus.fillingFast,
      'image': 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800&q=80',
      'id': 'canvas_hub',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          SliverToBoxAdapter(child: _buildHeroCarousel()),
          SliverToBoxAdapter(child: _buildCategoryTabs()),
          SliverToBoxAdapter(child: _buildAvailableSection()),
          SliverToBoxAdapter(child: _buildRecommendedSection()),
          SliverToBoxAdapter(child: _buildEventsSection()),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.background,
      elevation: 0,
      titleSpacing: 20,
      title: Row(
        children: [
          const Icon(Icons.location_on, color: AppColors.primary, size: 20),
          const SizedBox(width: 6),
          Text(
            'London',
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.search, color: AppColors.onSurfaceVariant),
          onPressed: () => context.go('/spaces'),
        ),
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: AppColors.onSurfaceVariant),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildHeroCarousel() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceContainerHigh),
              ),
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Color(0xDD051424)],
                  ),
                ),
              ),
              Positioned(
                bottom: 24,
                left: 24,
                right: 24,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Modern Workspaces',
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Premium environments designed for peak productivity.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              // Dots
              Positioned(
                bottom: 16,
                right: 24,
                child: Row(
                  children: [
                    Container(width: 24, height: 4, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(width: 4),
                    Container(width: 8, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.3), borderRadius: BorderRadius.circular(4))),
                    const SizedBox(width: 4),
                    Container(width: 8, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.3), borderRadius: BorderRadius.circular(4))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        children: _categories.asMap().entries.map((entry) {
          final i = entry.key;
          final cat = entry.value as Map<String, String>;
          final isSelected = _selectedCategory == i;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                setState(() => _selectedCategory = i);
                context.go('/spaces?type=${cat['type']}');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primaryContainer : AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  cat['label']!,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? AppColors.onPrimaryContainer : AppColors.onSurfaceVariant,
                    letterSpacing: 0.05,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAvailableSection() {
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Available Now',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/space-types'),
                  child: Text(
                    'SEE ALL',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      letterSpacing: 0.05,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 300,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _spaces.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, i) {
                final space = _spaces[i];
                return GestureDetector(
                  onTap: () => context.push('/space/${space['id']}'),
                  child: _WhiteSpaceCard(space: space),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendedSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recommended for You',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          _RecommendedItem(
            name: "Kings Cross Studio",
            subtitle: "Private Desk • 2km away",
            rating: "4.8",
            price: "\$12/hr",
            imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80',
            onTap: () => context.push('/space/glass_house'),
          ),
          const SizedBox(height: 12),
          _RecommendedItem(
            name: "The Hive London",
            subtitle: "Meeting Pod • 0.5km away",
            rating: "4.9",
            price: "\$30/hr",
            imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&q=80',
            onTap: () => context.push('/space/hive_soho'),
          ),
        ],
      ),
    );
  }

  Widget _buildEventsSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Upcoming Events',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.tertiaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Stack(
              children: [
                Positioned(
                  right: -24,
                  top: -24,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.event, size: 18, color: AppColors.onTertiaryContainer),
                        const SizedBox(width: 6),
                        Text(
                          'SEP 24 • 18:30 PM',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.05,
                            color: AppColors.onTertiaryContainer,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Start-up Networking',
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onTertiaryContainer,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Connect with 50+ founders at The Foundry Hub.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.onTertiaryContainer.withOpacity(0.9),
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.onTertiaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'JOIN NOW',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.tertiaryContainer,
                        ),
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
}

class _WhiteSpaceCard extends StatelessWidget {
  final Map<String, dynamic> space;
  const _WhiteSpaceCard({required this.space});

  @override
  Widget build(BuildContext context) {
    final status = space['status'] as AvailabilityStatus;
    Color dotColor;
    switch (status) {
      case AvailabilityStatus.available: dotColor = AppColors.available;
      case AvailabilityStatus.fillingFast: dotColor = AppColors.fillingFast;
      case AvailabilityStatus.occupied: dotColor = AppColors.occupied;
    }

    return SizedBox(
      width: 240,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 30,
              offset: const Offset(0, 15),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            SizedBox(
              height: 160,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      space['image'] as String,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceContainerHigh),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          space['price'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onPrimary,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: dotColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          space['name'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF1A1A1A),
                          ),
                        ),
                      ),
                      const Icon(Icons.arrow_forward, color: AppColors.primaryContainer, size: 20),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14, color: Color(0xFF1A1A1A)),
                      const SizedBox(width: 2),
                      Text(
                        space['location'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF1A1A1A),
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    children: (space['id'] == 'fmciii'
                        ? ['Premium', 'Lounge']
                        : ['WiFi', 'AC'])
                        .map((tag) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainer,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        tag.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.05,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ))
                        .toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecommendedItem extends StatelessWidget {
  final String name;
  final String subtitle;
  final String rating;
  final String price;
  final String imageUrl;
  final VoidCallback? onTap;

  const _RecommendedItem({
    required this.name,
    required this.subtitle,
    required this.rating,
    required this.price,
    required this.imageUrl,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                imageUrl,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 80,
                  height: 80,
                  color: AppColors.surfaceContainerHigh,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.background, width: 2),
                        ),
                        child: Center(
                          child: Text(
                            rating,
                            style: GoogleFonts.inter(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        price,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.outline),
              ),
              child: const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}