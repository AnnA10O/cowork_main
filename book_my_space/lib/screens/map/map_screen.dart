import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../theme/app_colors.dart';
import '../../widgets/glass_card.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Space data with coordinates for the map
// ─────────────────────────────────────────────────────────────────────────────
class _MapSpace {
  final String id, name, location, price, type;
  final double rating;
  final LatLng coords;
  final AvailabilityStatus status;
  final String imageUrl;
  const _MapSpace({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.type,
    required this.rating,
    required this.coords,
    required this.status,
    required this.imageUrl,
  });
}

const _mapSpaces = [
  _MapSpace(
    id: 'fmciii',
    name: 'FMCIII Executive Lounge',
    location: 'BKC, Mumbai',
    price: '₹3,500/day',
    type: 'Hot Desk',
    rating: 4.9,
    coords: LatLng(19.0596, 72.8656),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
  ),
  _MapSpace(
    id: 'vault_prime',
    name: 'Vault Prime Suite',
    location: 'Nariman Point, Mumbai',
    price: '₹2,000/hr',
    type: 'Meeting Room',
    rating: 5.0,
    coords: LatLng(18.9253, 72.8244),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&q=80',
  ),
  _MapSpace(
    id: 'nexus_virtual',
    name: 'Nexus Virtual Office',
    location: 'Andheri, Mumbai',
    price: '₹2,000/mo',
    type: 'Virtual Office',
    rating: 4.7,
    coords: LatLng(19.1136, 72.8697),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&q=80',
  ),
  _MapSpace(
    id: 'glass_house',
    name: 'The Glass House',
    location: 'HSR Layout, Bengaluru',
    price: '₹19,000/day',
    type: 'Private Office',
    rating: 4.9,
    coords: LatLng(12.9116, 77.6389),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80',
  ),
  _MapSpace(
    id: 'the_deck',
    name: 'The Deck Co-Work',
    location: 'Koramangala, Bengaluru',
    price: '₹1,200/hr',
    type: 'Hot Desk',
    rating: 4.9,
    coords: LatLng(12.9352, 77.6245),
    status: AvailabilityStatus.fillingFast,
    imageUrl: 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=400&q=80',
  ),
  _MapSpace(
    id: 'atlas_labs',
    name: 'Atlas Labs',
    location: 'Whitefield, Bengaluru',
    price: '₹800/hr',
    type: 'Cabin',
    rating: 4.7,
    coords: LatLng(12.9698, 77.7500),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=400&q=80',
  ),
  _MapSpace(
    id: 'hive_soho',
    name: 'Hive CP Studio',
    location: 'Connaught Place, Delhi',
    price: '₹950/hr',
    type: 'Shared Space',
    rating: 4.8,
    coords: LatLng(28.6315, 77.2167),
    status: AvailabilityStatus.available,
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&q=80',
  ),
  _MapSpace(
    id: 'campus_room',
    name: 'Campus Training Room',
    location: 'Sector 44, Gurgaon',
    price: '₹6,500/half-day',
    type: 'Training Room',
    rating: 4.6,
    coords: LatLng(28.4595, 77.0266),
    status: AvailabilityStatus.fillingFast,
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80',
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Map Screen
// ─────────────────────────────────────────────────────────────────────────────
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _mapController = MapController();
  _MapSpace? _selectedSpace;
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

  // Default center: Mumbai
  static const _defaultCenter = LatLng(19.0760, 72.8777);
  static const _defaultZoom = 5.5;

  List<_MapSpace> get _filtered {
    if (_searchQuery.isEmpty) return _mapSpaces;
    final q = _searchQuery.toLowerCase();
    return _mapSpaces.where((s) =>
        s.name.toLowerCase().contains(q) ||
        s.location.toLowerCase().contains(q)).toList();
  }

  void _flyTo(_MapSpace space) {
    setState(() => _selectedSpace = space);
    _mapController.move(space.coords, 13.0);
  }

  void _useMyLocation() {
    // Simulated: fly to Mumbai (demo)
    _mapController.move(_defaultCenter, 8.0);
    setState(() => _selectedSpace = null);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Showing spaces near Mumbai',
            style: GoogleFonts.inter(fontSize: 13)),
        backgroundColor: AppColors.primaryContainer,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  void dispose() {
    _mapController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spaces = _filtered;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(children: [
        // ── Full-screen map ──────────────────────────────────────────────
        FlutterMap(
          mapController: _mapController,
          options: const MapOptions(
            initialCenter: _defaultCenter,
            initialZoom: _defaultZoom,
            minZoom: 3,
            maxZoom: 18,
          ),
          children: [
            // OSM tile layer (no API key needed)
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.bookmyspace.app',
            ),
            // Price markers
            MarkerLayer(
              markers: spaces.map((s) {
                final isSelected = _selectedSpace?.id == s.id;
                return Marker(
                  point: s.coords,
                  width: isSelected ? 100 : 80,
                  height: 36,
                  child: GestureDetector(
                    onTap: () => _flyTo(s),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primaryContainer
                            : const Color(0xFF1A3A6B),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Text(
                        s.price.split('/').first,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),

        // ── Search bar (top) ──────────────────────────────────────────────
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D1C2D).withOpacity(0.95),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withOpacity(0.12)),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.25),
                          blurRadius: 16,
                          offset: const Offset(0, 4))
                    ],
                  ),
                  child: Row(children: [
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Icon(Icons.search, color: AppColors.primary, size: 20),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _searchQuery = v),
                        style: GoogleFonts.inter(
                            fontSize: 14, color: AppColors.onSurface),
                        decoration: InputDecoration(
                          hintText: 'Search city or space name…',
                          hintStyle: GoogleFonts.inter(
                              fontSize: 14,
                              color: AppColors.onSurfaceVariant),
                          border: InputBorder.none,
                          filled: false,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Icon(Icons.tune, color: AppColors.primary, size: 20),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 8),
                // Filters row
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [
                    _FilterChip(label: 'All Spaces', isSelected: true),
                    const SizedBox(width: 8),
                    _FilterChip(label: 'Hot Desks'),
                    const SizedBox(width: 8),
                    _FilterChip(label: 'Cabins'),
                    const SizedBox(width: 8),
                    _FilterChip(label: 'Meeting Rooms'),
                  ]),
                ),
              ],
            ),
          ),
        ),

        // ── Near Me FAB ──────────────────────────────────────────────────
        Positioned(
          right: 16,
          bottom: 330,
          child: GestureDetector(
            onTap: _useMyLocation,
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF0D1C2D),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary.withOpacity(0.5)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4))
                ],
              ),
              child: const Icon(Icons.my_location, color: AppColors.primary, size: 22),
            ),
          ),
        ),

        // ── Bottom sheet with spaces ─────────────────────────────────────
        DraggableScrollableSheet(
          initialChildSize: 0.35,
          minChildSize: 0.15,
          maxChildSize: 0.75,
          builder: (_, scrollCtrl) => Container(
            clipBehavior: Clip.hardEdge,
            decoration: const BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 20)],
            ),
            child: ClipRect(
              child: Column(children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Spaces in India',
                            style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppColors.onSurface)),
                        Text('${spaces.length} available spaces',
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                    TextButton(
                      onPressed: () => context.go('/spaces'),
                      child: Text('View List',
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary)),
                    ),
                  ],
                ),
              ),
              // Spaces list
              Expanded(
                child: ListView.separated(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: spaces.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) =>
                      _MapSpaceCard(space: spaces[i], onTap: () => _flyTo(spaces[i])),
                ),
              ),
            ]),
            ),
          ),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter chip
// ─────────────────────────────────────────────────────────────────────────────
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  const _FilterChip({required this.label, this.isSelected = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.primaryContainer.withOpacity(0.9)
            : const Color(0xFF0D1C2D).withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isSelected ? AppColors.primary : Colors.white.withOpacity(0.15),
        ),
      ),
      child: Text(label,
          style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : AppColors.onSurfaceVariant)),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Space card in bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
class _MapSpaceCard extends StatelessWidget {
  final _MapSpace space;
  final VoidCallback onTap;
  const _MapSpaceCard({required this.space, required this.onTap});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusLabel;
    switch (space.status) {
      case AvailabilityStatus.available:
        statusColor = AppColors.available;
        statusLabel = 'Available';
      case AvailabilityStatus.fillingFast:
        statusColor = AppColors.fillingFast;
        statusLabel = 'Filling Fast';
      case AvailabilityStatus.occupied:
        statusColor = AppColors.occupied;
        statusLabel = 'Occupied';
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              space.imageUrl,
              width: 72,
              height: 72,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                  width: 72, height: 72, color: AppColors.surfaceContainerHigh),
            ),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(space.name,
                    style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Row(children: [
                  const Icon(Icons.location_on_outlined,
                      size: 11, color: AppColors.onSurfaceVariant),
                  const SizedBox(width: 2),
                  Expanded(
                    child: Text(space.location,
                        style: GoogleFonts.inter(
                            fontSize: 11, color: AppColors.onSurfaceVariant),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                ]),
                const SizedBox(height: 6),
                Row(children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                        color: statusColor, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(statusLabel,
                        style: GoogleFonts.inter(
                            fontSize: 10,
                            color: statusColor,
                            fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                  const Spacer(),
                  Flexible(
                    child: Text(space.price,
                        style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                ]),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Book button
          ElevatedButton(
            onPressed: () => context.push('/space/${space.id}'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              minimumSize: const Size(0, 36),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text('Book',
                style: GoogleFonts.inter(
                    fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ]),
      ),
    );
  }
}