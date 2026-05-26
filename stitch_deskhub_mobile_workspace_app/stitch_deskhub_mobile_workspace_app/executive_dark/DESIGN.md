---
name: Executive Dark
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#ffb596'
  on-tertiary: '#581e00'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 20px
---

## Brand & Style

The design system is engineered for the modern professional—efficient, high-performing, and sophisticated. It targets digital nomads and corporate teams who value friction-less experiences and premium environments. 

The aesthetic blends **Modern Corporate** reliability with subtle **Glassmorphism** to ensure the dark theme feels airy rather than heavy. It evokes an emotional response of "focus" and "quiet luxury," mirroring the physical feeling of walking into a high-end, well-lit co-working lounge. High-fidelity finishes, such as micro-interactions and refined stroke weights, differentiate this design system from standard utility apps.

## Colors

The palette is anchored by a deep obsidian background to reduce eye strain during long booking sessions. The primary blue is used strategically for calls to action and active states, providing a high-energy focal point. 

While the background is dark, the system utilizes pure white for high-contrast card surfaces to create "visual islands" of information, mimicking white desks or paper within a dark room. Secondary neutrals are pulled from the slate spectrum to maintain a professional, cool-toned atmosphere.

## Typography

The design system utilizes **Inter** for its exceptional legibility on mobile screens and its neutral, systematic character. Titles are set in bold weights with tight letter-spacing to create a strong visual hierarchy and a sense of architectural structure. Body text prioritizes generous line heights to ensure that facility details and booking terms remain highly readable against the dark background.

## Layout & Spacing

This design system uses a **Fluid Grid** model optimized for mobile viewports. A 4px baseline grid ensures vertical rhythm across all components.

- **Margins:** A 20px outer margin provides a generous "breathable" frame for the content.
- **Gutters:** 16px gutters separate content cards and grid items.
- **Stacking:** Elements are grouped using an 8px (Small) or 16px (Medium) spacing logic to maintain clear associations between related data points like "Desk Number" and "Price."

## Elevation & Depth

Depth is established through **Tonal Layering** and **Ambient Shadows**. 

1. **Base Layer:** #1A1A1A (Background).
2. **Surface Layer:** #262626 (Elevated dark surfaces) used for inactive states or secondary containers.
3. **Contrast Layer:** #FFFFFF (Pure White) used for primary cards to draw immediate attention.

For the white card surfaces, a diffused, low-opacity shadow (Color: #000000, Alpha: 12%, Blur: 20px) is applied to give the impression that the workspace "pops" off the screen. For dark surfaces, depth is achieved via a 1px subtle inner stroke (#FFFFFF at 5% opacity) to define edges rather than using shadows.

## Shapes

The shape language reflects professional architecture—structured but comfortable. 
- **Cards & Modal Containers:** Use a 12px radius to feel modern and approachable.
- **Interactive Elements:** Buttons and Input fields use a tighter 8px radius to signify precision and action.
- **Small Elements:** Tags and badges use a 4px radius or full pill shape depending on the information density.

## Components

### Buttons
Primary buttons are #2563EB with white text. Secondary buttons use a "Ghost" style with a white or blue stroke. All buttons have an 8px corner radius and a fixed height of 48px for optimal touch targets.

### Cards
White cards feature 12px corners. When used on the dark background, they must include 16px internal padding. Content inside white cards should use dark gray (#1A1A1A) for primary text to maintain contrast.

### Input Fields
Inputs are styled with #262626 backgrounds and an 8px radius. The active state is indicated by a 2px border in the primary blue (#2563EB).

### Chips & Filters
Small, pill-shaped elements used for amenities (e.g., "High-speed WiFi," "Coffee"). These should use a semi-transparent white background (White at 10% opacity) with white text when placed on the dark background.

### Availability Indicators
A specialized component for this design system: A circular dot indicator. Green (#10B981) for available, Red (#EF4444) for occupied, and Orange (#F59E0B) for "Filling Fast."