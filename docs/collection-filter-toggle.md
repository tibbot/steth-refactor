# Per-collection Filter checkbox

Each filter-capable member tab has a native checkbox beside its title and count. Unchecking it shows all records in that collection; checking it resumes the current shared criteria. The checkbox acts independently of tab selection and uses the same font size as the tab label.

The preference persists across tab switching, shared criteria edits, and Clear. A new member resets all checkboxes to checked. Controls are disabled without applicable criteria, including date-only Conditions and Eligibility when the shared filter contains only diagnosis or service selections.

Bypass changes display only. Incident associations still evaluate linked artifacts against the current criteria even when Claims or Authorizations display all records. Toggles use loaded data and perform no retrieval. The shared Edit/View/Clear controls remain available while a collection is bypassed; status text identifies its effective state.

Deploy [Core PR #5](https://github.com/tibbot/core-service/pull/5) first, including its CSS. Older Core reports an explicit upgrade error. No SQL, snip definitions, or domain filtering rules change here; incident date-horizon refinements remain separate.

Proof: tests/incident-filter.browser.cjs exercises actual application orchestration, native controls, keyboard resume, association isolation, latest-criteria resumption, counts, disabled applicability, new-member reset, and desktop/narrow styling. Conditions date and subject collection regression tests cover the other collection paths. Live acceptance remains with the owner.
