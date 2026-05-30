import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../data/api_client.dart';
import '../../theme/app_colors.dart';
import '../../data/workspace_data.dart';

// ---------------------------------------------------------------------------
// Seat type filter definition
// ---------------------------------------------------------------------------
class _SeatTypeFilter {
  final String key;
  final String label;
  final IconData icon;
  final Color accent;
  const _SeatTypeFilter({
    required this.key,
    required this.label,
    required this.icon,
    required this.accent,
  });
}

const _kFilters = [
  _SeatTypeFilter(key: 'all',            label: 'All',            icon: Icons.grid_view_rounded,  accent: AppColors.primary),
  _SeatTypeFilter(key: 'shared_desk',    label: 'Shared Desk',    icon: Icons.weekend,            accent: Color(0xFF60A5FA)),
  _SeatTypeFilter(key: 'dedicated_desk', label: 'Dedicated Desk', icon: Icons.computer,           accent: Color(0xFFA78BFA)),
  _SeatTypeFilter(key: 'private_cabin',  label: 'Private Cabin',  icon: Icons.lock_outline,       accent: Color(0xFFFBBF24)),
  _SeatTypeFilter(key: 'team_space',     label: 'Team Space',     icon: Icons.groups_outlined,    accent: Color(0xFF34D399)),
  _SeatTypeFilter(key: 'meeting_room',   label: 'Meeting Room',   icon: Icons.meeting_room,       accent: Color(0xFF2DD4BF)),
];

_SeatTypeFilter _filterFor(String key) =>
    _kFilters.firstWhere((f) => f.key == key, orElse: () => _kFilters.first);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
class SeatSelectionScreen extends StatefulWidget {
  final String spaceId;
  const SeatSelectionScreen({super.key, required this.spaceId});

  @override
  State<SeatSelectionScreen> createState() => _SeatSelectionScreenState();
}

class _SeatSelectionScreenState extends State<SeatSelectionScreen> {
  late SpaceInfo _space;

  // ── 2-step flow (non-FMCIII) ──
  int _step = 0;
  SeatCategory? _selectedCategory;
  SeatOption? _selectedOption;

  // ── Flat-filter flow (FMCIII) ──
  String _activeFilter = 'all';
  SeatOption? _filteredSelection;

  bool get _useFlatFilter => widget.spaceId == 'fmciii';

  @override
  void initState() {
    super.initState();
    _space = WorkspaceDataService.getSpace(widget.spaceId);
    _loadDeskAvailability();
  }

  Future<void> _loadDeskAvailability() async {
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final results = await ApiClient.fetchDeskAvailability(widget.spaceId, todayStr);
    if (results != null && results.isNotEmpty) {
      final Map<String, bool> availabilityMap = {};
      for (final res in results) {
        final deskNumber = res['deskNumber']?.toString().toLowerCase();
        final id = res['id']?.toString();
        final isAvailable = res['isAvailable'] == true;
        if (deskNumber != null) {
          availabilityMap[deskNumber] = isAvailable;
        }
        if (id != null) {
          availabilityMap[id] = isAvailable;
        }
      }

      final List<SeatCategory> updatedCategories = _space.seatCategories.map((cat) {
        final updatedOptions = cat.options.map((opt) {
          final optId = opt.id;
          final labelKey = opt.label.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toLowerCase();
          
          bool isAvailable = true;
          bool hasMatch = false;

          if (availabilityMap.containsKey(optId)) {
            isAvailable = availabilityMap[optId]!;
            hasMatch = true;
          } else {
            for (final entry in availabilityMap.entries) {
              if (labelKey.contains(entry.key)) {
                isAvailable = entry.value;
                hasMatch = true;
                break;
              }
            }
          }

          if (hasMatch) {
            return SeatOption(
              id: opt.id,
              label: opt.label,
              price: opt.price,
              status: isAvailable ? 'available' : 'occupied',
              statusColor: isAvailable ? AppColors.available : AppColors.occupied,
              perks: opt.perks,
              imageUrl: opt.imageUrl,
              seatType: opt.seatType,
            );
          }
          return opt;
        }).toList();

        return SeatCategory(
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          description: cat.description,
          options: updatedOptions,
        );
      }).toList();

      setState(() {
        _space = SpaceInfo(
          id: _space.id,
          name: _space.name,
          subtitle: _space.subtitle,
          imageUrl: _space.imageUrl,
          rating: _space.rating,
          reviews: _space.reviews,
          startingPrice: _space.startingPrice,
          priceLabel: _space.priceLabel,
          description: _space.description,
          amenities: _space.amenities,
          badge: _space.badge,
          showSchedulePicker: _space.showSchedulePicker,
          seatCategories: updatedCategories,
        );
      });
    }
  }

  List<SeatOption> get _allOptions =>
      _space.seatCategories.expand((c) => c.options).toList();

  List<SeatOption> get _filteredOptions => _activeFilter == 'all'
      ? _allOptions
      : _allOptions.where((o) => o.seatType == _activeFilter).toList();

  void _selectCategory(SeatCategory cat) => setState(() {
    _selectedCategory = cat;
    _selectedOption = null;
    _step = 1;
  });

  void _goBack() {
    if (_step == 1) {
      setState(() {
        _step = 0;
        _selectedCategory = null;
        _selectedOption = null;
      });
    } else {
      Navigator.pop(context);
    }
  }

  void _proceed({SeatOption? opt}) {
    final selected = opt ?? _selectedOption;
    if (selected == null) return;
    final cat = _useFlatFilter
        ? _space.seatCategories.firstWhere(
          (c) => c.options.any((o) => o.id == selected.id),
      orElse: () => _space.seatCategories.first,
    )
        : _selectedCategory!;
    context.push('/checkout', extra: {
      'spaceName': _space.name,
      'spaceId': _space.id,
      'spaceImageUrl': _space.imageUrl,
      'seatCategory': cat.label,
      'seatType': selected.label,
      'seatTypeKey': selected.seatType,
      'price': selected.price,
      'perks': selected.perks,
      'deskId': selected.id,
    });
  }

  Widget _buildBottomBar(SeatOption? selected, VoidCallback onProceed) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant.withOpacity(0.2)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'ESTIMATED TOTAL',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.05,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    selected != null ? '${selected.priceLabel} / day' : 'Select a seat',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: selected == null ? null : onProceed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  disabledBackgroundColor: AppColors.surfaceContainerHighest,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Proceed',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right, size: 20, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_useFlatFilter) {
      final options = _filteredOptions;
      return Scaffold(
        backgroundColor: AppColors.background,
        bottomNavigationBar: _buildBottomBar(
          _filteredSelection,
              () => _proceed(opt: _filteredSelection),
        ),
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _AppBarSection(
                title: _space.name,
                subtitle: 'Select your seat',
                onBack: () => Navigator.pop(context),
              ),
              // Filter chip bar — fixed height, no Expanded needed
              SizedBox(
                height: 48,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: _kFilters.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final f = _kFilters[i];
                    final isActive = f.key == _activeFilter;
                    return GestureDetector(
                      onTap: () => setState(() {
                        _activeFilter = f.key;
                        _filteredSelection = null;
                      }),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isActive ? f.accent.withOpacity(0.18) : Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: isActive ? f.accent : AppColors.outlineVariant.withOpacity(0.5),
                            width: isActive ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(f.icon,
                                size: 15,
                                color: isActive ? f.accent : AppColors.onSurfaceVariant),
                            const SizedBox(width: 6),
                            Text(
                              f.label,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                                color: isActive ? f.accent : AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              // Count label
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Text(
                  '${options.length} seat${options.length == 1 ? '' : 's'} available',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurfaceVariant),
                ),
              ),
              // Seat list — Expanded fills remaining space between filter bar and bottom nav
              Expanded(
                child: options.isEmpty
                    ? _EmptyFilter(filterLabel: _filterFor(_activeFilter).label)
                    : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  itemCount: options.length,
                  itemBuilder: (ctx, i) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _OptionCard(
                      option: options[i],
                      isSelected: _filteredSelection?.id == options[i].id,
                      showTypeBadge: true,
                      onTap: () => setState(() => _filteredSelection = options[i]),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // ── 2-step layout ─────────────────────────────────────────────────────
    return Scaffold(
      backgroundColor: AppColors.background,
      bottomNavigationBar: _step == 1
          ? _buildBottomBar(_selectedOption, _proceed)
          : null,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _AppBarSection(
              title: _space.name,
              subtitle: _step == 0 ? 'Select a category' : _selectedCategory!.label,
              onBack: _goBack,
            ),
            _StepIndicator(step: _step),
            Expanded(
              child: _step == 0
                  ? _CategoryStep(space: _space, onSelect: _selectCategory)
                  : _OptionStep(
                category: _selectedCategory!,
                selectedOption: _selectedOption,
                onSelect: (o) => setState(() => _selectedOption = o),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------
class _TypeBadge extends StatelessWidget {
  final String seatType;
  const _TypeBadge({required this.seatType});

  @override
  Widget build(BuildContext context) {
    final f = _filterFor(seatType);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: f.accent.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: f.accent.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(f.icon, size: 11, color: f.accent),
          const SizedBox(width: 4),
          Text(
            f.label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: f.accent,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
class _EmptyFilter extends StatelessWidget {
  final String filterLabel;
  const _EmptyFilter({required this.filterLabel});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded,
              size: 56, color: AppColors.onSurfaceVariant.withOpacity(0.4)),
          const SizedBox(height: 12),
          Text(
            'No $filterLabel seats',
            style: GoogleFonts.inter(
                fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 4),
          Text(
            'Try a different filter',
            style: GoogleFonts.inter(
                fontSize: 13, color: AppColors.onSurfaceVariant.withOpacity(0.6)),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// App bar row
// ---------------------------------------------------------------------------
class _AppBarSection extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onBack;
  const _AppBarSection({required this.title, required this.subtitle, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: onBack,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.arrow_back, color: AppColors.primary, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title,
                  style: GoogleFonts.inter(
                      fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.onSurface)),
              Text(subtitle,
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.onSurfaceVariant)),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
class _StepIndicator extends StatelessWidget {
  final int step;
  const _StepIndicator({required this.step});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          _Dot(active: true, label: '1\nCategory'),
          Expanded(
            child: Container(
              height: 2,
              color: step >= 1 ? AppColors.primary : AppColors.outlineVariant.withOpacity(0.3),
            ),
          ),
          _Dot(active: step >= 1, label: '2\nOption'),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final bool active;
  final String label;
  const _Dot({required this.active, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: active ? AppColors.primaryContainer : AppColors.surfaceContainer,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              active ? Icons.check : Icons.circle_outlined,
              size: 14,
              color: active ? Colors.white : AppColors.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 9,
            color: active ? AppColors.primary : AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Step 0 — Category selection
// ---------------------------------------------------------------------------
class _CategoryStep extends StatelessWidget {
  final SpaceInfo space;
  final void Function(SeatCategory) onSelect;
  const _CategoryStep({required this.space, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Choose a seating category',
              style: GoogleFonts.inter(fontSize: 15, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          ...space.seatCategories.map((cat) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: _CategoryCard(category: cat, onTap: () => onSelect(cat)),
          )),
        ],
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final SeatCategory category;
  final VoidCallback onTap;
  const _CategoryCard({required this.category, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cheapest = category.options.isNotEmpty
        ? category.options.reduce((a, b) => a.price < b.price ? a : b)
        : null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(category.icon, color: AppColors.primary, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(category.label,
                      style: GoogleFonts.inter(
                          fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.onSurface)),
                  const SizedBox(height: 3),
                  Text(category.description,
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.onSurfaceVariant)),
                  if (cheapest != null) ...[
                    const SizedBox(height: 5),
                    Text(
                      'From ${cheapest.priceLabel}/day • ${category.options.length} options',
                      style: GoogleFonts.inter(
                          fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant, size: 22),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Option selection
// ---------------------------------------------------------------------------
class _OptionStep extends StatelessWidget {
  final SeatCategory category;
  final SeatOption? selectedOption;
  final void Function(SeatOption) onSelect;
  const _OptionStep({required this.category, required this.selectedOption, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Pick your preferred option',
              style: GoogleFonts.inter(fontSize: 15, color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 16),
          ...category.options.map((opt) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _OptionCard(
              option: opt,
              isSelected: selectedOption?.id == opt.id,
              showTypeBadge: false,
              onTap: () => onSelect(opt),
            ),
          )),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Option card
// ---------------------------------------------------------------------------
class _OptionCard extends StatelessWidget {
  final SeatOption option;
  final bool isSelected;
  final bool showTypeBadge;
  final VoidCallback onTap;
  const _OptionCard({
    required this.option,
    required this.isSelected,
    required this.showTypeBadge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isOccupied = option.status == 'occupied';
    
    // Calculate a stable, deterministic remaining time for occupied spaces
    final int hash = option.id.hashCode.abs();
    final int minutes = (hash % 6 + 1) * 30; // 30, 60, 90, 120, 150, 180 mins
    final String freeInText;
    if (minutes < 60) {
      freeInText = 'Free in $minutes mins';
    } else {
      final double hours = minutes / 60;
      if (hours == hours.toInt()) {
        freeInText = 'Free in ${hours.toInt()} ${hours.toInt() == 1 ? 'hr' : 'hrs'}';
      } else {
        freeInText = 'Free in ${hours.toStringAsFixed(1)} hrs';
      }
    }

    return GestureDetector(
      onTap: isOccupied ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryContainer.withOpacity(0.08)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.white.withOpacity(0.08),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Opacity(
          opacity: isOccupied ? 0.45 : 1.0,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(
                      option.imageUrl,
                      height: 150,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          Container(height: 150, color: AppColors.surfaceContainerHigh),
                    ),
                  ),
                  if (showTypeBadge)
                    Positioned(top: 8, left: 8, child: _TypeBadge(seatType: option.seatType)),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surface.withOpacity(0.85),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: isOccupied ? AppColors.occupied : option.statusColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isOccupied
                                ? 'Occupied'
                                : option.status == 'available'
                                ? 'Available'
                                : 'Filling Fast',
                            style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSurface),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isSelected)
                    Positioned(
                      top: showTypeBadge ? 36 : 8,
                      left: 8,
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: const BoxDecoration(
                          color: AppColors.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check, color: Colors.white, size: 16),
                      ),
                    ),
                  if (isOccupied)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.35),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.occupied.withOpacity(0.85),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'OCCUPIED',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  freeInText,
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white.withOpacity(0.9),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(option.label,
                        style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface)),
                  ),
                  Text('${option.priceLabel}/day',
                      style: GoogleFonts.inter(
                          fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: option.perks
                    .map((p) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    p.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                      letterSpacing: 0.04,
                    ),
                  ),
                ))
                    .toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}