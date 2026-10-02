---
name: EnCaja Autopartes
description: Refacciones con compatibilidad verificada, pintadas como el rótulo de la barda del taller.
colors:
  azul: "#1b3fa8"
  azul-hondo: "#132e7e"
  azul-noche: "#0e2160"
  azul-tinte: "#e7ecf9"
  amarillo: "#f2c12e"
  amarillo-hondo: "#dba812"
  amarillo-tinte: "#fdf2cc"
  amarillo-claro: "#ffd44d"
  chile: "#e1301a"
  chile-hondo: "#b8230f"
  ok: "#12704a"
  barda: "#f1f2ec"
  barda-2: "#e5e7df"
  placa: "#ffffff"
  carbon: "#15171d"
  carbon-2: "#41454f"
  carbon-3: "#5d626d"
  linea: "rgb(21 23 29 / 0.11)"
  linea-fuerte: "rgb(21 23 29 / 0.24)"
typography:
  rotulo-banda:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "clamp(44px, 6.6vw, 92px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0"
  display:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "clamp(34px, 4.6vw, 58px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0"
  headline:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "clamp(28px, 3.4vw, 42px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0"
  title:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0"
  title-sm:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0"
  body:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 100"
  pieza-nombre:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 720
    lineHeight: 1.22
    fontVariation: "'wdth' 90"
  precio:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 780
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum'"
  folio:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 650
    letterSpacing: "0.03em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 82"
  label:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 750
    letterSpacing: "0.08em"
  button:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 680
    lineHeight: 1
    letterSpacing: "0.005em"
    fontVariation: "'wdth' 92"
  sello:
    fontFamily: "Bungee, 'Archivo Variable', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  tape: "3px"
  in: "4px"
  r: "6px"
  redondo: "999px"
spacing:
  e1: "4px"
  e2: "8px"
  e3: "12px"
  e4: "16px"
  e5: "20px"
  e6: "24px"
  e8: "32px"
  e10: "40px"
  e12: "48px"
  e16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.placa}"
    typography: "{typography.button}"
    rounded: "{rounded.r}"
    padding: "0 20px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.azul-hondo}"
  button-secondary:
    backgroundColor: "{colors.placa}"
    textColor: "{colors.carbon}"
    typography: "{typography.button}"
    rounded: "{rounded.r}"
    padding: "0 20px"
    height: "42px"
  button-secondary-hover:
    backgroundColor: "{colors.azul-tinte}"
    textColor: "{colors.azul}"
  button-text:
    textColor: "{colors.azul}"
    rounded: "{rounded.r}"
    padding: "0 12px"
    height: "34px"
  button-island-icon:
    backgroundColor: "rgb(255 255 255 / 0.16)"
    rounded: "{rounded.redondo}"
    size: "32px"
  button-island-icon-hover:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
  input:
    backgroundColor: "{colors.placa}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.in}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.barda}"
    textColor: "{colors.carbon-2}"
    rounded: "{rounded.r}"
    padding: "0 16px"
    height: "34px"
  chip-active:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.placa}"
  tab-active:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.r}"
    height: "38px"
  cabecera:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.placa}"
    padding: "12px 24px 16px"
  placa-vehiculo:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.r}"
    height: "42px"
  pieza-card:
    backgroundColor: "{colors.placa}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.r}"
  sello-embona:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
    typography: "{typography.sello}"
    rounded: "{rounded.tape}"
    padding: "6px 10px 5px"
  sello-equivalente:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.placa}"
    typography: "{typography.sello}"
    rounded: "{rounded.tape}"
  sello-agotado:
    backgroundColor: "{colors.chile}"
    textColor: "{colors.placa}"
    typography: "{typography.sello}"
    rounded: "{rounded.tape}"
  existencias:
    textColor: "{colors.carbon-2}"
    rounded: "{rounded.r}"
    padding: "3px 9px 3px 7px"
  existencias-cambio:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
  banda:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.r}"
    padding: "32px"
  nota:
    backgroundColor: "{colors.placa}"
    rounded: "{rounded.r}"
    padding: "20px"
  insignia:
    backgroundColor: "{colors.chile}"
    textColor: "{colors.placa}"
    rounded: "{rounded.redondo}"
    height: "22px"
---

# Design System: EnCaja Autopartes

## Overview

**Creative North Star: "Rótulo de taller"**

The store speaks like the hand-painted wall of a Guadalajara repair shop. A cold whitewashed wall (barda) is the ground; royal-blue enamel forms the hull (header, footer, primary buttons); chrome yellow marks what fits your car; chile red is the brand's own paint. Whatever belongs to the visitor's vehicle gets painted: in Bungee sign lettering, with a solid offset shadow, swept on left to right like a brush stroke.

Everything you operate is set in Archivo: tabular figures for prices and stock, semi-condensed widths for part numbers and folios. Density is that of a parts counter. The grid is tight, product photos sit at one scale on identical white plates, and the order note stays pinned at the side like a carbon-copy pad. Depth comes from enamel: solid offset shadows with no blur, the same way a painted letter throws its shadow on a wall.

This world replaces the earlier "nota de remisión" stationery look, which is now an anti-reference, as is the grey card store with a red accent.

**Key Characteristics:**
- Whitewashed barda ground, royal-blue enamel hull, chrome yellow reserved for fit and change.
- Bungee lettering only on painted elements, with a chile-red offset shadow on the big painted lines.
- Solid offset "enamel" shadows on surfaces and primary buttons. Pressing a button moves it into its shadow.
- 6px corners as the house radius. Round shapes are reserved for a short list of mechanisms.
- Brush-sweep reveal (clip-path, left to right) for fit tapes and the painted vehicle name.
- Product photos on normalized white plates at one scale, each raster carrying its provenance.

## Colors

Three enamel paints on a whitewashed wall, with carbon for everything you read.

### Primary
- **Azul Rey Esmalte** (azul): the hull. Header band, primary buttons, painted heading color, active chips, the Equivalente tape, focus rings, the stock dot at rest, the shipping progress bar.
- **Azul Hondo** (azul-hondo): primary hover, secondary text on yellow (placa "cambiar").
- **Azul Noche** (azul-noche): footer ground, the solid shadow under primary buttons, the scrim tint behind overlays, the letter shadow of white Bungee on blue.
- **Azul Tinte** (azul-tinte): hover wash on secondary buttons, text buttons, quantity steppers and list rows.

### Secondary
- **Amarillo Cromo** (amarillo): fit and change only. The banda, the EMBONA tape, the active category tab, the header vehicle plate, and the sustained stock-change alert.
- **Amarillo Hondo** (amarillo-hondo) and **Amarillo Tinte** (amarillo-tinte): the selected vehicle option in the selector (tinted ground, deep inset ring).
- **Amarillo Claro** (amarillo-claro): hover tone for the yellow vehicle plate.

### Tertiary
- **Rojo Chile** (chile): brand paint. Letter shadow on h1/h2, on the painted vehicle name and on the nota total; the logo's letter shadow; count badges; the AGOTADO tape; the sold-out stock dot.
- **Chile Hondo** (chile-hondo): error text, sold-out stock text, danger buttons, ticket folio.
- **Verde Ok** (ok): confirmed status tape and tag only.

### Neutral
- **Barda** (barda): page ground, chips at rest, the overlay close button.
- **Barda 2** (barda-2): rails (switch, shipping), skeletons, quiet hover wash, photo placeholder lettering.
- **Placa** (placa): every card, the nota, the dialogs, and the white plates the product photos sit on.
- **Carbón** (carbon): body text, text on yellow, the toast ground, the dark band of the hazard stripe.
- **Carbón 2 / Carbón 3** (carbon-2, carbon-3): secondary text and data labels / placeholders, part numbers, muted meta.
- **Línea / Línea fuerte** (linea, linea-fuerte): hairlines and dashed dividers / control borders and card borders.

### Named Rules
**The Two Yellows Rule.** Yellow carries exactly two meanings: this fits / this is your active vehicle (banda, EMBONA tape, active tab, header plate), and the stock just changed. Don't use it for decoration, promotion or generic emphasis.

**The Enamel Hull Rule.** Blue is the structure you stand on (header, footer, primary actions). Content surfaces are white plates on the barda, never blue panels.

## Typography

**Display Font:** Bungee (self-hosted @fontsource/bungee, latin 400), falling back to Archivo Variable
**Body Font:** Archivo Variable (self-hosted @fontsource-variable/archivo, wdth axis), falling back to system-ui

**Character:** Bungee is the sign painter's block letter. It has one weight and is used only where something gets painted. Archivo is the counter clerk: it varies its width so part numbers condense (wdth 80 to 82), buttons tighten (92), and body text stays open (100). Every figure is tabular.

### Hierarchy
- **Rótulo banda** (Bungee 400, clamp(44px, 6.6vw, 92px), 0.95): the active vehicle's name in the banda. It is the largest thing in the system and it is painted.
- **Display / h1** (Bungee 400, clamp(34px, 4.6vw, 58px), 1.02): page titles, in azul with the chile letter shadow. The vehicle page header goes up to clamp(38px, 5.6vw, 76px).
- **Headline / h2** (Bungee 400, clamp(28px, 3.4vw, 42px), 1.02): section titles, with the chile letter shadow.
- **Title / h3, h4** (Bungee 400, 24px / 19px): card and dialog titles. No shadow.
- **Body** (Archivo 400, 15px, 1.5, wdth 100): running text, max 68ch.
- **Pieza nombre** (Archivo 720, 16.5px, 1.22, wdth 90): product names, clamped to two lines.
- **Precio** (Archivo 780, 21px, tabular): card prices. The dialog price is 800 at 34px.
- **Folio / número de parte** (Archivo 600 to 650, 12.5px, wdth 80 to 82, tabular, 0.03 to 0.04em; part numbers in uppercase): part numbers, folios, piece counts.
- **Label** (Archivo 700 to 750, 11 to 12.5px, 0.08em, uppercase): data-list terms (MARCA, ODÓMETRO, garage specs) and in-dialog section labels. This style labels data. It never sits above a heading as a kicker.

### Named Rules
**The Painted-Only Rule.** Bungee appears only on painted elements: h1 to h4, the logo and wordmark, fit tapes, vehicle names and emblems, the nota total, the footer mark, and the initials placeholder on a photo plate. Never on buttons, inputs, body or prices in lists.

**The Chile Shadow Rule.** h1, h2, the painted vehicle name and the nota total always carry a solid chile letter shadow (0.055em to 0.06em offset, no blur). White Bungee on blue carries an azul-noche shadow instead.

## Layout

Counter density on a 1440px container (32px / 24px padding, dropping to 20px / 16px below 900px). The catalog is a two-column grid: a fluid parts column and a 340px sticky nota (top 104px), with a 32px gap. The cart uses a 360px summary column instead. Parts tile in an auto-fill grid of 228px minimum with a 20px gap, falling to two columns with an 8px gap below 560px. The garage tiles at 320px minimum.

Spacing follows a 4px base (e1 to e16). Within cards the steps are 8, 12 and 16. Sections and page headers step at 24 and 32, and the footer sits 64px below content.

Responsive behavior: at 1180px the nota leaves the side and becomes a fixed blue bottom bar with a 4px solid azul-noche shadow. At 900px the header wraps, the search drops to its own full-width row, header link labels hide, the banda loses its photo and ficha, and two-column views stack. Below 560px, form pairs stack and the tape shrinks to 11px.

## Elevation & Depth

Depth is enamel, not air. Surfaces sit on the wall with a solid, offset, blue-tinted shadow and no blur, like the shadow of a painted letter. Hover deepens the offset. Pressing a primary button translates it 2px into its own shadow. Overlays use the largest offset over a blurred blue scrim, the one place blur is allowed, and only on the backdrop.

### Shadow Vocabulary
- **Esmalte** (`box-shadow: 4px 4px 0 rgb(19 46 126 / 0.16)`): cards at rest, the nota, sheets, the banda, garage cards.
- **Esmalte alto** (`box-shadow: 6px 6px 0 rgb(19 46 126 / 0.24)`): card hover, the order ticket, the banda photo.
- **Botón** (`box-shadow: 3px 3px 0 #0e2160`): primary buttons. On press: `1px 1px 0` plus a `translate(2px, 2px)`.
- **Capa** (`box-shadow: 8px 8px 0 rgb(14 33 96 / 0.35)`): dialogs and the side drawer.
- **Letra** (`text-shadow: 0.055em 0.055em 0 #e1301a`): painted headings, see the Chile Shadow Rule.

### Named Rules
**The No-Blur Rule.** Surface and button shadows are solid offsets with zero blur. Interaction states (focus rings, the stock-change halo) are spread rings, not soft glows.

## Shapes

The house radius is 6px (r). It is used on cards, the banda, the nota, buttons, chips, tabs, the header plate, toolbars and dialogs. Nested and field elements step down to 4px (in): inputs, photo thumbnails, list rows, vehicle options. Painted tapes use 3px and sit tilted (-2deg), like tape slapped on a shelf. The logo plate tilts -3deg and the banda photo tilts 2deg.

Round shapes are a short list of mechanisms: switches and their knobs, count badges, the shipping progress rail, icon buttons and the island icon circle, the stock dot and the bitácora dots. Nothing else is a pill.

The banda's lower edge carries a 6px hazard stripe hem (repeating 45deg carbon and yellow, 10px bands). Product photos sit on a white 4:3 plate with a hairline under it, and the card footer is separated by a dashed rule, like a torn receipt.

## Components

### Buttons
Solid enamel that you press into the wall.
- **Shape:** house radius (6px), 42px tall (36px compact, 34px text), Archivo 680 at wdth 92.
- **Primary:** azul with white text and the Botón shadow. Hover goes to azul-hondo. Active translates 2px and shrinks the shadow to 1px. Disabled sits at 0.42 opacity with no shadow.
- **Island:** primary CTAs carry a trailing icon in its own 32px circle (white at 16%), flush 5px from the right edge. On hover the circle turns yellow with carbon icon and nudges up-right. On secondary buttons the circle is barda-2.
- **Secondary:** white plate, linea-fuerte border, carbon text. Hover: azul border and text over azul-tinte. Inside a yellow surface it becomes translucent white (55 to 60%).
- **Text / Danger:** azul (or chile-hondo) text with an azul-tinte hover wash.
- **Icon:** 36px circle, barda-2 on hover.

### Chips
- **Style:** barda ground, carbon-2 text, 13.5px 620, 34px tall, 6px corners, no border.
- **State:** hover is barda-2 with carbon text. Active is solid azul with white text.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** placa (white) on the barda.
- **Shadow Strategy:** Esmalte at rest, Esmalte alto on hover (see Elevation).
- **Border:** 1px linea (sheets, nota) or linea-fuerte (product cards).
- **Internal Padding:** 24px on sheets, 20px on the nota and garage cards, 8 to 16px in product cards.

### Inputs / Fields
- **Style:** white, 1px linea-fuerte border, 4px corners, 44px tall, 15px text. The label sits above at 13px 650 carbon-2. Selects use an azul chevron.
- **Focus:** azul border plus a 3px azul ring at 22%. In the header search, the ring is yellow and there is no border.
- **Error:** chile-hondo 14px 650 text. Error blocks use a hairline chile inset.

### Navigation
- **Header (casco):** sticky azul band. It holds the painted EC logo plate (yellow, -3deg, chile letter shadow) beside the Bungee wordmark, a wide white search with a `/` key hint, ghost links (white at 12% on hover, white at 16% with a hairline when active), the yellow vehicle plate (inset dark outline like a license plate, dashed white when empty), and the white nota button with a chile count badge.
- **Category tabs:** a white strip. The active tab is a solid yellow block that slides between tabs, with carbon 750 text.
- **Footer:** azul-noche with the Bungee wordmark in white and a chile shadow.

### Pieza (product card)
A white enamel card. The photo sits on a 4:3 white plate. The fit tape is painted on the top-left corner of the plate: EMBONA (yellow) for direct fit, EQUIVALENTE (blue) for an equivalent, AGOTADO (chile) when sold out, which also greys the photo to 50%. Below come the name (two lines), brand and part number in condensed uppercase, then a dashed rule, the tabular price, the stock line, and a full-width secondary "Agregar a la nota" that turns solid azul on hover. Cards rise 3px on hover and stagger in on load (45ms steps).

### Existencias (stock)
Stock rests in carbon-2 text with a 7px azul dot. When sold out, the text is chile-hondo and the dot is chile. When live stock changes after first render, the badge turns solid yellow with a carbon dot and a 3px yellow halo, the dot pulses once, and the figure rolls up or down. The yellow stays until the visitor hovers or focuses that card. The alert is sustained, not a flash.

### Sello (painted tape) and Pintado
Bungee 13px tape, 3px corners, tilted -2deg. It is revealed by a brush sweep: clip-path from `inset(0 100% 0 0)` to full over 0.55s on `cubic-bezier(0.7, 0, 0.2, 1)`, staggered after the card. Pintado uses the same sweep (0.8s) to paint the active vehicle's name. Both are static under reduced motion.

### Banda (vehicle band)
A yellow enamel panel at the top of the catalog. With an active vehicle, it shows a carbon lead-in line and then the vehicle name painted at the largest scale in azul with the chile shadow, a primary island CTA and a secondary. On the right sits a ficha (MARCA / ODÓMETRO data labels, tabular values) closed by an in-line blue COMPATIBLE tape. The bottom edge carries the hazard-stripe hem. With no vehicle, it carries quick-pick white vehicle buttons and a tilted, white-bordered photo.

### Nota (order pad)
A sticky white sheet. It holds a header with a folio-styled piece count, ruled lines (quantity in azul, tabular amounts that spring to their new value), a round shipping rail in azul, and the total in Bungee 28px azul with the chile shadow. A primary island CTA and a secondary close the sheet.

## Do's and Don'ts

### Do:
- **Do** use the solid offset shadows (4px / 6px / 8px, zero blur) for surfaces, and the 3px azul-noche shadow under primary buttons. Pressing translates the button into its shadow.
- **Do** keep corners at 6px, with 4px for fields and nested thumbnails. Reserve full rounding for switches, count badges, the shipping bar, icon circles and status dots.
- **Do** set h1, h2, the painted vehicle name and the nota total in Bungee with the chile offset letter shadow.
- **Do** give primary CTAs the trailing island icon.
- **Do** show stock at rest in carbon with a blue dot (chile when sold out), and hold the yellow change state until the visitor sees it.
- **Do** place every product photo on the white plate at the shared scale, and keep provenance with every shipped raster.
- **Do** close the banda with the hazard-stripe hem and keep the MARCA / ODÓMETRO ficha with its blue COMPATIBLE tape.
- **Do** reveal fit tapes and painted names with the left-to-right brush sweep, and drop it under prefers-reduced-motion.

### Don't:
- **Don't** use yellow for anything other than fit / active vehicle and the stock-change alert.
- **Don't** use Bungee for buttons, inputs, prices in lists or body text.
- **Don't** use blurred or diffuse drop shadows on surfaces or buttons.
- **Don't** round cards, buttons, chips or tabs into pills.
- **Don't** fall back to the grey card store with a red accent, or to the earlier "nota de remisión" stationery costume.
- **Don't** put an uppercase tracked label above a heading. Uppercase labels name data only.
