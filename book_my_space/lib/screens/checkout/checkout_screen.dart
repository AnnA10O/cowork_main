import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:developer' as dev;
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
  List<Map<String, dynamic>> _extraServices = [];
  Map<String, int> _selectedExtrasQuantities = {};
  bool _isProcessing = false;
  final _couponController = TextEditingController();
  Map<String, dynamic>? _workspaceDetails;
  List<Map<String, dynamic>> _publicCoupons = [];
  Map<String, dynamic>? _selectedCouponDetails;
  String? _couponError;

  DateTime _selectedDate = DateTime.now();
  List<String> _selectedTimeSlots = [];
  List<String> _timeSlots = [];
  String? _selectedTimeSlot;
  
  String? _pricingPlanId;
  bool _isLoadingPlans = true;
  List<Map<String, dynamic>> _pricingPlans = [];
  List<Map<String, dynamic>> _workingHours = [];
  
  final _hoursController = TextEditingController(text: '1');
  int _hoursPerDay = 1;

  @override
  void initState() {
    super.initState();
    final dStr = widget.bookingData['selectedDate'] as String?;
    if (dStr != null) {
      _selectedDate = DateTime.parse(dStr);
    }
    _generateTimeSlots();
    
    final slots = widget.bookingData['selectedTimeSlots'] as List<dynamic>?;
    if (slots != null && slots.isNotEmpty) {
      _selectedTimeSlots = slots.cast<String>().toList();
      _selectedTimeSlot = _selectedTimeSlots.first;
      _hoursPerDay = _selectedTimeSlots.length;
      _hoursController.text = _hoursPerDay.toString();
    } else {
      final singleSlot = widget.bookingData['selectedTimeSlot'] as String?;
      if (singleSlot != null) {
        _selectedTimeSlot = singleSlot;
        _selectedTimeSlots = [singleSlot];
      }
    }
    _hoursController.addListener(() {
      final val = int.tryParse(_hoursController.text) ?? 1;
      setState(() => _hoursPerDay = val);
    });
    _loadPricingPlan();
    _loadExtraServices();
  }

  void _generateTimeSlots() {
    _timeSlots.clear();
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;
    
    for (int hour = 8; hour <= 19; hour++) {
      if (isToday && now.hour >= hour) {
        continue;
      }
      final startStr = DateFormat('hh:mm a').format(DateTime(2022, 1, 1, hour, 0));
      final endStr = DateFormat('hh:mm a').format(DateTime(2022, 1, 1, hour + 1, 0));
      _timeSlots.add('$startStr - $endStr');
    }
  }

  void _onTimeSlotSelected(String time) {
    setState(() {
      if (_selectedTimeSlots.contains(time)) {
        _selectedTimeSlots.remove(time);
      } else {
        _selectedTimeSlots.add(time);
      }
      if (_selectedTimeSlots.isNotEmpty) {
        _selectedTimeSlot = _selectedTimeSlots.first;
      } else {
        _selectedTimeSlot = null;
      }
    });
  }

  Future<void> _loadExtraServices() async {
    final spaceId = widget.bookingData['spaceId']?.toString();
    if (spaceId != null) {
      final extras = await ApiClient.fetchExtraServices(spaceId);
      if (extras != null && mounted) {
        setState(() {
          _extraServices = extras.where((e) => e['isActive'] == true).toList();
          for (var e in _extraServices) {
            _selectedExtrasQuantities[e['id']] = 0;
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _couponController.dispose();
    _hoursController.dispose();
    super.dispose();
  }

  double get _basePrice {
    if (_pricingPlanId != null && _pricingPlans.isNotEmpty) {
      final plan = _pricingPlans.firstWhere(
        (p) => p['id']?.toString() == _pricingPlanId,
        orElse: () => _pricingPlans.first,
      );
      final price = plan['basePrice'] ?? plan['price'];
      if (price is double) return price;
      if (price is int) return price.toDouble();
      if (price is String) return double.tryParse(price) ?? 50.0;
    }
    
    // Fallback to widget data
    final p = widget.bookingData['price'];
    if (p is double) return p;
    if (p is int) return p.toDouble();
    if (p is String) {
      final cleaned = p.replaceAll(RegExp(r'[£$\s]'), '');
      return double.tryParse(cleaned) ?? 50.0;
    }
    return 50.0;
  }

  double get _discountAmount {
    if (_selectedCouponDetails == null) return 0.0;
    
    final basePrice = _calculatedPlanPrice;
    final minVal = _selectedCouponDetails!['minOrderValue'] != null 
        ? double.tryParse(_selectedCouponDetails!['minOrderValue'].toString()) ?? 0.0
        : 0.0;

    if (minVal > 0 && basePrice < minVal) {
      return 0.0; // Invalid, min value not met
    }

    double discount = 0.0;
    final flat = _selectedCouponDetails!['discountFlat'];
    final pct = _selectedCouponDetails!['discountPercent'];
    
    if (flat != null && flat.toString() != '0' && flat.toString().isNotEmpty) {
      discount = double.tryParse(flat.toString()) ?? 0.0;
    } else if (pct != null && pct.toString() != '0' && pct.toString().isNotEmpty) {
      final p = double.tryParse(pct.toString()) ?? 0.0;
      discount = basePrice * (p / 100);
    }
    
    // Ensure discount doesn't exceed basePrice
    return discount > basePrice ? basePrice : discount;
  }

  double get _addonsTotal {
    double t = 0;
    for (var e in _extraServices) {
      final q = _selectedExtrasQuantities[e['id']] ?? 0;
      if (q > 0) {
        final p = e['price'];
        if (p is double) t += (p * q);
        if (p is int) t += (p.toDouble() * q);
        if (p is String) t += ((double.tryParse(p) ?? 0) * q);
      }
    }
    return t;
  }

  double get _tax => (((_calculatedPlanPrice - _discountAmount) + _addonsTotal) * 0.1).roundToDouble();

  double get _calculatedPlanPrice {
    double planPrice = _basePrice;
    if (_pricingPlanId != null && _pricingPlans.isNotEmpty) {
      final plan = _pricingPlans.firstWhere(
        (p) => p['id']?.toString() == _pricingPlanId,
        orElse: () => _pricingPlans.first,
      );
      final type = plan['type'];
      
      
      if (type == 'HOURLY') {
        if (_selectedTimeSlots.isNotEmpty) {
          planPrice = _basePrice * _selectedTimeSlots.length;
        } else {
          planPrice = _basePrice * _hoursPerDay;
        }
      } else {
        planPrice = _basePrice; // The basePrice for daily, weekly, monthly is already for that duration!
      }
    }
    return planPrice;
  }

  double get _total => (_calculatedPlanPrice - _discountAmount) + _addonsTotal + _tax;

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

  // (InitState moved up)

  Future<void> _loadPricingPlan() async {
    final spaceId = widget.bookingData['spaceId']?.toString();
    if (spaceId != null) {
      final details = await ApiClient.fetchWorkspaceDetail(spaceId);
      if (details != null) {
        _workspaceDetails = details;
        final couponsList = details['coupons'] as List?;
        if (couponsList != null) {
          _publicCoupons = couponsList.cast<Map<String, dynamic>>().toList();
        }
        final plans = details['pricingPlans'] as List?;
        if (plans != null && plans.isNotEmpty) {
          final activePlans = plans.where((p) => p['isActive'] == true).cast<Map<String, dynamic>>().toList();
          if (activePlans.isNotEmpty) {
            final hourlyPlan = activePlans.firstWhere(
              (p) => p['type'] == 'HOURLY',
              orElse: () => activePlans[0],
            );
            if (mounted) {
              setState(() {
                _pricingPlans = activePlans;
                _pricingPlanId = hourlyPlan['id']?.toString();
                if (details['workingHours'] != null) {
                  _workingHours = (details['workingHours'] as List).cast<Map<String, dynamic>>();
                }
              });
            }
          }
        }
      }
    }
    if (mounted) {
      setState(() {
        _isLoadingPlans = false;
      });
    }
  }

  // (Dispose moved up)

  Future<void> _onPayNow() async {
    final spaceId = widget.bookingData['spaceId']?.toString();
    final deskId = widget.bookingData['deskId']?.toString();
    final token = ApiClient.authToken;

    setState(() => _isProcessing = true);
    
    if (_pricingPlanId != null && _pricingPlans.isNotEmpty) {
      final plan = _pricingPlans.firstWhere(
        (p) => p['id']?.toString() == _pricingPlanId,
        orElse: () => _pricingPlans.first,
      );
      
      if (plan['type'] == 'DAILY' && _hoursPerDay <= 1) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Daily plans require booking for more than 1 hour.')),
        );
        return;
      }
    }
    
    if (_pricingPlanId != null && _selectedTimeSlot != null && _pricingPlans.isNotEmpty) {
      try {
        final plan = _pricingPlans.firstWhere(
          (p) => p['id']?.toString() == _pricingPlanId,
          orElse: () => _pricingPlans.first,
        );
        if (plan['type'] == 'HOURLY') {
          final format = DateFormat('hh:mm a');
          final rawTime = _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots.first : _selectedTimeSlot!;
          final parsedTime = format.parse(rawTime.split(' - ').first);
          final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, parsedTime.hour, parsedTime.minute);
          final end = start.add(Duration(hours: _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots.length : _hoursPerDay));
          
          // Operating hours: 9 AM to 6 PM
          if (start.hour < 9 || end.hour > 18 || (end.hour == 18 && end.minute > 0) || start.hour >= 18) {
            setState(() => _isProcessing = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Cannot exceed operating hours (09:00 AM - 06:00 PM).')),
            );
            return;
          }
        }
      } catch (e) {
        dev.log('Error checking operating hours: $e');
      }
    }

    // Show demo processing dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _DemoPaymentDialog(
        amount: '₹ ${_total.toStringAsFixed(2)}',
        method: _selectedPayment == 0
            ? 'UPI / GPay'
            : _selectedPayment == 1
                ? 'Credit / Debit Card'
                : 'Net Banking',
      ),
    );

    Map<String, dynamic>? bookingResult;

    if (token == null) {
      if (mounted) {
        Navigator.of(context).pop(); // close dialog
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please log in to book a desk.')),
        );
      }
      return;
    }

    if (_pricingPlanId == null) {
      if (mounted) {
        Navigator.of(context).pop();
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a pricing plan.')),
        );
      }
      return;
    }

    final planType = _pricingPlans.isNotEmpty 
      ? _pricingPlans.firstWhere((p) => p['id']?.toString() == _pricingPlanId, orElse: () => _pricingPlans.first)['type'] 
      : 'HOURLY';

    if (planType != 'HOURLY' && _selectedTimeSlot == null) {
      if (mounted) {
        Navigator.of(context).pop();
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a start time.')),
        );
      }
      return;
    }

    if (spaceId != null && deskId != null) {
      var start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 9, 0);
      var end = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 18, 0);
      
      if (_pricingPlans.isNotEmpty) {
        final plan = _pricingPlans.firstWhere(
          (p) => p['id']?.toString() == _pricingPlanId,
          orElse: () => _pricingPlans.first,
        );
        
        if (_selectedTimeSlots.isNotEmpty) {
          try {
            final format = DateFormat('hh:mm a');
            final parsedTime = format.parse(_selectedTimeSlots.first.split(' - ').first);
            start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, parsedTime.hour, parsedTime.minute);
          } catch (e) {
            dev.log('Error parsing time slot: $e');
          }
        } else if (_selectedTimeSlot != null) {
          try {
            final format = DateFormat('hh:mm a');
            final parsedTime = format.parse(_selectedTimeSlot!.split(' - ').first);
            start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, parsedTime.hour, parsedTime.minute);
          } catch (e) {
            dev.log('Error parsing time slot: $e');
          }
        }
        
        if (plan['type'] == 'HOURLY') {
          end = start.add(Duration(hours: _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots.length : _hoursPerDay));
        } else {
          // For non-hourly plans, if time is specified, use the hours per day for the end time, else default to full day.
          if (_selectedTimeSlots.isNotEmpty || _selectedTimeSlot != null) {
            end = start.add(Duration(hours: _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots.length : _hoursPerDay));
          } else {
            end = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 18, 0);
          }
        }
      }
      
      String finalDeskId = deskId;
      
      try {
        final seatTypeKey = widget.bookingData['seatTypeKey']?.toString() ?? 'hot_desk';
        final availResults = await ApiClient.fetchDeskAvailability(
          spaceId,
          start.toIso8601String().substring(0, 10),
          startTime: start.toUtc().toIso8601String(),
          endTime: end.toUtc().toIso8601String()
        );
        
        final spaceDetails = await ApiClient.fetchWorkspaceDetail(spaceId);
        
        if (availResults != null && spaceDetails != null) {
          final desks = spaceDetails['desks'] as List?;
          if (desks != null) {
            final Map<String, bool> availabilityMap = {};
            for (final res in availResults) {
              final id = res['id']?.toString();
              if (id != null) {
                availabilityMap[id] = res['isAvailable'] == true;
              }
            }
            
            // Find a free desk matching the same type
            String? availableDeskId;
            for (final d in desks) {
              if (d['type'] == seatTypeKey && d['isActive'] == true) {
                final dId = d['id'].toString();
                if (availabilityMap[dId] != false) {
                  availableDeskId = dId;
                  break;
                }
              }
            }
            
            if (availableDeskId != null) {
              finalDeskId = availableDeskId;
            } else {
              if (mounted) {
                Navigator.of(context).pop();
                setState(() => _isProcessing = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('No desks available for the selected time.')),
                );
              }
              return;
            }
          }
        }
      } catch (e) {
        dev.log('Error selecting dynamic desk: $e');
      }

      final startTimeStr = start.toUtc().toIso8601String();
      final endTimeStr = end.toUtc().toIso8601String();
      
      final slots = _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots : widget.bookingData['selectedTimeSlots'] as List<String>?;
      List<String> bookedSlotsIso = [];
      if (slots != null) {
        for (final slot in slots) {
          try {
            final format = DateFormat('hh:mm a');
            final parsedTime = format.parse(slot.split(' - ').first);
            final sDate = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, parsedTime.hour, parsedTime.minute);
            bookedSlotsIso.add(sDate.toUtc().toIso8601String());
          } catch (_) {}
        }
      }
      
      final List<Map<String, dynamic>> extrasList = [];
      _selectedExtrasQuantities.forEach((id, q) {
        if (q > 0) extrasList.add({'extraServiceId': id, 'quantity': q});
      });

      bookingResult = await ApiClient.createBooking(
        workspaceId: spaceId,
        deskId: finalDeskId,
        pricingPlanId: _pricingPlanId!,
        startTime: startTimeStr,
        endTime: endTimeStr,
        bookedSlots: bookedSlotsIso.isNotEmpty ? bookedSlotsIso : null,
        extras: extrasList.isNotEmpty ? extrasList : null,
        couponCode: _couponController.text.isNotEmpty ? _couponController.text.trim().toUpperCase() : null,
        authToken: token,
      );
    }

    if (!mounted) return;
    Navigator.of(context).pop(); // close dialog
    setState(() => _isProcessing = false);

    if (bookingResult == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking failed. Please try again later.')),
      );
      return;
    }

    final ref = bookingResult['id']?.toString().substring(0, 8).toUpperCase() ?? 'BMS-LIVE';
    String startStr = '09:00 AM';
    String endStr = '06:00 PM';
    String finalDateStr = DateFormat('MMM d, yyyy').format(_selectedDate);
    String finalTimeStr = '$startStr - $endStr';
    
    String ticketPlanType = 'HOURLY';
    if (_pricingPlans.isNotEmpty && _pricingPlanId != null) {
      final plan = _pricingPlans.firstWhere((p) => p['id']?.toString() == _pricingPlanId, orElse: () => _pricingPlans.first);
      ticketPlanType = plan['type'];
    }
    
    if (_selectedTimeSlots.isNotEmpty || _selectedTimeSlot != null) {
      try {
        if (_selectedTimeSlots.length > 1) {
           final firstPart = _selectedTimeSlots.first.split(' - ').first;
           final lastPart = _selectedTimeSlots.last.split(' - ').last;
           finalTimeStr = '$firstPart - $lastPart (${_selectedTimeSlots.length} hrs)';
        } else {
          final format = DateFormat('hh:mm a');
          final rawTime = _selectedTimeSlots.isNotEmpty ? _selectedTimeSlots.first : _selectedTimeSlot!;
          final parsedTime = format.parse(rawTime.split(' - ').first);
          final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, parsedTime.hour, parsedTime.minute);
          DateTime end = start.add(Duration(hours: _hoursPerDay));

          startStr = DateFormat('hh:mm a').format(start);
          endStr = DateFormat('hh:mm a').format(end);
          finalTimeStr = '$startStr - $endStr';
        }
      } catch (e) {
        dev.log('Error parsing time slot for eticket: $e');
      }
    } else {
      if (ticketPlanType == 'HOURLY') {
        final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 9, 0);
        final end = start.add(Duration(hours: _hoursPerDay));
        startStr = DateFormat('hh:mm a').format(start);
        endStr = DateFormat('hh:mm a').format(end);
        finalTimeStr = '$startStr - $endStr';
      }
    }
    
    if (ticketPlanType == 'DAILY') {
      finalTimeStr = 'Full Day Pass';
    } else if (ticketPlanType == 'WEEKLY') {
      finalTimeStr = 'Weekly Pass';
      final endDate = _selectedDate.add(const Duration(days: 6));
      finalDateStr = '${DateFormat('MMM d').format(_selectedDate)} - ${DateFormat('MMM d, yyyy').format(endDate)}';
    } else if (ticketPlanType == 'MONTHLY') {
      finalTimeStr = 'Monthly Pass';
      final endDate = _selectedDate.add(const Duration(days: 29));
      finalDateStr = '${DateFormat('MMM d').format(_selectedDate)} - ${DateFormat('MMM d, yyyy').format(endDate)}';
    }

    context.push('/confirmation', extra: {
      'spaceName': _spaceName,
      'spaceImageUrl': _spaceImageUrl,
      'seatType': _seatLabel,
      'ref': ref,
      'totalAmount': _total,
      'date': finalDateStr,
      'startTime': finalTimeStr,
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
                  if (_pricingPlans.isNotEmpty) ...[
                    // Always show the new time slots grid instead of just for non-hourly plans
                    _buildTimeSlotsGrid(),
                    const SizedBox(height: 24),
                    if (_pricingPlans.firstWhere((p) => p['id']?.toString() == _pricingPlanId, orElse: () => _pricingPlans.first)['type'] != 'HOURLY') ...[
                      _buildDurationSection(),
                      const SizedBox(height: 24),
                    ],
                  ],
                  _buildPricingPlanSelector(),
                  const SizedBox(height: 12),
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
  // Duration section
  // ---------------------------------------------------------------------------
  Widget _buildDurationSection() {
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
          Text(
            'Duration',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'How many hours per day will you use the workspace?',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.outlineVariant.withOpacity(0.4)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.remove, color: AppColors.primary),
                  onPressed: () {
                    if (_hoursPerDay > 1) {
                      _hoursController.text = (_hoursPerDay - 1).toString();
                    }
                  },
                ),
                Expanded(
                  child: TextField(
                    controller: _hoursController,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add, color: AppColors.primary),
                  onPressed: () {
                    // Max hours validation
                    int maxHours = 24;
                    if (_workingHours.isNotEmpty) {
                       final dayName = DateFormat('EEEE').format(_selectedDate).toUpperCase();
                       final wh = _workingHours.firstWhere((w) => w['day'] == dayName, orElse: () => _workingHours.first);
                       if (wh['openTime'] != null && wh['closeTime'] != null) {
                          final oH = int.tryParse((wh['openTime'] as String).split(':')[0]) ?? 9;
                          final cH = int.tryParse((wh['closeTime'] as String).split(':')[0]) ?? 18;
                          maxHours = cH - oH;
                       }
                    }
                    
                    // Limit hours based on selected time slot too
                    if (_selectedTimeSlot != null) {
                      try {
                        final format = DateFormat('hh:mm a');
                        final parsedTime = format.parse(_selectedTimeSlot!);
                        final slotHour = parsedTime.hour;
                        int closingHour = 18;
                        if (_workingHours.isNotEmpty) {
                          final dayName = DateFormat('EEEE').format(_selectedDate).toUpperCase();
                          final wh = _workingHours.firstWhere((w) => w['day'] == dayName, orElse: () => _workingHours.first);
                          if (wh['closeTime'] != null) {
                            closingHour = int.tryParse((wh['closeTime'] as String).split(':')[0]) ?? 18;
                          }
                        }
                        final remainingHours = closingHour - slotHour;
                        if (remainingHours < maxHours) {
                          maxHours = remainingHours;
                        }
                      } catch (e) {
                        dev.log('Error parsing time slot for validation: $e');
                      }
                    }

                    if (_hoursPerDay < maxHours) {
                      _hoursController.text = (_hoursPerDay + 1).toString();
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Cannot exceed operating hours for the selected start time.')),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSlotsGrid() {
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
          Text(
            'Select Time Slots',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          if (_timeSlots.isNotEmpty)
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _timeSlots.map((t) {
                final isSelected = _selectedTimeSlots.contains(t);
                return GestureDetector(
                  onTap: () => _onTimeSlotSelected(t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primaryContainer : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.outlineVariant.withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      t,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                );
              }).toList(),
            )
          else
            Text(
              'No slots available today',
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.error),
            ),
        ],
      ),
    );
  }

  Widget _buildPricingPlanSelector() {
    if (_pricingPlans.isEmpty && !_isLoadingPlans) return const SizedBox();

    final plansToDisplay = _isLoadingPlans 
        ? [
            {'id': 'dummy1', 'type': 'HOURLY', 'price': '199.0'},
            {'id': 'dummy2', 'type': 'DAILY', 'price': '999.0'},
          ] 
        : _pricingPlans;

    Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Pricing Plan',
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: plansToDisplay.map((plan) {
              final isSelected = _pricingPlanId == plan['id']?.toString();
              return GestureDetector(
                onTap: _isLoadingPlans ? null : () => setState(() => _pricingPlanId = plan['id']?.toString()),
                child: Container(
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryContainer : AppColors.surfaceContainer,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.outlineVariant.withOpacity(0.4),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        plan['type']?.toString().toUpperCase() ?? 'PLAN',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'INR ${plan['basePrice'] ?? plan['price']}',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? Colors.white : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );

    if (_isLoadingPlans) {
      return Stack(
        children: [
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              AppColors.background.withOpacity(0.6),
              BlendMode.srcATop,
            ),
            child: content,
          ),
          Positioned.fill(
            child: Center(
              child: const CircularProgressIndicator(strokeWidth: 3),
            ),
          ),
        ],
      );
    }

    return content;
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
                      '${DateFormat('MMM dd, yyyy').format(_selectedDate)} • ${_selectedTimeSlot ?? 'All Day'}',
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
    if (_extraServices.isEmpty) return const SizedBox.shrink();
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
        ..._extraServices.map((e) {
          final p = e['price'];
          double price = 0;
          if (p is double) price = p;
          if (p is int) price = p.toDouble();
          if (p is String) price = double.tryParse(p) ?? 0;
          
          return _AddOnTile(
            icon: Icons.star_border, // default icon
            title: e['name'] ?? '',
            subtitle: e['description'] ?? '',
            price: '+₹${price.toStringAsFixed(0)}',
            isEnabled: (_selectedExtrasQuantities[e['id']] ?? 0) > 0,
            onToggle: (v) {
              setState(() {
                _selectedExtrasQuantities[e['id']] = v ? 1 : 0;
              });
            },
          );
        }).toList(),
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
        if (_publicCoupons.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<Map<String, dynamic>>(
                isExpanded: true,
                hint: Text('Select a public coupon', style: GoogleFonts.inter(fontSize: 14, color: AppColors.onSurfaceVariant)),
                value: _selectedCouponDetails,
                icon: const Icon(Icons.arrow_drop_down, color: AppColors.primary),
                items: [
                  DropdownMenuItem(
                    value: null,
                    child: Text('None', style: GoogleFonts.inter(fontSize: 14, color: AppColors.onSurface)),
                  ),
                  ..._publicCoupons.map((c) {
                    final isFlat = c['discountFlat'] != null && c['discountFlat'].toString() != '0';
                    final discText = isFlat ? '₹${c['discountFlat']} OFF' : '${c['discountPercent']}% OFF';
                    final minOrd = c['minOrderValue'] != null && c['minOrderValue'].toString() != '0' ? ' (Min: ₹${c['minOrderValue']})' : '';
                    return DropdownMenuItem(
                      value: c,
                      child: Text('${c['code']} - $discText$minOrd', style: GoogleFonts.inter(fontSize: 14, color: AppColors.onSurface, fontWeight: FontWeight.w500)),
                    );
                  }).toList(),
                ],
                onChanged: (val) {
                  setState(() {
                    _selectedCouponDetails = val;
                    if (val != null) {
                      _couponController.text = val['code'];
                      
                      // Check min order value immediately to show warning if needed
                      final minVal = val['minOrderValue'] != null ? double.tryParse(val['minOrderValue'].toString()) ?? 0.0 : 0.0;
                      if (minVal > 0 && _calculatedPlanPrice < minVal) {
                        _couponError = 'Minimum order value of ₹$minVal not met.';
                      } else {
                        _couponError = null;
                      }
                    } else {
                      _couponController.clear();
                      _couponError = null;
                    }
                  });
                },
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _couponController,
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.onSurface),
                decoration: InputDecoration(
                  hintText: 'Apply private coupon code',
                  hintStyle: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 14),
                  suffixIcon: const Icon(Icons.sell_outlined, color: AppColors.onSurfaceVariant),
                  filled: true,
                  fillColor: AppColors.surfaceContainer,
                  errorText: _couponError,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none,
                  ),
                ),
                onChanged: (val) {
                  if (_selectedCouponDetails != null && _selectedCouponDetails!['code'] != val) {
                    setState(() {
                      _selectedCouponDetails = null;
                      _couponError = null;
                    });
                  }
                },
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton(
              onPressed: () {
                // If they typed a code, we can't validate it locally if it's private.
                // It will be sent to the backend on Pay Now.
                if (_couponController.text.isNotEmpty && _selectedCouponDetails == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Private coupon will be validated during payment.'))
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                minimumSize: Size.zero,
                backgroundColor: AppColors.primaryContainer,
                foregroundColor: AppColors.onPrimaryContainer,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: Text(
                'Apply',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
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
          _PriceLine('Base Price', '₹${_basePrice.toStringAsFixed(2)}'),
          ..._extraServices.where((e) => (_selectedExtrasQuantities[e['id']] ?? 0) > 0).map((e) {
            final p = e['price'];
            double price = 0;
            if (p is double) price = p;
            if (p is int) price = p.toDouble();
            if (p is String) price = double.tryParse(p) ?? 0;
            return _PriceLine(e['name'], '₹${price.toStringAsFixed(2)}');
          }).toList(),
          if (_discountAmount > 0)
            _PriceLine('Discount', '-₹${_discountAmount.toStringAsFixed(2)}', isDiscount: true),
          _PriceLine('Tax & Service (10%)', '₹${_tax.toStringAsFixed(2)}'),
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
                '₹${_total.toStringAsFixed(2)}',
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
                  '₹${_total.toStringAsFixed(2)}',
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
  final bool isDiscount;
  const _PriceLine(this.label, this.value, {this.isDiscount = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: isDiscount ? Colors.green[700] : AppColors.onSurfaceVariant,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDiscount ? Colors.green[700] : AppColors.onSurface,
            ),
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
