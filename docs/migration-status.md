# Migration status

Completed and live accepted: member search/collections, claim/auth/incident details and supporting records, chosen references and clearing, dynamic labels, action-code synchronization, table labels/sorting/HTML/formatting/counts/scrolling, shared filtering with unified indexes and provider/Tax ID/NPI groups, filter UI, and incident insertion with Save & More/New.

Provider/vendor collection contracts are implemented and browser-tested, awaiting live acceptance. Health Plan collections require a scope decision based on legacy behavior. Final legacy parity review and cleanup remain within this iteration.

Backlog, outside this iteration: load an existing incident. Editing is not implied because the current persistence procedure is insert-only.

Separate CoreBackend observations: support nvarchar and uniqueidentifier transport types. No implementation is included in this migration task.
