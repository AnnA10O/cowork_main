import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_colors.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/space_card.dart';

// ---------------------------------------------------------------------------
// All spaces data (kept local, consistent with spaces_screen.dart)
// ---------------------------------------------------------------------------
const _allSpaces = [
  {
    'id': 'fmciii',
    'name': 'FMCIII Executive Lounge',
    'location': 'Canary Wharf',
    'price': '£45/day',
    'rating': 4.9,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'type': 'hot_desk',
  },
  {
    'id': 'hive_soho',
    'name': 'Hive Soho Studio',
    'location': 'Central London',
    'price': '£12/hr',
    'rating': 4.8,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
    'type': 'shared_space',
  },
  {
    'id': 'the_deck',
    'name': 'The Deck Co-Work',
    'location': 'Shoreditch',
    'price': '£15/hr',
    'rating': 4.9,
    'status': AvailabilityStatus.fillingFast,
    'image': 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800&q=80',
    'type': 'hot_desk',
  },
  {
    'id': 'atlas_labs',
    'name': 'Atlas Labs Cabin',
    'location': "King's Cross",
    'price': '£10/hr',
    'rating': 4.7,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
    'type': 'private_cabin',
  },
  {
    'id': 'vault_prime',
    'name': 'Vault Prime Suite',
    'location': 'Mayfair',
    'price': '£25/hr',
    'rating': 5.0,
    'status': AvailabilityStatus.occupied,
    'image': 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80',
    'type': 'private_cabin',
  },
  {
    'id': 'glass_house',
    'name': 'The Glass House',
    'location': 'Central London',
    'price': '£240/day',
    'rating': 4.9,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    'type': 'meeting_room',
  },
  {
    'id': 'founders_hall',
    'name': 'Founders Hall',
    'location': 'Islington',
    'price': '£350/day',
    'rating': 4.8,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
    'type': 'event_hall',
  },
  {
    'id': 'grand_auditorium',
    'name': 'Grand Auditorium',
    'location': 'South Bank',
    'price': '£800/day',
    'rating': 4.9,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    'type': 'event_hall',
  },
  {
    'id': 'echo_pod',
    'name': 'Echo Recording Pod',
    'location': 'Hackney',
    'price': '£20/hr',
    'rating': 4.8,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
    'type': 'podcast_studio',
  },
  {
    'id': 'campus_room',
    'name': 'Campus Training Room',
    'location': 'Stratford',
    'price': '£80/half-day',
    'rating': 4.6,
    'status': AvailabilityStatus.fillingFast,
    'image': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    'type': 'training_room',
  },
  {
    'id': 'nexus_virtual',
    'name': 'Nexus Virtual Office',
    'location': 'City of London',
    'price': '£25/month',
    'rating': 4.7,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    'type': 'virtual_office',
  },
  {
    'id': 'bloom_shared',
    'name': 'Bloom Shared Floor',
    'location': 'Shoreditch',
    'price': '£8/hr',
    'rating': 4.5,
    'status': AvailabilityStatus.available,
    'image': 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
    'type': 'shared_space',
  },
];

const _typeLabels = <String, String>{
  'hot_desk': 'Hot Desks',
  'private_cabin': 'Private Cabins',
  'meeting_room': 'Meeting Rooms',
  'shared_space': 'Shared Spaces',
  'event_hall': 'Event Halls',
  'virtual_office': 'Virtual Offices',
  'podcast_studio': 'Podcast Studios',
  'training_room': 'Training Rooms',
};

const _subCategories = <String, List<String>>{
  'hot_desk': ['All', 'Open Plan', 'Window Seat', 'Standing Desk', 'Quiet Zone'],
  'private_cabin': ['All', '1-Person Pod', '2-4 Person', '5-10 Person', 'Executive Suite'],
  'meeting_room': ['All', 'Boardroom', 'Video Conf.', 'Whiteboard', 'Interview Room'],
  'event_hall': ['All', 'Workshop', 'Seminar', 'Networking', 'Product Launch'],
  'virtual_office': ['All', 'Business Address', 'Mail Handling', 'Phone Answering', 'Full Package'],
  'shared_space': ['All', 'Premium', 'Standard', '24/7 Access', 'Day Pass'],
};

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
class WorkspaceCategoryScreen extends StatefulWidget {
  final String type;
  const WorkspaceCategoryScreen({super.key, required this.type});

  @override
  State<WorkspaceCategoryScreen> createState() => _WorkspaceCategoryScreenState();
}

class _WorkspaceCategoryScreenState extends State<WorkspaceCategoryScreen> {
  String _selectedSubCategory = 'All';

  String get _title => _typeLabels[widget.type] ?? 'Workspaces';

  List<String> get _pills => _subCategories[widget.type] ?? ['All'];

  List<Map<String, dynamic>> get _spaces =>
      _allSpaces.where((s) => s['type'] == widget.type).toList();

  @override
  Widget build(BuildContext context) {
    final spaces = _spaces;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          color: AppColors.onSurface,
          onPressed: () => context.pop(),
        ),
        title: Text(
          _title,
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded, size: 20),
            color: AppColors.onSurface,
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Filters coming soon',
                    style: GoogleFonts.inter(color: AppColors.onSurface)),
                backgroundColor: AppColors.surfaceContainer,
                behavior: SnackBarBehavior.floating,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sub-category pills
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _pills.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final label = _pills[i];
                final isSelected = label == _selectedSubCategory;
                return GestureDetector(
                  onTap: () => setState(() => _selectedSubCategory = label),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primaryContainer
                          : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primaryContainer
                            : Colors.white.withOpacity(0.1),
                      ),
                    ),
                    child: Text(
                      label,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isSelected
                            ? Colors.white
                            : AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Grid
          Expanded(
            child: spaces.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.search_off_rounded,
                            color: AppColors.onSurfaceVariant, size: 48),
                        const SizedBox(height: 16),
                        Text('No spaces found',
                            style: GoogleFonts.inter(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSurface)),
                        const SizedBox(height: 8),
                        Text('Try a different category',
                            style: GoogleFonts.inter(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 14)),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () => context.go('/space-types'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryContainer,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text('Browse Categories',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 0.56,
                    ),
                    itemCount: spaces.length,
                    itemBuilder: (context, i) {
                      final space = spaces[i];
                      return SpaceCard(
                        name: space['name'] as String,
                        location: space['location'] as String,
                        imageUrl: space['image'] as String,
                        rating: space['rating'] as double,
                        price: space['price'] as String,
                        status: space['status'] as AvailabilityStatus,
                        onTap: () =>
                            context.push('/space/${space['id']}'),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}