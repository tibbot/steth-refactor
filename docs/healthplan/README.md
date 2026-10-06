# Health Plan lookup parity

Health Plan remains a customer-only lookup, not a reference collection. The existing hsx dropdown is populated from lookupStore.arrHealthplan (loaded through scp.get_healthplan_list). Selection retrieves scp.get_healthplan_detail with @p_healthplan_code, displays HPNAME in customer-id, and binds HPCODE/HPNAME to the notepad. Persistence carries the code as cust_hpl_abbr. The old generic search path is bypassed for the dropdown, avoiding a fabricated @p_health_plan parameter and a redundant result picker.

Choose Health Plan uses the existing Core dialog shell; Select requires a selection, Enter selects, and Cancel/Escape leave the previous customer untouched. An empty plan list produces a message. Switching customer category clears prior plan fields. Reference → Same accepts only member/provider/vendor, matching the legacy implementation.

The actual Incident class is covered by tests/persistence.browser.cjs with synthetic plan data and a native-dialog transport fixture. Checks cover population, blank selection, mouse/keyboard selection, cancellation, parameter identity, code/name display, persistence collection, stale-value clearing, and empty lists. No SQL or Core changes were made; the owner has confirmed live acceptance.
