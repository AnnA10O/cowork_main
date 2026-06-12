import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:developer' as dev;
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
  _SeatTypeFilter(
      key: 'all',
      label: 'All',
      icon: Icons.grid_view_rounded,
      accent: AppColors.primary),
  _SeatTypeFilter(
      key: 'shared_desk',
      label: 'Shared Desk',
      icon: Icons.weekend,
      accent: Color(0xFF60A5FA)),
  _SeatTypeFilter(
      key: 'dedicated_desk',
      label: 'Dedicated Desk',
      icon: Icons.computer,
      accent: Color(0xFFA78BFA)),
  _SeatTypeFilter(
      key: 'private_cabin',
      label: 'Private Cabin',
      icon: Icons.lock_outline,
      accent: Color(0xFFFBBF24)),
  _SeatTypeFilter(
      key: 'team_space',
      label: 'Team Space',
      icon: Icons.groups_outlined,
      accent: Color(0xFF34D399)),
  _SeatTypeFilter(
      key: 'meeting_room',
      label: 'Meeting Room',
      icon: Icons.meeting_room,
      accent: Color(0xFF2DD4BF)),
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

const Map<String, String> categoryDefaultImages = {
  'hot_desk':
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  'private_cabin':
      'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1200&q=80',
  'meeting_room':
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
  'shared_space':
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
  'event_hall':
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
  'virtual_office':
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80',
  'podcast_studio':
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&q=80',
  'training_room':
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
};

String _hourRangeChipLabel(String slot) {
  try {
    final format = DateFormat('hh:mm a');
    final parts = slot.split(' - ');
    final start = format.parse(parts.first);
    final end = format.parse(parts.last);
    final startHour = start.hour.toString().padLeft(2, '0');
    final endHour = end.hour.toString().padLeft(2, '0');
    return '$startHour - $endHour';
  } catch (_) {
    return slot;
  }
}

class SeatCategoryInfo {
  final String label;
  final IconData icon;
  final String description;
  SeatCategoryInfo(this.label, this.icon, this.description);
}

class _SeatSelectionScreenState extends State<SeatSelectionScreen> {
  SpaceInfo? _space;
  bool _isLoading = true;

  // ── 2-step flow (non-FMCIII) ──
  int _step = 0;
  SeatCategory? _selectedCategory;
  SeatOption? _selectedOption;

  // ── Flat-filter flow (FMCIII) ──
  String _activeFilter = 'all';
  SeatOption? _filteredSelection;

  bool get _useFlatFilter => widget.spaceId == 'fmciii';

  // ── Date and Time Selection ──
  DateTime _selectedDate = DateTime.now();
  final List<String> _selectedTimeSlots = [];
  final List<DateTime> _dates = [];
  final List<String> _timeSlots = [];

  @override
  void initState() {
    super.initState();
    _initDates();
    _loadLiveSpaceAndAvailability();
  }

  void _initDates() {
    final now = DateTime.now();
    for (int i = 0; i < 14; i++) {
      _dates.add(now.add(Duration(days: i)));
    }
    _generateTimeSlots();
  }

  void _generateTimeSlots() {
    _timeSlots.clear();
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;

    // Using 08:00 AM to 08:00 PM for typical workspace hours.
    for (int hour = 8; hour <= 19; hour++) {
      if (isToday && now.hour >= hour) {
        continue;
      }
      final startStr =
          DateFormat('hh:mm a').format(DateTime(2022, 1, 1, hour, 0));
      final endStr =
          DateFormat('hh:mm a').format(DateTime(2022, 1, 1, hour + 1, 0));
      _timeSlots.add('$startStr - $endStr');
    }

    if (_selectedTimeSlots.isEmpty && _timeSlots.isNotEmpty) {
      _selectedTimeSlots.add(_timeSlots.first);
    } else {
      _selectedTimeSlots.removeWhere((t) => !_timeSlots.contains(t));
      if (_selectedTimeSlots.isEmpty && _timeSlots.isNotEmpty) {
        _selectedTimeSlots.add(_timeSlots.first);
      }
    }
  }

  void _onDateSelected(DateTime date) {
    setState(() {
      _selectedDate = date;
      _generateTimeSlots();
    });
    _loadLiveSpaceAndAvailability();
  }

  void _onTimeSlotSelected(String time) {
    setState(() {
      if (_selectedTimeSlots.contains(time)) {
        _selectedTimeSlots.remove(time);
      } else {
        _selectedTimeSlots.clear();
        _selectedTimeSlots.add(time);
      }
    });
    _loadLiveSpaceAndAvailability();
  }

  SeatCategoryInfo getCategoryInfo(String type) {
    switch (type) {
      case 'private_cabin':
        return SeatCategoryInfo('Private Cabins', Icons.lock_outline,
            'Fully enclosed private workspaces');
      case 'meeting_room':
        return SeatCategoryInfo('Meeting Rooms', Icons.meeting_room,
            'Professional spaces for collaboration');
      case 'shared_space':
        return SeatCategoryInfo('Shared Spaces', Icons.groups_outlined,
            'Collaborative open environments');
      case 'event_hall':
        return SeatCategoryInfo('Event Halls', Icons.event,
            'Large spaces for events and gatherings');
      case 'virtual_office':
        return SeatCategoryInfo('Virtual Offices', Icons.business,
            'Professional business address and support');
      case 'podcast_studio':
        return SeatCategoryInfo('Podcast Studios', Icons.mic,
            'Acoustically treated audio recording rooms');
      case 'training_room':
        return SeatCategoryInfo('Training Rooms', Icons.school,
            'Classroom style rooms for learning');
      case 'hot_desk':
      default:
        return SeatCategoryInfo(
            'Hot Desks', Icons.weekend, 'Flexible desks in shared open area');
    }
  }

  Future<void> _loadLiveSpaceAndAvailability() async {
    setState(() => _isLoading = true);

    final data = await ApiClient.fetchWorkspaceDetail(widget.spaceId);
    if (data == null) {
      setState(() => _isLoading = false);
      return;
    }

    final plans = data['pricingPlans'] as List?;
    final double startingPrice = (plans != null && plans.isNotEmpty)
        ? double.tryParse(plans[0]['basePrice']?.toString() ?? '') ?? 0.0
        : 0.0;

    // Always use real uploaded images if available, regardless of useDefaultImages flag
    final images = data['images'] as List?;
    String imageUrl;
    final mainImages =
        images?.where((img) => (img['order'] as int? ?? -99) >= 0).toList() ??
            [];
    if (mainImages.isNotEmpty) {
      mainImages
          .sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
      imageUrl = mainImages.map((img) => img['url'].toString()).join(';');
    } else {
      final type = data['type'] as String? ?? 'hot_desk';
      imageUrl =
          categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
    }

    final amenitiesStrings = data['amenities'] as List?;
    final List<Map<String, dynamic>> mappedAmenities = [];
    if (amenitiesStrings != null) {
      for (final item in amenitiesStrings) {
        final str = item.toString().toLowerCase();
        IconData icon = Icons.check_circle_outline;
        if (str.contains('wifi'))
          icon = Icons.wifi;
        else if (str.contains('caf') || str.contains('coffee'))
          icon = Icons.coffee;
        else if (str.contains('print'))
          icon = Icons.print;
        else if (str.contains('parking'))
          icon = Icons.local_parking;
        else if (str.contains('ac') || str.contains('climate'))
          icon = Icons.ac_unit;
        else if (str.contains('meet'))
          icon = Icons.meeting_room;
        else if (str.contains('lounge')) icon = Icons.weekend;

        mappedAmenities.add({'icon': icon, 'label': item.toString()});
      }
    }

    final dateStr = _selectedDate.toIso8601String().substring(0, 10);
    String? startTimeStr;
    String? endTimeStr;
    if (_selectedTimeSlots.isNotEmpty) {
      try {
        final format = DateFormat('hh:mm a');
        final parsedTimes = _selectedTimeSlots.map((t) {
          final startPart = t.split(' - ').first;
          return format.parse(startPart);
        }).toList();
        parsedTimes.sort((a, b) => a.compareTo(b));

        final firstTime = parsedTimes.first;
        final lastTime = parsedTimes.last;

        final start = DateTime(_selectedDate.year, _selectedDate.month,
            _selectedDate.day, firstTime.hour, firstTime.minute);
        final end = DateTime(_selectedDate.year, _selectedDate.month,
                _selectedDate.day, lastTime.hour, lastTime.minute)
            .add(const Duration(hours: 1));

        startTimeStr = start.toUtc().toIso8601String();
        endTimeStr = end.toUtc().toIso8601String();
      } catch (e) {
        dev.log('Error parsing time slot: $e');
      }
    }

    final results = await ApiClient.fetchDeskAvailability(
        widget.spaceId, dateStr,
        startTime: startTimeStr, endTime: endTimeStr);
    final Map<String, bool> availabilityMap = {};
    if (results != null && results.isNotEmpty) {
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
    }

    final desks = data['desks'] as List?;
    final Map<String, List<SeatOption>> groupedDesks = {};
    final Map<String, int> categoryOrders = {
      'hot_desk': -1,
      'private_cabin': -2,
      'meeting_room': -3,
      'shared_space': -4,
      'event_hall': -5,
      'virtual_office': -6,
      'podcast_studio': -7,
      'training_room': -8
    };

    if (desks != null) {
      final Map<String, List<Map<String, dynamic>>> desksByTypeAndPrice = {};

      for (final desk in desks) {
        final premiumExtra =
            double.tryParse(desk['premiumExtra']?.toString() ?? '') ?? 0.0;
        final type = desk['type'] as String? ?? 'hot_desk';
        final price = startingPrice + premiumExtra;

        final groupKey = '${type}_$price';
        desksByTypeAndPrice.putIfAbsent(groupKey, () => []).add(desk);
      }

      desksByTypeAndPrice.forEach((groupKey, groupDesks) {
        final sampleDesk = groupDesks.first;
        final type = sampleDesk['type'] as String? ?? 'hot_desk';
        final premiumExtra =
            double.tryParse(sampleDesk['premiumExtra']?.toString() ?? '') ??
                0.0;
        final price = startingPrice + premiumExtra;

        int availableCount = 0;
        int totalCount = groupDesks.length;
        String? availableDeskId;

        for (final desk in groupDesks) {
          final deskId = desk['id'].toString();
          final deskNumberStr = desk['deskNumber']?.toString().toLowerCase();
          bool isAvailable = desk['isActive'] == true;
          if (availabilityMap.containsKey(deskId)) {
            isAvailable = availabilityMap[deskId]!;
          } else if (deskNumberStr != null &&
              availabilityMap.containsKey(deskNumberStr)) {
            isAvailable = availabilityMap[deskNumberStr]!;
          }
          if (isAvailable) {
            availableDeskId ??= deskId;
            availableCount++;
          }
        }

        // If none available, just use the first desk's ID but mark as occupied
        final bool isGroupAvailable = availableDeskId != null;
        final finalDeskId = availableDeskId ?? sampleDesk['id'].toString();

        String optionImageUrl =
            categoryDefaultImages[type] ?? categoryDefaultImages['hot_desk']!;
        // Use custom category image if uploaded (ignore useDefaultImages flag)
        if (images != null) {
          final targetOrder = categoryOrders[type] ?? 0;
          dynamic matchedImg;
          for (final img in images) {
            if (img['order'] == targetOrder) {
              matchedImg = img;
              break;
            }
          }
          if (matchedImg != null) {
            optionImageUrl = matchedImg['url'].toString();
          }
        }

        final info = getCategoryInfo(type);
        final labelPrefix = premiumExtra > 0 ? 'Premium ' : 'Standard ';

        final opt = SeatOption(
          id: finalDeskId,
          label: '$labelPrefix${info.label}',
          price: price,
          status: isGroupAvailable ? 'available' : 'occupied',
          statusColor:
              isGroupAvailable ? AppColors.available : AppColors.occupied,
          perks: [sampleDesk['description'] ?? 'Workspace Desk'],
          imageUrl: optionImageUrl,
          seatType: type,
          availableCount: availableCount,
          totalCount: totalCount,
        );
        groupedDesks.putIfAbsent(type, () => []).add(opt);
      });
    }

    final List<SeatCategory> categories = [];
    groupedDesks.forEach((type, options) {
      final info = getCategoryInfo(type);
      categories.add(SeatCategory(
        id: type,
        label: info.label,
        icon: info.icon,
        description: info.description,
        options: options,
      ));
    });

    setState(() {
      _space = SpaceInfo(
        id: data['id'].toString(),
        name: data['name'] ?? 'Workspace',
        subtitle: '${data['address'] ?? ''}, ${data['city'] ?? ''}',
        imageUrl: imageUrl,
        rating: () {
          final raw = data['rating'] ?? data['avgRating'];
          if (raw is double) return raw;
          if (raw is int) return raw.toDouble();
          if (raw is String) return double.tryParse(raw) ?? 0.0;
          return 0.0;
        }(),
        reviews: () {
          final raw = data['reviewCount'] ?? data['totalReviews'];
          if (raw is int) return raw;
          if (raw is String) return int.tryParse(raw) ?? 0;
          return 0;
        }(),
        startingPrice: startingPrice,
        priceLabel: '/ hour',
        description: data['description'] ?? 'Co-working workspace',
        amenities: mappedAmenities,
        badge: data['badge']?.toString(),
        showSchedulePicker: false,
        seatCategories: categories,
      );
      _isLoading = false;
    });
  }

  List<SeatOption> get _allOptions =>
      _space!.seatCategories.expand((c) => c.options).toList();

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
    final space = _space!;
    final cat = _useFlatFilter
        ? space.seatCategories.firstWhere(
            (c) => c.options.any((o) => o.id == selected.id),
            orElse: () => space.seatCategories.first,
          )
        : _selectedCategory!;
    context.push('/checkout', extra: {
      'spaceName': space.name,
      'spaceId': space.id,
      'spaceImageUrl': space.imageUrl,
      'seatCategory': cat.label,
      'seatType': selected.label,
      'seatTypeKey': selected.seatType,
      'price': selected.price,
      'perks': selected.perks,
      'deskId': selected.id,
      'selectedDate': _selectedDate.toIso8601String(),
      'selectedTimeSlots': _selectedTimeSlots,
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
                    selected != null
                        ? '${selected.priceLabel} × ${_selectedTimeSlots.length > 0 ? _selectedTimeSlots.length : 1} hrs'
                        : 'Select a seat',
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
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
                    const Icon(Icons.chevron_right,
                        size: 20, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateTimeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Date Selector (Horizontal)
        SizedBox(
          height: 65,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _dates.length,
            itemBuilder: (context, index) {
              final d = _dates[index];
              final isSelected = d.year == _selectedDate.year &&
                  d.month == _selectedDate.month &&
                  d.day == _selectedDate.day;
              return GestureDetector(
                onTap: () => _onDateSelected(d),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 50,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.outlineVariant.withOpacity(0.5)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(DateFormat('E').format(d).toUpperCase(),
                          style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.onSurfaceVariant)),
                      const SizedBox(height: 2),
                      Text(DateFormat('dd').format(d),
                          style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.onSurface)),
                      const SizedBox(height: 2),
                      Text(DateFormat('MMM').format(d).toUpperCase(),
                          style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.onSurfaceVariant)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        // Time Slot Selector (Horizontal)
        if (_timeSlots.isNotEmpty)
          SizedBox(
            height: 38,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _timeSlots.length,
              itemBuilder: (context, index) {
                final t = _timeSlots[index];
                final isSelected = _selectedTimeSlots.contains(t);
                return GestureDetector(
                  onTap: () => _onTimeSlotSelected(t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primaryContainer
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.outlineVariant.withOpacity(0.5)),
                    ),
                    child: Text(
                      _hourRangeChipLabel(t),
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                );
              },
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('No more slots available today',
                style: GoogleFonts.inter(fontSize: 13, color: AppColors.error)),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_space == null || _isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(
          child: CircularProgressIndicator(
            color: AppColors.primary,
          ),
        ),
      );
    }

    final space = _space!;
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
                title: space.name,
                subtitle: 'Select your seat',
                onBack: () => Navigator.pop(context),
                trailing: IconButton(
                  icon: const Icon(Icons.sync, color: AppColors.primary),
                  onPressed: _loadLiveSpaceAndAvailability,
                ),
              ),
              _buildDateTimeSelector(),
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
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isActive
                              ? f.accent.withOpacity(0.18)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: isActive
                                ? f.accent
                                : AppColors.outlineVariant.withOpacity(0.5),
                            width: isActive ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(f.icon,
                                size: 15,
                                color: isActive
                                    ? f.accent
                                    : AppColors.onSurfaceVariant),
                            const SizedBox(width: 6),
                            Text(
                              f.label,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isActive
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: isActive
                                    ? f.accent
                                    : AppColors.onSurfaceVariant,
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
                  style: GoogleFonts.inter(
                      fontSize: 13, color: AppColors.onSurfaceVariant),
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
                            onTap: () =>
                                setState(() => _filteredSelection = options[i]),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      );
    }

    // -- 2-step layout -----------------------------------------------------
    return WillPopScope(
      onWillPop: () async {
        if (_step == 1) {
          setState(() {
            _step = 0;
            _selectedCategory = null;
            _selectedOption = null;
          });
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        bottomNavigationBar:
            _step == 1 ? _buildBottomBar(_selectedOption, _proceed) : null,
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _AppBarSection(
                title: space.name,
                subtitle:
                    _step == 0 ? 'Select a category' : _selectedCategory!.label,
                onBack: _goBack,
                trailing: IconButton(
                  icon: const Icon(Icons.sync, color: AppColors.primary),
                  onPressed: _loadLiveSpaceAndAvailability,
                ),
              ),
              _buildDateTimeSelector(),
              _StepIndicator(step: _step),
              Expanded(
                child: _step == 0
                    ? _CategoryStep(space: space, onSelect: _selectCategory)
                    : _OptionStep(
                        category: _selectedCategory!,
                        selectedOption: _selectedOption,
                        onSelect: (o) => setState(() => _selectedOption = o),
                      ),
              ),
            ],
          ),
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
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 4),
          Text(
            'Try a different filter',
            style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.onSurfaceVariant.withOpacity(0.6)),
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
  final Widget? trailing;
  const _AppBarSection(
      {required this.title,
      required this.subtitle,
      required this.onBack,
      this.trailing});

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
              child: const Icon(Icons.arrow_back,
                  color: AppColors.primary, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title,
                    style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface)),
                Text(subtitle,
                    style: GoogleFonts.inter(
                        fontSize: 13, color: AppColors.onSurfaceVariant)),
              ],
            ),
          ),
          if (trailing != null) trailing!,
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
              color: step >= 1
                  ? AppColors.primary
                  : AppColors.outlineVariant.withOpacity(0.3),
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
            color: active
                ? AppColors.primaryContainer
                : AppColors.surfaceContainer,
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
              style: GoogleFonts.inter(
                  fontSize: 15, color: AppColors.onSurfaceVariant)),
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

    int totalAvailable = 0;
    int totalSeats = 0;
    for (var opt in category.options) {
      totalAvailable += opt.availableCount;
      totalSeats += opt.totalCount;
    }

    bool isLowSeats = totalSeats > 0 &&
        (totalAvailable / totalSeats) <= 0.20 &&
        totalAvailable > 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child:
                      Icon(category.icon, color: AppColors.primary, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(category.label,
                          style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurface)),
                      const SizedBox(height: 3),
                      Text(category.description,
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppColors.onSurfaceVariant)),
                      if (cheapest != null) ...[
                        const SizedBox(height: 5),
                        Text(
                          'From ${cheapest.priceLabel}/hour • ${category.options.length} options',
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary),
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.onSurfaceVariant, size: 22),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Seats remaining: $totalAvailable',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: totalAvailable == 0
                        ? AppColors.occupied
                        : AppColors.onSurfaceVariant,
                  ),
                ),
                if (isLowSeats)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                      border:
                          Border.all(color: Colors.redAccent.withOpacity(0.5)),
                    ),
                    child: Text(
                      'Low seats remaining',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.redAccent,
                      ),
                    ),
                  ),
              ],
            ),
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
  const _OptionStep(
      {required this.category,
      required this.selectedOption,
      required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Pick your preferred option',
              style: GoogleFonts.inter(
                  fontSize: 15, color: AppColors.onSurfaceVariant)),
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
    const String freeInText = 'Currently occupied';

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
            color:
                isSelected ? AppColors.primary : Colors.white.withOpacity(0.08),
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
                      errorBuilder: (_, __, ___) => Container(
                          height: 150, color: AppColors.surfaceContainerHigh),
                    ),
                  ),
                  if (showTypeBadge)
                    Positioned(
                        top: 8,
                        left: 8,
                        child: _TypeBadge(seatType: option.seatType)),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
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
                              color: isOccupied
                                  ? AppColors.occupied
                                  : option.statusColor,
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
                        child: const Icon(Icons.check,
                            color: Colors.white, size: 16),
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
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
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
                  Text('${option.priceLabel}/hour',
                      style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: option.perks
                    .map((p) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 3),
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
