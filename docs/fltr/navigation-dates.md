# Filter navigation and date presets

Core Fltr's fixed modal header contains a navigation pill for each rendered section. Each pill scrolls the modal body to its section and moves keyboard focus there without moving the page. Pills wrap at narrow widths. Read-only Current Filter renders navigation only for its displayed criteria.

The Year / Current dropdown offers All dates, Current, Custom, and available years newest first. Rmgr combines the optional deriveYears results from every filterable collection. Fltr derives years from complete source records, not the filtered subset. Multi-year intervals contribute each covered year. Missing or declared sentinel end dates contribute years through today; explicitly dated future intervals contribute their future years. A future-starting open interval contributes its start year. Unknown/invalid intervals do not invent years.

The application declares openEndYear=9999 on its date definitions. Core treats such ends as open-ended for matching and caps them only for year-option derivation. No primary record is modified. Open-ended records remain eligible when the user explicitly filters a future interval.

Selecting a year fills January 1 through December 31. Current fills today in both fields, selecting intervals that overlap today. Manual dates display Custom unless they match a complete available calendar year or the Current point. All dates clears date criteria while retaining other draft selections. Presets do not apply automatically; Apply commits and Cancel discards.

Date criteria retain inclusive endpoints. If From is supplied and Through is empty, Apply resolves Through to today's local calendar date and validates the resulting interval. Current Filter displays the effective explicit date. Both dates empty means no date restriction. A future From requires an explicit appropriate Through. Record ends remain open-ended; this default changes the filter criterion, not the data.

Tests/filter-navigation.browser.cjs uses real Core Fltr/Rmgr/modal implementations and a fixed clock to cover year spans, sentinel/missing endpoints, future records, shared year union, Current/tomorrow boundaries, blank-date behavior, editable presets, Apply/Cancel, exact read-only dates, header jumps/focus, and narrow-screen geometry. The full seven-suite browser regression run and Core type checking pass. Independent review approves. Live visual/data acceptance remains with the owner.

Rebuild Core and refresh the application to load the updated JavaScript/CSS and member date declarations. No SQL changes are required.
