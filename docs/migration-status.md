# Migration status

Completed and live accepted: member search/collections, claim/auth/incident details and supporting records, chosen references and clearing, dynamic labels, action-code synchronization, table labels/sorting/HTML/formatting/counts/scrolling, shared filtering with unified indexes and provider/Tax ID/NPI groups, filter UI, and incident insertion with Save & More/New.

Provider/vendor collections and detail-button visibility are live accepted. Health Plan is customer-only in legacy and needs no collection contract; lookup parity corrections are implemented and browser-tested, awaiting live acceptance. Final legacy parity review and cleanup remain within this iteration.

Backlog, outside this iteration: load an existing incident. Editing is not implied because the current persistence procedure is insert-only.

Separate CoreBackend observations: support nvarchar and uniqueidentifier transport types. No implementation is included in this migration task.
