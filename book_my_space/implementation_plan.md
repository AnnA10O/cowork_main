# Book My Space – Flutter App Implementation Plan

## Overview
A brand-new **Book My Space** Flutter app built from 11 design screens from the `stitch_deskhub_mobile_workspace_app` folder. The design system uses the **Executive Dark** theme — deep obsidian `#051424` background, periwinkle blue `#b4c5ff` primary, Inter font, glassmorphism cards, and white "island" cards on dark backgrounds.

## Design System (from DESIGN.md)
| Token | Value |
|---|---|
| Background | `#051424` |
| Primary | `#b4c5ff` |
| Primary Container (CTA) | `#2563eb` |
| Surface Container | `#122131` |
| On Surface | `#d4e4fa` |
| Available (green) | `#10B981` |
| Filling Fast (amber) | `#F59E0B` |
| Occupied (red) | `#EF4444` |
| Font | Inter |

## Screens to Build (11 total)
| # | Screen | Source |
|---|---|---|
| 1 | Login / Onboarding | `onboarding_login` |
| 2 | Home (Hero + Featured) | `home_screen_with_fmciii_featured` |
| 3 | Space Listing + Search | `space_listing_with_fmciii` |
| 4 | Space Detail (FMCIII) | `fmciii_space_detail` |
| 5 | Space Detail (generic) | `space_detail_page` |
| 6 | Seat Selection | `fmciii_seat_selection` |
| 7 | Seat Photo View | `seat_selection_photo_view` |
| 8 | Checkout (FMCIII) | `fmciii_payment` |
| 9 | Checkout (generic) | `checkout_payment` |
| 10 | Booking Confirmation E-Pass | `booking_confirmation_e_pass` |
| 11 | Profile / My Account | `profile_my_account` |

## Project Structure
```
book_my_space/
├── lib/
│   ├── main.dart
│   ├── theme/
│   │   ├── app_colors.dart
│   │   └── app_theme.dart
│   ├── models/
│   │   ├── workspace_model.dart
│   │   └── booking_model.dart
│   ├── router/
│   │   └── app_router.dart
│   ├── screens/
│   │   ├── login/login_screen.dart
│   │   ├── home/home_screen.dart
│   │   ├── spaces/spaces_screen.dart
│   │   ├── space_detail/space_detail_screen.dart
│   │   ├── seat_selection/seat_selection_screen.dart
│   │   ├── checkout/checkout_screen.dart
│   │   ├── confirmation/confirmation_screen.dart
│   │   ├── bookings/bookings_screen.dart
│   │   └── profile/profile_screen.dart
│   ├── widgets/
│   │   ├── main_shell.dart
│   │   ├── bottom_nav_bar.dart
│   │   ├── space_card.dart
│   │   ├── glass_card.dart
│   │   └── availability_dot.dart
├── pubspec.yaml
```

## Key Dependencies
- `google_fonts` – Inter font
- `go_router` – Navigation
- `cached_network_image` – Network images
- `flutter_animate` – Micro-animations
- `qr_flutter` – QR code for e-pass
