# Staywired design system

Staywired brings the same visual identity to its landing page, interactive demo, sign-in, hotel operations and platform administration. Techwired Solutions remains the product attribution.

## Palette and typography

Warm ivory (#f8f8f1), forest (#2d684f), sage and restrained brass (#b39766) define the light theme. The dark theme uses deep forest (#14251e) with pale sage text. Editorial serif page headings connect the operational workspace to the public site; Geist remains the interface font. Status colors retain their operational meanings and have separate readable light/dark text colors.

Semantic colors live in `frontend/src/app/globals.css`. Tailwind `workspace` colors are compatibility tokens for the existing operational screens, with opacity support. New UI should use background, foreground, card, muted, primary and border tokens. Brand and status colors should not be used interchangeably.

## Theme behavior

The toggle is available on the landing page, login, demo, property workspace and platform workspace. The first visit follows the system preference. An explicit selection persists under `staywired-theme`, survives navigation and reloads, and synchronizes across tabs. Storage restrictions fall back to a session-only preference. A small head script applies the saved preference before rendering; hydration differences on the root are expected.

## Forms, tables and motion

The sign-in form supports password visibility, autocomplete, associated inline validation messages, pending submission and English/Nepali labels. The property directory exposes network failure with retry rather than reporting an empty directory. Its navigation collapses on mobile and tables scroll within the available content area.

Keep focus outlines visible. Motion is restrained and honors prefers-reduced-motion. Do not add attention-seeking animation to routine operational status. Notification buttons without working behavior have been removed from workspace headers.

## Validation

Production build, TypeScript and the existing reservation/proxy regression suite are required before publishing. Inspect light and dark login, demo overview/dialogs, platform directory and the actual property dashboard in the browser. Color tokens are shared across operational forms and dialogs; future modules must use them rather than hard-coded white text or dark surfaces.

Authentication-context and data requests share one session refresh operation, including profile hydration and opening a property workspace. Concurrent expired requests do not rotate the refresh cookie multiple times. Failed refresh and invalid login paths terminate without recursion; regression tests cover all three cases.
