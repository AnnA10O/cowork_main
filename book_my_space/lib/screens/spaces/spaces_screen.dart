import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../data/api_client.dart';
import '../../theme/app_colors.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/space_card.dart';

class SpacesScreen extends StatefulWidget {
  final String spaceType;
  const SpacesScreen({super.key, this.spaceType = 'all'});

  @override
  State<SpacesScreen> createState() => _SpacesScreenState();
}

class _SpacesScreenState extends State<SpacesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  List<Map<String, dynamic>> _apiSpaces = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadApiWorkspaces();
  }

  Future<void> _loadApiWorkspaces() async {
    setState(() => _isLoading = true);
    final results = await ApiClient.fetchWorkspaces();
    if (results != null && results.isNotEmpty) {
      setState(() {
        _apiSpaces = results;
      });
    }
    setState(() => _isLoading = false);
  }

  static const Map<String, String> categoryDefaultImages = {
    'hot_desk': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'private_cabin': 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
    'meeting_room': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    'shared_space': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
    'event_hall': 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
    'virtual_office': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    'podcast_studio': 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
    'training_room': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  };

  static const _typeLabels = {
    'hot_desk': 'Hot Desks',
    'private_cabin': 'Private Cabins',
    'meeting_room': 'Meeting Rooms',
    'shared_space': 'Shared Spaces',
    'event_hall': 'Event Halls',
    'virtual_office': 'Virtual Offices',
    'podcast_studio': 'Podcast Studios',
    'training_room': 'Training Rooms',
    'all': 'All Spaces',
  };

  List<Map<String, dynamic>> get _filteredSpaces {
    final mappedApi = _apiSpaces.map((item) {
      // Price
      final plans = item['pricingPlans'] as List?;
      String firstPlanPrice = 'N/A';
      if (plans != null && plans.isNotEmpty) {
        final plan = plans[0];
        final rawPrice = plan['basePrice'] ?? plan['price'] ?? 0;
        final price = rawPrice is double
            ? rawPrice.toInt()
            : rawPrice is String
            ? (double.tryParse(rawPrice)?.toInt() ?? 0)
            : rawPrice;
        final type = (plan['type'] as String? ?? 'HOURLY').toLowerCase();
        final suffix = type == 'hourly' ? '/hour'
            : type == 'daily' ? '/day'
            : type == 'weekly' ? '/week'
            : type == 'monthly' ? '/month'
            : '/hour';
        firstPlanPrice = '$price$suffix';
      }

      // Image — only cover (order=0) + slideshow (order>0), exclude category images (order<0)
      final images = item['images'] as List?;
      String imageUrl;
      if (images != null && images.isNotEmpty) {
        final slideshowImgs = images
            .where((img) => ((img['order'] as num?)?.toInt() ?? -1) >= 0)
            .toList();
        if (slideshowImgs.isNotEmpty) {
          slideshowImgs.sort((a, b) => ((a['order'] as num?)?.toInt() ?? 0).compareTo((b['order'] as num?)?.toInt() ?? 0));
          imageUrl = slideshowImgs.map((img) => img['url'].toString()).join(';');
        } else {
          final type = item['type']?.toString() ?? '';
          imageUrl = categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
        }
      } else {
        final type = item['type']?.toString() ?? '';
        imageUrl = categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
      }

      // Rating
      final rawRating = item['rating'] ?? item['avgRating'] ?? item['averageRating'];
      double rating = 0.0;
      if (rawRating is double) rating = rawRating;
      else if (rawRating is int) rating = rawRating.toDouble();
      else if (rawRating is String) rating = double.tryParse(rawRating) ?? 0.0;
      final hasRating = rating > 0.0;

      // Status
      final rawStatus = item['status'] ?? item['isActive'];
      AvailabilityStatus status;
      if (rawStatus == 'ACTIVE' || rawStatus == true) {
        status = AvailabilityStatus.available;
      } else if (rawStatus == 'FULL' || rawStatus == 'OCCUPIED') {
        status = AvailabilityStatus.occupied;
      } else {
        status = AvailabilityStatus.available; // safest fallback
      }

      return <String, dynamic>{
        'id': item['id'].toString(),
        'name': item['name']?.toString() ?? 'Unnamed Space',
        'location': '${item['city'] ?? ''}, ${item['state'] ?? ''}',
        'price': '₹$firstPlanPrice',
        'rating': rating,
        'hasRating': hasRating,
        'status': status,
        'image': imageUrl,
        'type': item['type']?.toString() ?? '',
      };
    }).toList();

    var list = [...mappedApi];
    if (widget.spaceType != 'all') {
      list = list.where((s) => s['type'] == widget.spaceType).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list
          .where((s) =>
      (s['name'] as String).toLowerCase().contains(q) ||
          (s['location'] as String).toLowerCase().contains(q))
          .toList();
    }
    return list;
  }

  String get _title => _typeLabels[widget.spaceType] ?? 'Spaces';

  @override
  Widget build(BuildContext context) {
    final spaces = _filteredSpaces;
    final showBack = widget.spaceType != 'all';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        titleSpacing: showBack ? 0 : 20,
        leading: showBack
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new,
                    color: AppColors.primary, size: 20),
                onPressed: () => context.go('/space-types'),
              )
            : null,
        automaticallyImplyLeading: false,
        title: Text(
          _title,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.onSurface,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined,
                color: AppColors.onSurfaceVariant),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Column(
              children: [
                // Search bar
                Container(
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Icon(Icons.search, color: AppColors.outline),
                      ),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: (v) => setState(() => _searchQuery = v),
                          style: GoogleFonts.inter(
                              fontSize: 14, color: AppColors.onSurface),
                          decoration: InputDecoration(
                            hintText: 'Search ${_title.toLowerCase()}...',
                            hintStyle: GoogleFonts.inter(
                                fontSize: 14,
                                color: AppColors.onSurfaceVariant),
                            border: InputBorder.none,
                            filled: false,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.tune, color: AppColors.primary),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${spaces.length} SPACE${spaces.length == 1 ? '' : 'S'} FOUND',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.05,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Sort: Rating',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.expand_more,
                              size: 16, color: AppColors.primary),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
          // Grid or empty state
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                    ),
                  )
                : spaces.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off,
                                color: AppColors.onSurfaceVariant, size: 56),
                        const SizedBox(height: 16),
                        Text(
                          'No spaces found',
                          style: GoogleFonts.inter(
                            color: AppColors.onSurface,
                            fontWeight: FontWeight.w600,
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Try a different category or search term',
                          style: GoogleFonts.inter(
                              color: AppColors.onSurfaceVariant, fontSize: 14),
                        ),
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
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.56,
                    ),
                    itemCount: spaces.length,
                    itemBuilder: (context, i) {
                      final space = spaces[i];
                      return SpaceCard(
                        key: ValueKey(space['id']),
                        name: space['name'] as String,
                        location: space['location'] as String,
                        imageUrl: space['image'] as String,
                        rating: space['rating'] as double,
                        price: space['price'] as String,
                        status: space['status'] as AvailabilityStatus,
                        hasRating: space['hasRating'] as bool,
                        onTap: () => context.push('/space/${space['id']}'),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}