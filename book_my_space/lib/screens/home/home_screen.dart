import 'dart:async';
import 'dart:developer' as dev;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/glass_card.dart';
import '../../data/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

const Map<String, String> categoryDefaultImages = {
  'hot_desk': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  'private_cabin': 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80',
  'meeting_room': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
  'shared_space': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
  'event_hall': 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
  'virtual_office': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
  'podcast_studio': 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
  'training_room': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
};

class _HomeScreenState extends State<HomeScreen> {
  int _selectedCategory = 0;
  final _categories = [
    {'label': 'Hot Desks', 'type': 'hot_desk'},
    {'label': 'Cabins', 'type': 'private_cabin'},
    {'label': 'Meeting Rooms', 'type': 'meeting_room'},
    {'label': 'Event Halls', 'type': 'event_hall'},
    {'label': 'Virtual Office', 'type': 'virtual_office'},
  ];

  List<Map<String, dynamic>> _apiSpaces = [];
  bool _isLoading = false;
  String? _prefType;

  @override
  void initState() {
    super.initState();
    _loadWorkspaces();
  }

  Future<void> _loadWorkspaces() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    
    String? prefCity;
    try {
      final prefs = await SharedPreferences.getInstance();
      prefCity = prefs.getString('pref_city');
      final pType = prefs.getString('pref_type');
      _prefType = pType;
      
      if (pType != null && pType.isNotEmpty) {
        final idx = _categories.indexWhere((c) => c['type'] == pType);
        if (idx != -1 && mounted) {
          setState(() => _selectedCategory = idx);
        }
      }
    } catch (e) {
      dev.log('Error loading preferences: $e');
    }

    // Fetch all workspaces (filtered by city only if set) so we don't hide everything else
    final results = await ApiClient.fetchWorkspaces(city: prefCity);
    if (results != null && mounted) {
      setState(() {
        _apiSpaces = results;
        // The lists will be separated dynamically in the build methods based on prefType
      });
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Map<String, dynamic> _formatWorkspace(Map<String, dynamic> item) {
    final plans = item['pricingPlans'] as List?;
    final firstPlanPrice = (plans != null && plans.isNotEmpty) ? plans[0]['basePrice'] : 199;
    
    final images = item['images'] as List?;
    String imageUrl;
    if (images != null && images.isNotEmpty) {
      // Only include cover (order=0) and slideshow images (order>0), exclude category images (order<0)
      final slideshowImgs = images
          .where((img) => ((img['order'] as num?)?.toInt() ?? -1) >= 0)
          .toList();
      if (slideshowImgs.isNotEmpty) {
        slideshowImgs.sort((a, b) => ((a['order'] as num?)?.toInt() ?? 0).compareTo((b['order'] as num?)?.toInt() ?? 0));
        imageUrl = slideshowImgs
            .where((img) => img['url'] != null)
            .map((img) => img['url'].toString())
            .join(';');
        dev.log('IMAGES [${item['name']}]: ${slideshowImgs.length} imgs -> "$imageUrl"');
      } else {
        final type = item['type'] as String? ?? 'hot_desk';
        imageUrl = categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
      }
    } else {
      final type = item['type'] as String? ?? 'hot_desk';
      imageUrl = categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
    }

    return {
      'id': item['id'].toString(),
      'name': item['name']?.toString() ?? 'Unnamed Space',
      'location': '${item['city'] ?? ''}, ${item['state'] ?? ''}',
      'price': () {
        if (plans == null || plans.isEmpty) return 'N/A';
        final type = (plans[0]['type'] as String? ?? 'HOURLY').toLowerCase();
        final suffix = type == 'hourly' ? '/hour' : type == 'daily' ? '/day' : type == 'weekly' ? '/week' : type == 'monthly' ? '/month' : '/hour';
        return '₹$firstPlanPrice$suffix';
      }(),
      'status': () {
        final raw = item['status'] ?? item['isActive'];
        if (raw == 'ACTIVE' || raw == true) return AvailabilityStatus.available;
        if (raw == 'FULL' || raw == 'OCCUPIED') return AvailabilityStatus.occupied;
        return AvailabilityStatus.available;
      }(),
      'image': imageUrl,
      'rating': () {
        final raw = item['rating'] ?? item['avgRating'] ?? item['averageRating'];
        if (raw is double) return raw.toStringAsFixed(1);
        if (raw is int) return raw.toDouble().toStringAsFixed(1);
        if (raw is String && raw.isNotEmpty) return raw;
        return '';
      }(),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _loadWorkspaces,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(),
            SliverToBoxAdapter(child: _PromoCarousel()),
            SliverToBoxAdapter(child: _buildCategoryTabs()),
            SliverToBoxAdapter(child: _buildAvailableSection()),
            SliverToBoxAdapter(child: _buildRecommendedSection()),
            SliverToBoxAdapter(child: _buildEventsSection()),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
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
          Text('India',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              )),
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

  Widget _buildCategoryTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        children: _categories.asMap().entries.map((entry) {
          final i = entry.key;
          final cat = entry.value;
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
                child: Text(cat['label']!,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? AppColors.onPrimaryContainer : AppColors.onSurfaceVariant,
                      letterSpacing: 0.05,
                    )),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAvailableSection() {
    var others = _prefType != null && _prefType!.isNotEmpty
        ? _apiSpaces.where((s) => s['type'] != _prefType).toList()
        : _apiSpaces;
        
    final uiSpaces = others.map(_formatWorkspace).toList();
    if (uiSpaces.isEmpty && !_isLoading) return const SizedBox.shrink();
    
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
                Text(_prefType != null && _prefType!.isNotEmpty ? 'Explore Other Options' : 'Available Now',
                    style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface)),
                TextButton(
                  onPressed: () => context.go('/space-types'),
                  child: Text('SEE ALL',
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          letterSpacing: 0.05)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 300,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : uiSpaces.isEmpty
                    ? Center(
                        child: Text(
                          'No workspaces found.',
                          style: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
                        ),
                      )
                    : ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: uiSpaces.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 16),
                        itemBuilder: (context, i) {
                          final space = uiSpaces[i];
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
    var matching = _prefType != null && _prefType!.isNotEmpty
        ? _apiSpaces.where((s) => s['type'] == _prefType).toList()
        : _apiSpaces;
        
    final uiSpaces = matching.map(_formatWorkspace).toList();
    if (uiSpaces.isEmpty && !_isLoading) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recommended for You',
              style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 12),
          if (_isLoading)
            const Center(child: CircularProgressIndicator(color: AppColors.primary))
          else
            ...uiSpaces.take(2).map((space) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _RecommendedItem(
                    name: space['name'] as String,
                    subtitle: 'Co-Working • ${space['location']}',
                    rating: () {
                      final raw = space['rating'] ?? space['avgRating'] ?? space['averageRating'];
                      if (raw == null) return '';
                      if (raw is double) return raw.toStringAsFixed(1);
                      if (raw is int) return raw.toDouble().toStringAsFixed(1);
                      return raw.toString();
                    }(),
                    price: space['price'] as String,
                    imageUrl: space['image'] as String,
                    onTap: () => context.push('/space/${space['id']}'),
                  ),
                )),
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
          Text('Upcoming Events',
              style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.tertiaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Stack(children: [
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
                  Row(children: [
                    const Icon(Icons.event, size: 18, color: AppColors.onTertiaryContainer),
                    const SizedBox(width: 6),
                    Text('JUN 15 • 18:30 IST',
                        style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.05,
                            color: AppColors.onTertiaryContainer)),
                  ]),
                  const SizedBox(height: 8),
                  Text('Start-up Networking',
                      style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onTertiaryContainer)),
                  const SizedBox(height: 6),
                  Text('Connect with 50+ founders at BKC Innovation Hub.',
                      style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.onTertiaryContainer.withOpacity(0.9)),
                      maxLines: 2),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.onTertiaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('JOIN NOW',
                        style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.tertiaryContainer)),
                  ),
                ],
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Promo Carousel
// ─────────────────────────────────────────────────────────────────────────────
class _PromoCarousel extends StatefulWidget {
  @override
  State<_PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<_PromoCarousel> {
  final _controller = PageController();
  int _current = 0;
  Timer? _timer;

  static const _cards = [
    _PromoCard(
      gradient: [Color(0xFF1A3A6B), Color(0xFF2563EB)],
      emoji: '👋',
      tag: 'WELCOME',
      title: 'Good to See You!',
      subtitle: 'Discover premium workspaces across India today.',
      accent: Color(0xFFB4C5FF),
    ),
    _PromoCard(
      gradient: [Color(0xFF7C2D12), Color(0xFFEA580C)],
      emoji: '🔥',
      tag: 'LIMITED OFFER',
      title: '20% OFF First Booking',
      subtitle: 'Exclusive offers for first-time bookers.',
      accent: Color(0xFFFED7AA),
    ),
    _PromoCard(
      gradient: [Color(0xFF064E3B), Color(0xFF059669)],
      emoji: '💼',
      tag: 'HOT DESK PLAN',
      title: 'Flexible Hot Desks',
      subtitle: 'Hourly, daily & monthly plans available.',
      accent: Color(0xFFA7F3D0),
    ),
    _PromoCard(
      gradient: [Color(0xFF312E81), Color(0xFF7C3AED)],
      emoji: '🏢',
      tag: 'PRIVATE CABIN',
      title: 'Private Cabins',
      subtitle: 'Fully enclosed · 4K screens · Personal locker included.',
      accent: Color(0xFFDDD6FE),
    ),
    _PromoCard(
      gradient: [Color(0xFF78350F), Color(0xFFD97706)],
      emoji: '🏆',
      tag: 'COMMUNITY',
      title: 'Growing Community',
      subtitle: 'Join India\'s fastest growing co-working community.',
      accent: Color(0xFFFEF3C7),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final next = (_current + 1) % _cards.length;
      _controller.animateToPage(next,
          duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        children: [
          SizedBox(
            height: 160,
            child: PageView.builder(
              controller: _controller,
              itemCount: _cards.length,
              onPageChanged: (i) => setState(() => _current = i),
              itemBuilder: (_, i) => _cards[i],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_cards.length, (i) {
              final isActive = i == _current;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: isActive ? 24 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: isActive ? AppColors.primary : AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  final List<Color> gradient;
  final String emoji;
  final String tag;
  final String title;
  final String subtitle;
  final Color accent;

  const _PromoCard({
    required this.gradient,
    required this.emoji,
    required this.tag,
    required this.title,
    required this.subtitle,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: gradient.last.withOpacity(0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Text side
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(tag,
                      style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: accent,
                          letterSpacing: 0.8)),
                ),
                const SizedBox(height: 6),
                Text(title,
                    style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.3),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(subtitle,
                    style: GoogleFonts.inter(
                        fontSize: 11.5,
                        color: accent.withOpacity(0.9),
                        height: 1.4),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Emoji bubble
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(emoji, style: const TextStyle(fontSize: 30)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Space card used in Available Now horizontal list
// ─────────────────────────────────────────────────────────────────────────────
class _WhiteSpaceCard extends StatefulWidget {
  final Map<String, dynamic> space;
  const _WhiteSpaceCard({required this.space});

  @override
  State<_WhiteSpaceCard> createState() => _WhiteSpaceCardState();
}

class _WhiteSpaceCardState extends State<_WhiteSpaceCard> {
  int _currentPage = 0;
  late PageController _pageController;
  Timer? _autoPlayTimer;
  late List<String> _images;

  void _buildImages() {
    _images = (widget.space['image'] as String)
        .split(';')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty && s.startsWith('http'))
        .toList();
    if (_images.isEmpty) {
      _images = ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'];
    }
  }

  void _startAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = null;
    if (_images.length > 1) {
      _autoPlayTimer = Timer.periodic(const Duration(seconds: 3), (_) {
        if (!mounted) return;
        final next = (_currentPage + 1) % _images.length;
        _pageController.animateToPage(
          next,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _buildImages();
    _pageController = PageController();
    _startAutoPlay();
  }

  @override
  void didUpdateWidget(_WhiteSpaceCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.space['image'] != widget.space['image']) {
      _buildImages();
      _currentPage = 0;
      _pageController.jumpToPage(0);
      _startAutoPlay();
    }
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.space['status'] as AvailabilityStatus;
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
            SizedBox(
              height: 160,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Stack(fit: StackFit.expand, children: [
                  if (_images.length > 1)
                    PageView.builder(
                      controller: _pageController,
                      itemCount: _images.length,
                      onPageChanged: (index) {
                        if (mounted) setState(() => _currentPage = index);
                      },
                      itemBuilder: (context, index) {
                        return CachedNetworkImage(
                          imageUrl: _images[index],
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(color: AppColors.surfaceContainerHigh),
                          errorWidget: (_, __, ___) => Container(color: AppColors.surfaceContainerHigh),
                        );
                      },
                    )
                  else
                    CachedNetworkImage(
                      imageUrl: _images[0],
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: AppColors.surfaceContainerHigh),
                      errorWidget: (_, __, ___) => Container(color: AppColors.surfaceContainerHigh),
                    ),

                  // Gradient overlay at bottom for dots visibility
                  if (_images.length > 1)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 30,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [
                              Colors.black.withOpacity(0.45),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Animated dot indicators
                  if (_images.length > 1)
                    Positioned(
                      bottom: 8,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _images.length,
                          (index) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            width: _currentPage == index ? 16 : 5,
                            height: 5,
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(3),
                              color: _currentPage == index
                                  ? Colors.white
                                  : Colors.white.withOpacity(0.5),
                            ),
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8)),
                      child: Text(widget.space['price'] as String,
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onPrimary)),
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
                          border: Border.all(color: Colors.white, width: 1.5)),
                    ),
                  ),
                ]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(widget.space['name'] as String,
                            style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF1A1A1A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                      const Icon(Icons.arrow_forward,
                          color: AppColors.primaryContainer, size: 18),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.location_on, size: 12, color: Color(0xFF555555)),
                    const SizedBox(width: 2),
                    Expanded(
                      child: Text(widget.space['location'] as String,
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              color: const Color(0xFF555555),
                              fontWeight: FontWeight.w400),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/space/${widget.space['id']}'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryContainer,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                        minimumSize: const Size(0, 36),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text('Book Now',
                          style: GoogleFonts.inter(
                              fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
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

// ─────────────────────────────────────────────────────────────────────────────
// Recommended item row
// ─────────────────────────────────────────────────────────────────────────────
class _RecommendedItem extends StatelessWidget {
  final String name, subtitle, rating, price, imageUrl;
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
        child: Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: () {
                final imgUrls = imageUrl
                    .split(';')
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList();
                final coverUrl = imgUrls.isNotEmpty
                    ? imgUrls[0]
                    : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80';
                return CachedNetworkImage(
                  imageUrl: coverUrl,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                      width: 80, height: 80, color: AppColors.surfaceContainerHigh),
                  errorWidget: (_, __, ___) => Container(
                      width: 80, height: 80, color: AppColors.surfaceContainerHigh),
                );
              }(),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(subtitle,
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppColors.onSurfaceVariant),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                Row(children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.background, width: 2)),
                    child: Center(
                      child: rating.isEmpty
                          ? const Icon(Icons.star, size: 12, color: Colors.white)
                          : Text(rating,
                          style: GoogleFonts.inter(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(price,
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                ]),
              ],
            ),
          ),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.outline)),
            child: const Icon(Icons.chevron_right,
                color: AppColors.onSurfaceVariant, size: 20),
          ),
        ]),
      ),
    );
  }
}