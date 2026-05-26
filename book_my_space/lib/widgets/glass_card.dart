import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final BorderRadius? borderRadius;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: borderRadius ?? BorderRadius.circular(12),
        border: Border.all(
          color: borderColor ?? Colors.white.withOpacity(0.08),
          width: 1,
        ),
      ),
      child: child,
    );
  }
}

class AvailabilityDot extends StatelessWidget {
  final AvailabilityStatus status;
  final bool showLabel;

  const AvailabilityDot({super.key, required this.status, this.showLabel = false});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case AvailabilityStatus.available:
        color = AppColors.available;
        label = 'Available';
      case AvailabilityStatus.fillingFast:
        color = AppColors.fillingFast;
        label = 'Filling Fast';
      case AvailabilityStatus.occupied:
        color = AppColors.occupied;
        label = 'Occupied';
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        if (showLabel) ...[
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }
}

enum AvailabilityStatus { available, fillingFast, occupied }