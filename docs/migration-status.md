# Migration status

All identified creation-workflow functionality is implemented and live accepted: member/provider/vendor search and collections; claim/auth/incident detail and supporting records; chosen references and clearing; dynamic labels and action-code synchronization; table presentation, sorting, formatting, counts and scrolling; shared filtering and unified indexes; Health Plan customer lookup; Statistics; incident persistence and Save & More/New.

The legacy parity fixes are live accepted: vendor identity binding, view-only incidents, reset/initialization protection, subtype cancellation/validation, and the CSM user-ID source.

Cleanup retires unused collection/detail paths, moves detail coverage to active Incident/Core rendering, repairs the table-map test harness, removes obsolete comments/routine diagnostic dumps, and reconciles documentation. Active detail lifecycle protection is regression-tested. All six browser suites pass and independent review approves the cleanup. A live smoke test of the updated active detail path remains with the owner.

Backlog, outside this iteration: loading an existing incident. Editing is not implied because the current procedure is insert-only. NPI query helpers are retained; loading APIs remain as backlog placeholders.

Separate CoreBackend observations: nvarchar and uniqueidentifier transport support. No Core changes are part of this cleanup.
