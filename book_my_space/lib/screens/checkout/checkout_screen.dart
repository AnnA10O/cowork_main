import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../data/api_client.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> bookingData;
  const CheckoutScreen({super.key, required this.bookingData});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int _selectedPayment = 0;
  bool _loungeAccess = false;
  bool _printingCredits = false;
  bool _mealCombo = false;
  bool _isProcessing = false;
  final _couponController = TextEditingController();

  // Date & time selection
  DateTime _selectedDate = DateTime.now();
  String? _selectedTimeSlot;
  late DateTime _calendarFocusMonth;
  
  String? _pricingPlanId;

  double get _basePrice {
    final p = widget.bookingData['price'];
    if (p is double) return p;
    if (p is int) return p.toDouble();
    if (p is String) {
      // strip '£', '$', whitespace
      final cleaned = p.replaceAll(RegExp(r'[£$\s]'), '');
      return double.tryParse(cleaned) ?? 50.0;
    }
    return 50.0;
  }

  double get _addonsTotal {
    double t = 0;
    if (_loungeAccess) t += 15;
    if (_printingCredits) t += 5;
    if (_mealCombo) t += 22;
    return t;
  }

  double get _tax => ((_basePrice + _addonsTotal) * 0.1).roundToDouble();

  double get _total => _basePrice + _addonsTotal + _tax;

  String get _spaceName =>
      widget.bookingData['spaceName'] as String? ?? 'Workspace';

  String get _spaceImageUrl =>
      widget.bookingData['spaceImageUrl'] as String? ??
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80';

  String get _seatLabel {
    final cat = widget.bookingData['seatCategory'] as String?;
    final type = widget.bookingData['seatType'] as String?;
    if (cat != null && type != null) return '$cat › $type';
    if (type != null) return type;
    return 'Standard Seat';
  }

  List<String> get _perks {
    final p = widget.bookingData['perks'];
    if (p is List) return p.cast<String>();
    return [];
  }

  @override
  void initState() {
    super.initState();
    _calendarFocusMonth = DateTime(_selectedDate.year, _selectedDate.month);
    _loadPricingPlan();
  }

  Future<void> _loadPricingPlan() async {
    final spaceId = widget.bookingData['spaceId']?.toString();
    if (spaceId != null) {
      final details = await ApiClient.fetchWorkspaceDetail(spaceId);
      if (details != null) {
        final plans = details['pricingPlans'] as List?;
        if (plans != null && plans.isNotEmpty) {
          final dailyPlan = plans.firstWhere(
            (p) => p['type'] == 'DAILY',
            orElse: () => plans[0],
          );
          if (mounted) {
            setState(() {
              _pricingPlanId = dailyPlan['id']?.toString();
            });
          }
        }
      }
    }
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  Future<void> _onPayNow() async {
    final spaceId = widget.bookingData['spaceId']?.toString();
    final deskId = widget.bookingData['deskId']?.toString();
    final token = ApiClient.authToken;

    setState(() => _isProcessing = true);
    
    // Show demo processing dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _DemoPaymentDialog(
        amount: 'INR ${_total.toStringAsFixed(2)}',
        method: _selectedPayment == 0
            ? 'UPI / GPay'
            : _selectedPayment == 1
                ? 'Credit / Debit Card'
                : 'Net Banking',
      ),
    );

    Map<String, dynamic>? bookingResult;

    if (token != null && spaceId != null && deskId != null && _pricingPlanId != null) {
      final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 9, 0);
      final end = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 18, 0);
      final startTimeStr = start.toUtc().toIso8601String();
      final endTimeStr = end.toUtc().toIso8601String();
      
      bookingResult = await ApiClient.createBooking(
        workspaceId: spaceId,
        deskId: deskId,
        pricingPlanId: _pricingPlanId!,
        startTime: startTimeStr,
        endTime: endTimeStr,
        authToken: token,
      );
    }

    // Simulate processing delay
    await Future.delayed(const Duration(milliseconds: 1800));
    if (!mounted) return;
    Navigator.of(context).pop(); // close dialog
    setState(() => _isProcessing = false);

    final ref = bookingResult != null
        ? (bookingResult['id']?.toString().substring(0, 8).toUpperCase() ?? 'BMS-LIVE')
        : 'BMS-${DateTime.now().millisecondsSinceEpoch % 10000}';

    context.push('/confirmation', extra: {
      'spaceName': _spaceName,
      'spaceImageUrl': _spaceImageUrl,
      'seatType': _seatLabel,
      'ref': ref,
      'totalAmount': _total,
      'startTime': '09:00 AM',
      'endTime': '06:00 PM',
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _buildAppBar(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDateTimeSection(),
                  const SizedBox(height: 24),
                  _buildSummaryCard(),
                  const SizedBox(height: 24),
                  _buildAddons(),
                  const SizedBox(height: 20),
                  _buildCouponRow(),
                  const SizedBox(height: 20),
                  _buildPaymentMethods(),
                  const SizedBox(height: 20),
                  _buildPriceBreakdown(),
                ],
              ),
            ),
          ),
          // Sticky button is part of the body Column — avoids bottomNavigationBar
          // and bottomSheet timing issues that cause "render box never laid out".
          _buildStickyButton(),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // App bar
  // ---------------------------------------------------------------------------
  Widget _buildAppBar() {
    return SafeArea(
      child: Container(
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                child:
                    const Icon(Icons.arrow_back, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Checkout',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
            ),
            Text(
              _spaceName,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Date & Time selection
  // ---------------------------------------------------------------------------
  Widget _buildDateTimeSection() {
    final morningSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'];
    final afternoonSlots = ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ---- Section header ----
          Text(
            'Select Date',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),

          // ---- Month navigation ----
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: () => setState(() {
                  _calendarFocusMonth = DateTime(
                      _calendarFocusMonth.year, _calendarFocusMonth.month - 1);
                }),
                child: const Icon(Icons.chevron_left,
                    color: AppColors.onSurfaceVariant),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_monthName(_calendarFocusMonth.month).toUpperCase()} ${_calendarFocusMonth.year}',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => setState(() {
                  _calendarFocusMonth = DateTime(
                      _calendarFocusMonth.year, _calendarFocusMonth.month + 1);
                }),
                child: const Icon(Icons.chevron_right,
                    color: AppColors.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ---- Day-of-week headers ----
          Row(
            children: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
                .map(
                  (d) => Expanded(
                    child: Center(
                      child: Text(
                        d,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 6),

          // ---- Calendar grid ----
          _buildCalendarGrid(),

          const SizedBox(height: 20),

          // ---- Available Time Slots ----
          Text(
            'Available Time Slots',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 10),

          // Morning sessions
          Text(
            'MORNING SESSIONS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.06,
              color: AppColors.outline,
            ),
          ),
          const SizedBox(height: 8),
          _buildTimeSlotRow(morningSlots),
          const SizedBox(height: 12),

          // Afternoon sessions
          Text(
            'AFTERNOON SESSIONS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.06,
              color: AppColors.outline,
            ),
          ),
          const SizedBox(height: 8),
          _buildTimeSlotRow(afternoonSlots),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay =
        DateTime(_calendarFocusMonth.year, _calendarFocusMonth.month, 1);
    // Monday-based: Monday = 0
    final startOffset = (firstDay.weekday - 1) % 7;
    final daysInMonth =
        DateTime(_calendarFocusMonth.year, _calendarFocusMonth.month + 1, 0)
            .day;
    final totalCells = startOffset + daysInMonth;
    final rows = (totalCells / 7).ceil();
    final today = DateTime.now();

    return Column(
      children: List.generate(rows, (row) {
        return Row(
          children: List.generate(7, (col) {
            final cellIndex = row * 7 + col;
            final dayNum = cellIndex - startOffset + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return const Expanded(child: SizedBox(height: 36));
            }
            final cellDate = DateTime(
                _calendarFocusMonth.year, _calendarFocusMonth.month, dayNum);
            final isSelected = cellDate.year == _selectedDate.year &&
                cellDate.month == _selectedDate.month &&
                cellDate.day == _selectedDate.day;
            final isToday = cellDate.year == today.year &&
                cellDate.month == today.month &&
                cellDate.day == today.day;
            final isPast = cellDate.isBefore(DateTime(today.year, today.month, today.day));

            return Expanded(
              child: GestureDetector(
                onTap: isPast
                    ? null
                    : () => setState(() => _selectedDate = cellDate),
                child: Container(
                  margin: const EdgeInsets.all(2),
                  height: 34,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primaryContainer
                        : isToday
                            ? AppColors.primaryContainer.withOpacity(0.15)
                            : Colors.transparent,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$dayNum',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight:
                            isSelected || isToday ? FontWeight.w700 : FontWeight.w400,
                        color: isSelected
                            ? Colors.white
                            : isPast
                                ? AppColors.onSurfaceVariant.withOpacity(0.35)
                                : AppColors.onSurface,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      }),
    );
  }

  Widget _buildTimeSlotRow(List<String> slots) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 3.2,
      children: slots.map((slot) {
        final isSelected = _selectedTimeSlot == slot;
        return GestureDetector(
          onTap: () => setState(() => _selectedTimeSlot = slot),
          child: Container(
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primaryContainer
                  : AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(10),
              border: isSelected
                  ? null
                  : Border.all(
                      color: AppColors.outlineVariant.withOpacity(0.4)),
            ),
            child: Center(
              child: Text(
                slot,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.onSurface,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  String _monthName(int month) {
    const names = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[month];
  }

  // ---------------------------------------------------------------------------
  // Summary card
  // ---------------------------------------------------------------------------
  Widget _buildSummaryCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              _spaceImageUrl,
              width: 84,
              height: 84,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 84,
                height: 84,
                color: AppColors.surfaceContainerHigh,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _spaceName,
                  style: GoogleFonts.inter(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                // Seat label
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _seatLabel,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                // Perks
                if (_perks.isNotEmpty)
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: _perks
                        .take(3)
                        .map(
                          (p) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              p,
                              style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: AppColors.onSurfaceVariant),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.calendar_today,
                        size: 13, color: AppColors.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      'Today • Full Day',
                      style: GoogleFonts.inter(
                        fontSize: 12,
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
  // Add-ons
  // ---------------------------------------------------------------------------
  Widget _buildAddons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Enhance your experience',
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        _AddOnTile(
          icon: Icons.coffee,
          title: 'Lounge Access',
          subtitle: 'Unlimited coffee & refreshments',
          price: '+£15',
          isEnabled: _loungeAccess,
          onToggle: (v) => setState(() => _loungeAccess = v),
        ),
        _AddOnTile(
          icon: Icons.print,
          title: 'Printing Credits',
          subtitle: '50 pages high-quality BW/Color',
          price: '+£5',
          isEnabled: _printingCredits,
          onToggle: (v) => setState(() => _printingCredits = v),
        ),
        _AddOnTile(
          icon: Icons.restaurant,
          title: 'Meal Combo',
          subtitle: 'Chef-curated lunch & healthy snacks',
          price: '+£22',
          isEnabled: _mealCombo,
          onToggle: (v) => setState(() => _mealCombo = v),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Coupon
  // ---------------------------------------------------------------------------
  Widget _buildCouponRow() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'OFFERS & DISCOUNTS',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.05,
            color: AppColors.outline,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _couponController,
                style: GoogleFonts.inter(
                    fontSize: 14, color: AppColors.onSurface),
                decoration: InputDecoration(
                  hintText: 'Apply coupon code',
                  hintStyle: GoogleFonts.inter(
                      color: AppColors.onSurfaceVariant, fontSize: 14),
                  suffixIcon: const Icon(Icons.sell_outlined,
                      color: AppColors.onSurfaceVariant),
                  filled: true,
                  fillColor: AppColors.surfaceContainer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryContainer,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                'Apply',
                style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Payment methods
  // ---------------------------------------------------------------------------
  Widget _buildPaymentMethods() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Payment Method',
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        _PaymentOption(
          icon: Icons.account_balance_wallet,
          title: 'UPI / GPay',
          subtitle: 'Directly from your bank account',
          isSelected: _selectedPayment == 0,
          onTap: () => setState(() => _selectedPayment = 0),
        ),
        const SizedBox(height: 8),
        _PaymentOption(
          icon: Icons.credit_card,
          title: 'Credit / Debit Card',
          subtitle: 'Visa, Mastercard, Amex',
          isSelected: _selectedPayment == 1,
          onTap: () => setState(() => _selectedPayment = 1),
        ),
        const SizedBox(height: 8),
        _PaymentOption(
          icon: Icons.account_balance,
          title: 'Net Banking',
          subtitle: 'Choose from 50+ major banks',
          isSelected: _selectedPayment == 2,
          onTap: () => setState(() => _selectedPayment = 2),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Price breakdown
  // ---------------------------------------------------------------------------
  Widget _buildPriceBreakdown() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          _PriceLine('Base Price', '£${_basePrice.toStringAsFixed(2)}'),
          if (_loungeAccess) _PriceLine('Lounge Access', '£15.00'),
          if (_printingCredits) _PriceLine('Printing Credits', '£5.00'),
          if (_mealCombo) _PriceLine('Meal Combo', '£22.00'),
          _PriceLine('Tax & Service (10%)', '£${_tax.toStringAsFixed(2)}'),
          Divider(
              color: AppColors.outlineVariant.withOpacity(0.3), height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Amount',
                style: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                '£${_total.toStringAsFixed(2)}',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Sticky button
  // ---------------------------------------------------------------------------
  Widget _buildStickyButton() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      decoration: BoxDecoration(
        color: AppColors.background.withOpacity(0.97),
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant.withOpacity(0.3)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'DUE TODAY',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.05,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                Text(
                  '£${_total.toStringAsFixed(2)}',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : _onPayNow,
                icon: _isProcessing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const SizedBox.shrink(),
                label: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _isProcessing ? 'Processing...' : 'Pay Now',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    if (!_isProcessing) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.bolt, color: Colors.white, size: 20),
                    ],
                  ],
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  // Size(0,48): let Expanded control width, enforce 48px min height.
                  // Size.fromHeight(48) = Size(infinity,48) which conflicts with Expanded.
                  minimumSize: const Size(0, 48),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reusable sub-widgets
// ---------------------------------------------------------------------------
class _AddOnTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String price;
  final bool isEnabled;
  final Function(bool) onToggle;

  const _AddOnTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.isEnabled,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                      Text(
                        price,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Switch(
              value: isEnabled,
              onChanged: onToggle,
              activeColor: AppColors.primary,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryContainer.withOpacity(0.1)
              : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(12),
          border: isSelected
              ? Border.all(color: AppColors.primary.withOpacity(0.5))
              : null,
        ),
        child: Row(
          children: [
            Icon(icon,
                color:
                    isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
                size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected
                    ? AppColors.primary
                    : Colors.transparent,
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.outlineVariant,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceLine extends StatelessWidget {
  final String label;
  final String value;
  const _PriceLine(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
                fontSize: 13, color: AppColors.onSurfaceVariant),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Demo payment processing dialog (no real gateway)
// ---------------------------------------------------------------------------
class _DemoPaymentDialog extends StatelessWidget {
  final String amount;
  final String method;
  const _DemoPaymentDialog({required this.amount, required this.method});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Spinning indicator
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(
                  width: 56,
                  height: 56,
                  child: CircularProgressIndicator(
                    color: AppColors.primary,
                    strokeWidth: 3,
                  ),
                ),
                const Icon(Icons.lock_outline,
                    size: 24, color: AppColors.primary),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Processing Payment',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Please wait…',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            // Amount chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.credit_card,
                      size: 18, color: AppColors.onSurfaceVariant),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        method,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        amount,
                        style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '🔒  Secured by 256-bit encryption  •  Demo Mode',
              style: GoogleFonts.inter(
                fontSize: 10,
                color: AppColors.onSurfaceVariant.withOpacity(0.6),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}