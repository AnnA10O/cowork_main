import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../data/api_client.dart';
import '../../theme/app_colors.dart';
import '../../data/workspace_data.dart';

class SpaceDetailScreen extends StatefulWidget {
  final String spaceId;
  const SpaceDetailScreen({super.key, required this.spaceId});

  @override
  State<SpaceDetailScreen> createState() => _SpaceDetailScreenState();
}

class _SpaceDetailScreenState extends State<SpaceDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isFavorite = false;
  late SpaceInfo _space;
  bool _isLoadingDetail = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Initialize immediately with local fallback
    _space = WorkspaceDataService.getSpace(widget.spaceId);
    _loadLiveDetail();
  }

  Future<void> _loadLiveDetail() async {
    setState(() => _isLoadingDetail = true);
    final data = await ApiClient.fetchWorkspaceDetail(widget.spaceId);
    if (data != null) {
      final plans = data['pricingPlans'] as List?;
      final double startingPrice = (plans != null && plans.isNotEmpty) 
          ? (plans[0]['basePrice'] as num).toDouble() 
          : 199.0;
      final images = data['images'] as List?;
      final imageUrl = (images != null && images.isNotEmpty) 
          ? images[0]['url'] 
          : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80';

      final amenitiesStrings = data['amenities'] as List?;
      final List<Map<String, dynamic>> mappedAmenities = [];
      if (amenitiesStrings != null) {
        for (final item in amenitiesStrings) {
          final str = item.toString().toLowerCase();
          IconData icon = Icons.check_circle_outline;
          if (str.contains('wifi')) icon = Icons.wifi;
          else if (str.contains('caf') || str.contains('coffee')) icon = Icons.coffee;
          else if (str.contains('print')) icon = Icons.print;
          else if (str.contains('parking')) icon = Icons.local_parking;
          else if (str.contains('ac') || str.contains('climate')) icon = Icons.ac_unit;
          else if (str.contains('meet')) icon = Icons.meeting_room;
          else if (str.contains('lounge')) icon = Icons.weekend;

          mappedAmenities.add({'icon': icon, 'label': item.toString()});
        }
      }

      if (mappedAmenities.isEmpty) {
        mappedAmenities.addAll([
          {'icon': Icons.wifi, 'label': 'High-Speed WiFi'},
          {'icon': Icons.coffee, 'label': 'Artisan Café'},
        ]);
      }

      final desks = data['desks'] as List?;
      final List<SeatOption> options = [];
      if (desks != null) {
        for (final desk in desks) {
          final premiumExtra = (desk['premiumExtra'] as num?)?.toDouble() ?? 0.0;
          options.add(SeatOption(
            id: desk['id'].toString(),
            label: 'Desk ${desk['deskNumber']}',
            price: startingPrice + premiumExtra,
            status: desk['isActive'] == true ? 'available' : 'occupied',
            statusColor: desk['isActive'] == true ? AppColors.available : AppColors.occupied,
            perks: [desk['description'] ?? 'Workspace Desk'],
            imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
            seatType: desk['type'] ?? 'shared_desk',
          ));
        }
      }

      final List<SeatCategory> categories = [
        SeatCategory(
          id: 'desks',
          label: 'Desks Seating',
          icon: Icons.desktop_windows,
          description: 'Available physical workspace seating options',
          options: options.isNotEmpty ? options : _space.seatCategories.first.options,
        ),
      ];

      setState(() {
        _space = SpaceInfo(
          id: data['id'].toString(),
          name: data['name'] ?? _space.name,
          subtitle: '${data['address'] ?? ''}, ${data['city'] ?? ''}',
          imageUrl: imageUrl,
          rating: 4.9,
          reviews: 120,
          startingPrice: startingPrice,
          priceLabel: '/ day',
          description: data['description'] ?? _space.description,
          amenities: mappedAmenities,
          badge: data['badge'] ?? _space.badge,
          showSchedulePicker: false,
          seatCategories: categories,
        );
      });
    }
    setState(() => _isLoadingDetail = false);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _buildHero()),
              SliverToBoxAdapter(child: _buildContent()),
              const SliverToBoxAdapter(child: SizedBox(height: 110)),
            ],
          ),
          _buildBottomBar(),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Hero
  // ---------------------------------------------------------------------------
  Widget _buildHero() {
    return SizedBox(
      height: 380,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            _space.imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                Container(color: AppColors.surfaceContainerHigh),
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Color(0xBB051424),
                  AppColors.background
                ],
                stops: [0.35, 0.75, 1.0],
              ),
            ),
          ),
          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _CircleBtn(
                    icon: Icons.arrow_back,
                    onTap: () => Navigator.pop(context),
                  ),
                  Row(
                    children: [
                      _CircleBtn(
                        icon: _isFavorite
                            ? Icons.favorite
                            : Icons.favorite_border,
                        onTap: () =>
                            setState(() => _isFavorite = !_isFavorite),
                      ),
                      const SizedBox(width: 8),
                      _CircleBtn(icon: Icons.share, onTap: () {}),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Bottom info
          Positioned(
            bottom: 16,
            left: 20,
            right: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_space.badge != null) ...[
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                      border:
                          Border.all(color: AppColors.primary.withOpacity(0.4)),
                    ),
                    child: Text(
                      _space.badge!,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        letterSpacing: 0.05,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                ],
                Text(
                  _space.name,
                  style: GoogleFonts.inter(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                Text(
                  _space.subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.star,
                        size: 16, color: AppColors.tertiary, fill: 1),
                    const SizedBox(width: 4),
                    Text(
                      _space.rating.toString(),
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${_space.reviews} reviews)',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.onSurfaceVariant,
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

  // ---------------------------------------------------------------------------
  // Content
  // ---------------------------------------------------------------------------
  Widget _buildContent() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Price chip
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'STARTING AT',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.05,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          '₹${_space.startingPrice.toStringAsFixed(0)}',
                          style: GoogleFonts.inter(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          ' ${_space.priceLabel}',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.available,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Available',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Tabs
          Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.outlineVariant, width: 0.5),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorColor: AppColors.primary,
              indicatorWeight: 2,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.onSurfaceVariant,
              labelStyle:
                  GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
              unselectedLabelStyle: GoogleFonts.inter(fontSize: 15),
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Amenities'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Description
          Text(
            'About this space',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _space.description,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: AppColors.onSurfaceVariant,
              height: 1.65,
            ),
          ),
          const SizedBox(height: 24),

          // Amenities
          Text(
            'Amenities',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 3.2,
            children: _space.amenities
                .map<Widget>(
                  (a) => Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainer,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppColors.outlineVariant.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(a['icon'] as IconData,
                            color: AppColors.primary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            a['label'] as String,
                            style: GoogleFonts.inter(
                                fontSize: 12, color: AppColors.onSurface),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),

          // Seat categories preview
          Text(
            'Available Categories',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          ..._space.seatCategories.map(
            (cat) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(10),
                  border:
                      Border.all(color: Colors.white.withOpacity(0.07)),
                ),
                child: Row(
                  children: [
                    Icon(cat.icon, color: AppColors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cat.label,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurface,
                            ),
                          ),
                          Text(
                            '${cat.options.length} option${cat.options.length == 1 ? '' : 's'}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'from ₹${cat.options.isNotEmpty ? cat.options.reduce((a, b) => a.price < b.price ? a : b).price.toStringAsFixed(0) : '-'}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Bottom bar
  // ---------------------------------------------------------------------------
  Widget _buildBottomBar() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer.withOpacity(0.95),
          border: Border(
            top: BorderSide(
              color: AppColors.outlineVariant.withOpacity(0.3),
            ),
          ),
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () =>
                      context.push('/seat-selection/${widget.spaceId}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryContainer,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'Book Now',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: () => setState(() => _isFavorite = !_isFavorite),
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.outline),
                  ),
                  child: Icon(
                    _isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: _isFavorite
                        ? AppColors.primary
                        : AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer.withOpacity(0.85),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
    );
  }
}