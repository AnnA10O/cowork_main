import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../data/api_client.dart';
import '../../theme/app_colors.dart';

class SpaceTypeScreen extends StatefulWidget {
  const SpaceTypeScreen({super.key});

  @override
  State<SpaceTypeScreen> createState() => _SpaceTypeScreenState();
}

class _SpaceTypeScreenState extends State<SpaceTypeScreen> {
  Map<String, int> _typeCounts = {};
  bool _isLoading = true;

  static const _types = [
    _SpaceType(id: 'hot_desk',       label: 'Hot Desk',        subtitle: 'Flexible open desks, hourly or daily',   icon: Icons.desktop_windows_outlined, filledIcon: Icons.desktop_windows, color: Color(0xFF2563EB), tag: 'Most Popular'),
    _SpaceType(id: 'private_cabin',  label: 'Private Cabin',   subtitle: 'Enclosed 1–2 person focus rooms',        icon: Icons.meeting_room_outlined,    filledIcon: Icons.meeting_room,    color: Color(0xFF7C3AED), tag: null),
    _SpaceType(id: 'meeting_room',   label: 'Meeting Room',    subtitle: 'Boardrooms for 4–20 people',             icon: Icons.groups_outlined,          filledIcon: Icons.groups,          color: Color(0xFF059669), tag: null),
    _SpaceType(id: 'shared_space',   label: 'Shared Space',    subtitle: 'Collaborative open-plan floors',         icon: Icons.people_outlined,          filledIcon: Icons.people,          color: Color(0xFFD97706), tag: null),
    _SpaceType(id: 'event_hall',     label: 'Event Hall',      subtitle: 'Large halls for 50–500 attendees',       icon: Icons.event_outlined,           filledIcon: Icons.event,           color: Color(0xFFDC2626), tag: 'Premium'),
    _SpaceType(id: 'virtual_office', label: 'Virtual Office',  subtitle: 'Business address & mail services',       icon: Icons.language_outlined,        filledIcon: Icons.language,        color: Color(0xFF0284C7), tag: null),
    _SpaceType(id: 'podcast_studio', label: 'Podcast Studio',  subtitle: 'Soundproof recording booths',            icon: Icons.mic_outlined,             filledIcon: Icons.mic,             color: Color(0xFFDB2777), tag: 'New'),
    _SpaceType(id: 'training_room',  label: 'Training Room',   subtitle: 'Classroom-style for workshops',          icon: Icons.school_outlined,          filledIcon: Icons.school,          color: Color(0xFF0D9488), tag: null),
  ];

  @override
  void initState() {
    super.initState();
    _loadCounts();
  }

  Future<void> _loadCounts() async {
    final results = await ApiClient.fetchWorkspaces();
    if (results != null && mounted) {
      final Map<String, int> counts = {};
      for (final w in results) {
        final type = w['type']?.toString() ?? '';
        if (type.isNotEmpty) {
          counts[type] = (counts[type] ?? 0) + 1;
        }
      }
      setState(() {
        _typeCounts = counts;
        _isLoading = false;
      });
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _countLabel(String typeId) {
    if (_isLoading) return 'Loading...';
    final count = _typeCounts[typeId] ?? 0;
    if (count == 0) return 'None available';
    return '$count available';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.background,
            elevation: 0,
            automaticallyImplyLeading: false,
            titleSpacing: 20,
            title: Row(
              children: [
                const Icon(Icons.location_on, color: AppColors.primary, size: 20),
                const SizedBox(width: 6),
                Text(
                  'India',
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
                icon: const Icon(Icons.notifications_outlined,
                    color: AppColors.onSurfaceVariant),
                onPressed: () {},
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What are you\nlooking for?',
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                      letterSpacing: -0.5,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Choose a space type to browse available options',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () => context.push('/spaces?type=all'),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainer,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.outlineVariant.withOpacity(0.3),
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(
                        children: [
                          const Icon(Icons.search, color: AppColors.outline, size: 20),
                          const SizedBox(width: 10),
                          Text(
                            'Search all workspaces...',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
              ),
              delegate: SliverChildBuilderDelegate(
                    (context, i) => _SpaceTypeCard(
                  type: _types[i],
                  count: _countLabel(_types[i].id),
                ),
                childCount: _types.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _SpaceTypeCard extends StatelessWidget {
  final _SpaceType type;
  final String count;
  const _SpaceTypeCard({required this.type, required this.count}); // ← fixed

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/spaces?type=${type.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.outlineVariant.withOpacity(0.2),
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: 0, left: 0, right: 0, height: 4,
              child: Container(
                decoration: BoxDecoration(
                  color: type.color,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
              ),
            ),
            if (type.tag != null)
              Positioned(
                top: 12, right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: type.color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: type.color.withOpacity(0.4)),
                  ),
                  child: Text(
                    type.tag!,
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                      color: type.color,
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 20, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: type.color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(type.filledIcon, color: type.color, size: 24),
                  ),
                  const Spacer(),
                  Text(
                    type.label,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    type.subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppColors.onSurfaceVariant,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        width: 6, height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.available,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          count, // ← dynamic
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurfaceVariant,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.arrow_forward_ios, size: 12, color: type.color),
                    ],
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

// ---------------------------------------------------------------------------

class _SpaceType {
  final String id;
  final String label;
  final String subtitle;
  final IconData icon;
  final IconData filledIcon;
  final Color color;
  final String? tag;

  const _SpaceType({
    required this.id,
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.filledIcon,
    required this.color,
    this.tag,
  });
}