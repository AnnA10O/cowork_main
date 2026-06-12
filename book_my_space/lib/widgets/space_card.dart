import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_colors.dart';
import 'glass_card.dart';

class SpaceCard extends StatefulWidget {
  final String name;
  final String location;
  final String imageUrl;
  final double rating;
  final String price;
  final AvailabilityStatus status;
  final VoidCallback? onTap;
  final bool isWhiteCard;
  final bool hasRating;

  const SpaceCard({
    super.key,
    required this.name,
    required this.location,
    required this.imageUrl,
    required this.rating,
    required this.price,
    required this.status,
    this.onTap,
    this.hasRating = false,
    this.isWhiteCard = false,
  });

  @override
  State<SpaceCard> createState() => _SpaceCardState();
}

class _SpaceCardState extends State<SpaceCard> {
  int _currentPage = 0;
  late PageController _pageController;
  Timer? _autoPlayTimer;

  late List<String> _images;

  void _buildImages() {
    _images = widget.imageUrl
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
  void didUpdateWidget(SpaceCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
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
    return GestureDetector(
      onTap: widget.onTap,
      child: ClipRect(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image carousel with auto-play
            AspectRatio(
              aspectRatio: 4 / 5,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
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
                            placeholder: (context, url) => Container(
                              color: AppColors.surfaceContainerHigh,
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: AppColors.surfaceContainerHigh,
                              child: const Icon(Icons.broken_image_outlined,
                                  color: AppColors.outline, size: 28),
                            ),
                          );
                        },
                      )
                    else
                      CachedNetworkImage(
                        imageUrl: _images[0],
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: AppColors.surfaceContainerHigh,
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: AppColors.surfaceContainerHigh,
                          child: const Icon(Icons.broken_image_outlined,
                              color: AppColors.outline, size: 28),
                        ),
                      ),

                    // Gradient overlay at bottom for dots visibility
                    if (_images.length > 1)
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 40,
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

                    // Rating badge (top-right)
                    if (widget.hasRating)
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.92),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star, size: 11, color: Color(0xFFBC4800)),
                              const SizedBox(width: 2),
                              Text(
                                widget.rating.toStringAsFixed(1),
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF051424),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Card info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.name,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    widget.location,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 5),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          widget.price,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      AvailabilityDot(status: widget.status),
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