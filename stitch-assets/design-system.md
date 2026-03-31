# Design System Strategy: The Curated Atelier

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Concierge"**
This design system moves beyond the utility of a "management tool" and enters the realm of a premium hospitality experience. It is designed for salon owners who view their business as a craft. To break the "SaaS template" look, we utilize **Editorial Asymmetry** and **Tonal Depth**. By contrasting hyper-functional data with high-fashion typography scales and breathable layouts, we create an environment that feels as curated as a high-end studio.

The system rejects the "box-in-a-box" layout. Instead, it uses **Overlapping Planes** and **Negative Space** to guide the eye. Information isn't just displayed; it is staged.

---

## 2. Colors: Tonal Atmosphere
The palette is rooted in the depth of `primary` (#42005c) and the vibrance of `primary-container` (#610b83), balanced by a sophisticated grayscale that mimics fine stationery.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. They create visual noise that cheapens the experience. Boundaries are defined through:
- **Background Shifts:** Use `surface-container-low` to sit behind a `surface-container-lowest` card.
- **Tonal Transitions:** Defining edges through the contrast between `surface` and `surface-variant`.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Frosted Glass" and "Vellum."
- **Level 0 (Foundation):** `surface` (#f8f9fa) for the main canvas.
- **Level 1 (Sections):** `surface-container-low` for grouping related content.
- **Level 2 (Active Cards):** `surface-container-lowest` (#ffffff) to provide the highest lift and focus.

### The "Glass & Gradient" Rule
To inject "soul" into the dashboard:
- **Main CTAs:** Use a subtle linear gradient (Top-Left: `primary` to Bottom-Right: `primary-container`).
- **Floating Overlays:** Apply `surface-container-lowest` at 80% opacity with a `backdrop-filter: blur(12px)` to create a glassmorphism effect for modals and dropdowns.

---

## 3. Typography: The Editorial Voice
We utilize a pairing of **Manrope** (Display/Headlines) and **Inter** (Interface/Body) to balance character with legibility.

*   **Display (Manrope):** Large, airy, and confident. Used for "Hero" numbers (e.g., Daily Revenue) to give them an editorial, high-fashion feel.
*   **Headline (Manrope):** Semi-bold and tight-kerning. These should feel like magazine headers.
*   **Body & Labels (Inter):** Highly legible, used for all functional data. 

**Hierarchy Strategy:** 
Use `display-lg` for primary KPIs to make the data feel like a statement. Use `label-sm` in `on-surface-variant` for metadata to ensure the UI feels quiet and organized.

---

## 4. Elevation & Depth
We eschew traditional "Drop Shadows" in favor of **Ambient Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-low` background provides enough natural contrast to signify elevation without a single pixel of shadow.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use a "Soft-Focus" shadow: `box-shadow: 0 20px 40px -10px rgba(97, 11, 131, 0.08)`. Note the purple tint; this mimics real-world light refraction from the brand colors.
*   **The Ghost Border:** If a separator is required for accessibility, use `outline-variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Crafted Primitives

### Buttons (The Interaction Points)
*   **Primary:** Gradient fill (`primary` to `primary-container`), `md` radius (0.75rem), white text.
*   **Secondary:** Ghost style. No background, `primary` text, and a `Ghost Border` that only appears on hover.
*   **Tertiary:** `label-md` text with a subtle `primary-fixed-dim` underline for low-priority actions.

### Cards & Lists (The Information Vessels)
*   **Forbid Dividers:** Do not use lines between list items. Use `spacing-4` (1rem) of vertical white space or alternate subtle background tints (`surface-container-low` vs `surface-container-lowest`).
*   **The "Atelier" Card:** A `surface-container-lowest` card with an `xl` (1.5rem) padding. Headlines inside cards should always have `spacing-6` (1.5rem) of bottom margin to create a "gallery" feel.

### Input Fields
*   **Style:** Minimalist. Only a bottom border using `outline-variant` (20% opacity). On focus, the border transitions to `primary` and grows to 2px. Labels should use `label-md` and always sit above the field, never as placeholders.

### Salon-Specific Components
*   **The Appointment Block:** Use `primary-container` with 10% opacity for "Booked" slots, and a solid `primary` vertical accent bar (4px) on the left edge.
*   **Status Chips:** Use `secondary-container` for "In-Progress" and `error-container` for "Canceled," but keep the text high-contrast using the respective `on-container` tokens.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace White Space:** If a section feels "empty," it’s likely perfect. Luxury is defined by the space you don't use.
*   **Use Asymmetric Grids:** For dashboards, try a 70/30 split rather than a 50/50 split to create a more dynamic, editorial flow.
*   **Tint Your Neutrals:** Always ensure your "Grays" have a hint of purple (`surface-variant`) to keep the palette cohesive.

### Don’t:
*   **Don't use pure black:** Use `on-surface` (#191c1d) for text. Pure black (#000) breaks the soft, premium atmosphere.
*   **Don't use 100% Opaque Borders:** This is the fastest way to make the "Atelier" look like a legacy spreadsheet.
*   **Don't crowd the Sidebar:** The sidebar should be a dark sanctuary. Use `primary-container` (#610b83) as the base, and ensure icons have at least `spacing-3` of room from their labels.
