# Fltr

> **Status:** First pass implemented; awaiting live environment tests

## 1. Executive summary
Users need to narrow loaded member collections without replacing their records. Implement Core Fltr against the existing RecordFilter contract, deriving controls and matching parent IDs from application declarations. The main cost is managing criteria and asynchronous dialog lifetime consistently across Fltr and Rmgr.

## 2. Context and scope
ctrc.ts already declares date-range and multi-value filters. Rmgr accepts a factory, loads supporting sources, requests a dialog, and publishes a view. Clct emits filter and clear intent. Application contracts supply field accessors and domain labels. The first pass adds Fltr, cross-set application in Rmgr, and application wiring.

## 3. System context
Application contract → Rmgr → Fltr dialog and matcher → matching parent IDs → Rmgr view → application rendering → Clct/Tblm.
Core implements generic mechanisms. Domain knowledge stays in the application-supplied contract, not Core Rmgr or Fltr source.

## 4. Proposed design
### How it works
A claims filter request loads the declared support bundle once. Fltr derives options from all loaded records and support rows belonging to those records. The shared dialog opens with a copy of applied criteria and combines options from all filterable collections. Apply returns validated criteria; Cancel returns null. Rmgr commits the criteria and publishes matching primary records. Clear restores the complete collection.

### Components and responsibilities
Fltr implements RecordFilter: criteria state, option derivation, dialog drafting, projection, and generic matching. Internal pure functions handle normalization, option extraction, and matching without DOM access. A dialog adapter uses Core modal facilities and may be injected for tests. Rmgr owns retrieval, source lifetime, views, and coordination across sets. Application code supplies definitions and redraws tables from Rmgr subscriptions. Clct emits intent and displays filter state.

### Decisions
Use the existing factory and RecordFilter API rather than a parallel configuration model. Keep draft criteria separate from committed state so Cancel is harmless. Use OR within one multi-value concept and AND between concepts. Match secondary sources by parent ID, including when separate child rows satisfy separate concepts. Derive options from the full collection rather than the filtered view so editing does not remove available choices. Start with date-range and searchable checkbox groups; free-text record matching needs an explicit contract extension later.

## 5. Invariants and requirements
### Invariants
- INV-1: Primary and secondary inputs are never mutated.
- INV-2: Cancel leaves committed criteria and the visible view unchanged.
- INV-3: No active criteria returns null parentIds; an active filter with zero matches returns an empty set.
- INV-4: Values match by identity, not display label.
- INV-5: Results from an obsolete reference or destroyed owner cannot change the current view.
- INV-6: Clear restores all managed records in their original order before presentation sorting.

### Requirements
Date endpoints are inclusive; absent criteria endpoints are unbounded. Reversed or invalid user date ranges block Apply with an inline error. Missing or invalid record dates fail an active date criterion. Define open-ended record intervals consistently with matchMode. Multi-value options retain codes and descriptions, deduplicate by normalized identity, ignore missing values, and use the declared sorting callback where present. Searching an option group changes its displayed choices without clearing selected values. Display labels are assigned as text.

## 6. Interfaces and data
Implement RecordFilter and supply it through RecordFilterFactory. Preserve the existing open(sources), applyLocal, applySynced, clear, project, and match boundary. Definitions reference named primary or secondary sources through accessors; Fltr knows no SQL aliases. Criteria are copied on input and output, including arrays and Date values. Map source values to UI string tokens without collisions between typed values; return canonical FilterValue selections. Unknown active concepts and malformed definitions must produce explicit validation errors rather than silently broadening results.

### Naming and identity
setKey comes from the manager contract; concept keys come from filter definitions. parentId identifies the managed primary record. Ignore orphan secondary rows when deriving options and matching. Duplicate option IDs with conflicting labels need a deterministic display policy; matching retains identity.

## 7. Failure behavior and lifecycle
Support-loading failure retains the existing view and permits a later explicit retry. Reopening initializes draft criteria from applied state. Prevent duplicate dialogs for one manager. Capture reference generation before support loading and recheck after loading and after the dialog resolves. A reference change or destruction closes or invalidates the dialog; stale results are ignored. Match before committing a view, or restore state if evaluation fails, to avoid criteria/view disagreement. No background automatic retry.

## 8. Security, privacy, and operations
Use loaded authorized records only; Fltr makes no HTTP calls and logs no record values. Render labels as text. Dispose listeners and references on dialog close. Option search reduces rendered items; establish a rendering limit or virtualization after measuring actual option counts, without truncating the underlying selection universe. Modal keyboard behavior follows W3C APG: contained focus, Escape cancellation, and focus return.

## 9. Acceptance criteria
- AC-1: Claims diagnosis and provider criteria match the correct parent records, including separate support rows.
- AC-2: Apply updates records and counts; Cancel changes neither; Clear restores all records.
- AC-3: Edit retains selections and exposes options from the complete collection.
- AC-4: Date bounds and invalid ranges behave as specified.
- AC-5: Reference replacement during load or dialog lifetime cannot apply stale criteria.
- AC-6: Keyboard operation, group search, empty options, and zero matches work in a browser.

## 10. Test approach
Pure tests prove identity, OR/AND matching, parent joins, date semantics, source immutability, and null versus empty match results (INV-1, INV-3, INV-4; AC-1, AC-4). Browser tests prove draft isolation, apply/edit/clear, counts, option search, and focus (INV-2, INV-6; AC-2, AC-3, AC-6). Controlled asynchronous integration tests replace the reference during support loading and dialog use (INV-5; AC-5).

## 11. Risks and tradeoffs
ctrc.ts permits several primitive value types but the UI option shape uses string identities. A collision-free normalization policy is essential. Rmgr currently commits state before matching; evaluation errors need consistent recovery. Existing date parsing should be reused where its accepted formats match this contract.

## 12. Open questions
- Settled: one shared filter applies to every present collection. Each collection projects supported criteria; unsupported criteria have no effect. View Filter shows exact shared criteria and values. Clear restores all collections.
- What should minimumDistinctValues default to? The first pass defaults to one, honors an explicit threshold, and keeps active groups editable even if their options shrink.
- How should conflicting labels for one option identity be displayed? Recommend the first nonempty label in stable source order.
- Should missing record interval endpoints mean an open interval? The first pass treats an absent endpoint as unbounded when the other endpoint is valid; both absent means no date match. Invalid nonempty endpoints fail the date criterion.

## 13. Out of scope
Replacement database queries, persisted criteria across members, arbitrary expressions, fuzzy record search, and domain-specific logic in Core. Live database integration and final visual acceptance remain to be tested by the application owner.
