import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_colors.dart';
import '../../data/api_client.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _refresh() {
    setState(() {});
  }

  void _showWorkspacePreferences(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    String currentPref = prefs.getString('pref_type') ?? '';

    if (!context.mounted) return;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Workspace Preferences', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.onSurface)),
                  const SizedBox(height: 16),
                  ...[
                    {'label': 'All Types', 'value': ''},
                    {'label': 'Hot Desks', 'value': 'hot_desk'},
                    {'label': 'Private Cabins', 'value': 'private_cabin'},
                    {'label': 'Meeting Rooms', 'value': 'meeting_room'},
                  ].map((type) => RadioListTile<String>(
                        title: Text(type['label']!, style: GoogleFonts.inter(color: AppColors.onSurface)),
                        value: type['value']!,
                        groupValue: currentPref,
                        activeColor: AppColors.primary,
                        onChanged: (val) {
                          setModalState(() => currentPref = val!);
                          prefs.setString('pref_type', val!);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Workspace preference saved.')));
                        },
                      )),
                ],
              ),
            );
          }
        );
      },
    );
  }

  void _showLocationSettings(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    String currentCity = prefs.getString('pref_city') ?? '';

    if (!context.mounted) return;

    final controller = TextEditingController(text: currentCity);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Location Settings', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.onSurface)),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                style: GoogleFonts.inter(color: AppColors.onSurface),
                decoration: InputDecoration(
                  hintText: 'Enter your city (e.g. Mumbai, Kochi, Surat)',
                  hintStyle: GoogleFonts.inter(color: AppColors.onSurfaceVariant),
                  filled: true,
                  fillColor: AppColors.surfaceContainer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final val = controller.text.trim();
                    prefs.setString('pref_city', val);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(val.isEmpty ? 'Location preference cleared.' : 'Location set to $val.')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('Save Location', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _showLanguageSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Select Language', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.onSurface)),
              const SizedBox(height: 16),
              ListTile(
                title: Text('English', style: GoogleFonts.inter(color: AppColors.onSurface)),
                trailing: const Icon(Icons.check, color: AppColors.primary),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                title: Text('हिंदी (Hindi)', style: GoogleFonts.inter(color: AppColors.onSurface)),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Hindi language support coming soon!')));
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPaymentMethods(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Payment Methods', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.onSurface)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.account_balance_wallet, color: AppColors.primary),
                title: Text('UPI (GPay, PhonePe, Paytm)', style: GoogleFonts.inter(color: AppColors.onSurface)),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                leading: const Icon(Icons.credit_card, color: AppColors.primary),
                title: Text('Credit / Debit Card', style: GoogleFonts.inter(color: AppColors.onSurface)),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                leading: const Icon(Icons.account_balance, color: AppColors.primary),
                title: Text('Net Banking', style: GoogleFonts.inter(color: AppColors.onSurface)),
                onTap: () => Navigator.pop(context),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.security, size: 16, color: AppColors.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Payments are securely processed by Razorpay.',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.onSurfaceVariant),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surfaceContainer,
        title: Text('About Book My Space', style: GoogleFonts.inter(color: AppColors.onSurface, fontWeight: FontWeight.bold)),
        content: Text('Version 1.0.0\nMade with ❤️ in India.\n\nBook My Space connects you with the best co-working spaces, private cabins, and meeting rooms across the country.',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK', style: GoogleFonts.inter(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showRateApp(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surfaceContainer,
        title: Text('Enjoying the app?', style: GoogleFonts.inter(color: AppColors.onSurface, fontWeight: FontWeight.bold)),
        content: Text('If you like using Book My Space, please take a moment to rate us on the Play Store.',
            style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('LATER', style: GoogleFonts.inter(color: AppColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: AppColors.onPrimary),
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Redirecting to Play Store...')));
            },
            child: const Text('RATE NOW'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(
          'My Account',
          style: GoogleFonts.inter(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_horiz_rounded, color: AppColors.onSurfaceVariant),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile header card
            _ProfileHeader(),
            const SizedBox(height: 16),

            // Stats row
            _StatsRow(),
            const SizedBox(height: 24),

            // Account section
            _SectionLabel('Account'),
            const SizedBox(height: 8),
            _MenuGroup(items: [
              _MenuItem(
                  icon: Icons.person_outline_rounded, 
                  label: 'Edit Profile', 
                  onTap: () async {
                    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen()));
                    if (result == true) {
                      _refresh();
                    }
                  }),
              _MenuItem(
                  icon: Icons.credit_card_rounded, label: 'Payment Methods', onTap: () => _showPaymentMethods(context)),
              _MenuItem(
                  icon: Icons.notifications_none_rounded, label: 'Notifications', onTap: () {}),
            ]),
            const SizedBox(height: 20),

            // Preferences section
            _SectionLabel('Preferences'),
            const SizedBox(height: 8),
            _MenuGroup(items: [
              _MenuItem(
                  icon: Icons.tune_rounded, label: 'Workspace Preferences', onTap: () => _showWorkspacePreferences(context)),
              _MenuItem(
                  icon: Icons.location_on_outlined, label: 'Location Settings', onTap: () => _showLocationSettings(context)),
              _MenuItem(
                  icon: Icons.language_rounded, label: 'Language', onTap: () => _showLanguageSettings(context)),
            ]),
            const SizedBox(height: 20),

            // Support section
            _SectionLabel('Support'),
            const SizedBox(height: 8),
            _MenuGroup(items: [
              _MenuItem(
                  icon: Icons.help_outline_rounded, label: 'Help Center', onTap: () {}),
              _MenuItem(
                  icon: Icons.star_outline_rounded, label: 'Rate the App', onTap: () => _showRateApp(context)),
              _MenuItem(
                  icon: Icons.info_outline_rounded, label: 'About', onTap: () => _showAbout(context)),
            ]),
            const SizedBox(height: 28),

            // Sign out button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  // Sign out from Firebase Auth
                  await FirebaseAuth.instance.signOut();
                  // Sign out from Google
                  await GoogleSignIn().signOut();
                  // Logout in ApiClient
                  await ApiClient.logout();
                  if (context.mounted) {
                    context.go('/login');
                  }
                },
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: Text(
                  'Sign Out',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFEF4444),
                  side: BorderSide(color: const Color(0xFFEF4444).withOpacity(0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final user = ApiClient.currentUser;
    final name = user?['name'] ?? 'Guest User';
    final email = user?['email'] ?? 'guest@coworkhq.in';

    // Calculate initials
    String initials = 'G';
    final nameParts = name.trim().split(RegExp(r'\s+'));
    if (nameParts.isNotEmpty) {
      if (nameParts.length > 1) {
        initials = '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase();
      } else if (nameParts[0].length > 1) {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      } else if (nameParts[0].isNotEmpty) {
        initials = nameParts[0][0].toUpperCase();
      }
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          // Avatar with initials
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryContainer,
            ),
            child: Center(
              child: Text(
                initials,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 24,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: GoogleFonts.inter(
                          color: AppColors.onSurface,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Premium badge
                    if (ApiClient.currentUser?['plan']?.toString().toUpperCase() == 'PRO')
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFD97706), Color(0xFFF59E0B)],
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'PRO',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 9,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  email,
                  style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 11, color: AppColors.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                        () {
                        final createdAt = ApiClient.currentUser?['createdAt']?.toString();
                        if (createdAt != null) {
                          try {
                            final dt = DateTime.parse(createdAt);
                            return 'Member since ${DateFormat('MMM yyyy').format(dt)}';
                          } catch (_) {}
                        }
                        return 'Member';
                      }(),
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11,
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

class _StatsRow extends StatefulWidget {
  @override
  State<_StatsRow> createState() => _StatsRowState();
}

class _StatsRowState extends State<_StatsRow> {
  int _bookingCount = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = ApiClient.authToken;
    if (token != null) {
      final results = await ApiClient.fetchMyBookings(token);
      if (mounted) {
        setState(() {
          _bookingCount = results?.length ?? 0;
          _isLoading = false;
        });
      }
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          _StatItem(
            value: _isLoading ? '...' : '$_bookingCount',
            label: 'Bookings',
          ),
          _VerticalDivider(),
          _StatItem(value: '-', label: 'Saved'),
          _VerticalDivider(),
          _StatItem(value: '-', label: 'Rating'),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.inter(
              color: AppColors.primary,
              fontWeight: FontWeight.w800,
              fontSize: 22,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              color: AppColors.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 36, color: Colors.white12);
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.inter(
        color: AppColors.onSurfaceVariant,
        fontWeight: FontWeight.w600,
        fontSize: 12,
        letterSpacing: 1.0,
      ),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  final List<_MenuItem> items;
  const _MenuGroup({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          return Column(
            children: [
              _ProfileMenuItem(
                icon: item.icon,
                label: item.label,
                onTap: item.onTap,
              ),
              if (i < items.length - 1)
                const Divider(color: Colors.white10, height: 1, indent: 52),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuItem({required this.icon, required this.label, required this.onTap});
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.inter(
                  color: AppColors.onSurface,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.onSurfaceVariant, size: 20),
          ],
        ),
      ),
    );
  }
}