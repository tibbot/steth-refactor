# Incident persistence

The application-owned IncidentPersistence adapter translates current form and notepad fields into the existing flat JSON contract for scp.set_incident. Chosen references serialize as singular Claim or Authorization. User name comes from pEL. The numeric incident-system user ID comes from csm_user_id returned by scp.get_next_csino, matching legacy; authentication pUID is not substituted. Missing csm_user_id blocks persistence. Start/open dates are generated from the contact start in local calendar time; duration is sampled at submission. Empty closed dates serialize as null.

The ParameterSQL request contains one @p_csi_data parameter. Transport remains varchar because the current CoreBackend type switch does not support nvarchar, although the SQL procedure declares nvarchar(max). Adding Unicode parameter support is a separate Core improvement for discussion.

Success requires a returned incident_number and explicit csm_error = 0. Missing/malformed responses, procedure errors, and transport failures preserve entered values and do not advance the form. The insert-only procedure is not used for updates. Confirmed submissions are remembered so they cannot be posted twice in the current incident lifecycle. Save buttons and form editing are blocked while a save is in progress; no automatic retry occurs.

Save & More retains contact/customer, clears reference/resolution and old incident timing, and reserves a new incident number. Save & New clears the whole form and defers initialization until the next interaction. Both transitions require successful validation and confirmed persistence. Lookup codes are cleared with their controls. Contact initialization shares one pending promise so saving cannot outrun the number/timer initialization.

Verification: tests/persistence.browser.cjs runs the real application class and persistence adapter in Edge against mocked Core transport. It covers mapping when the notepad sits outside #scp, notes/JSON, both chosen artifact types, dates/duration, user identity, validation rejection, transport/procedure/malformed-response failures, duplicate clicks, insert-only confirmation, transitions, and lock cleanup. No SQL procedure was executed and no database record was created. Live persistence testing remains with the owner.

Out of scope: loading/editing existing incidents, changing SQL procedure behavior, CoreBackend Unicode support, and additional domain collections.

Submission validation is application-owned. The previous save hook passed a selector to a validation API whose current contract expects a schema and values; it did not provide a usable save validation path. Persistence now checks the legacy required fields, selected subjects, initialized incident/time, and numeric agent identity explicitly before posting.

Parity fixes: vendor normalization preserves SQL aliases (with vendorid compatibility for older snippets); incident choices are rejected; reset invalidates pending initialization; subtype picker cancellation settles and clears the triad; save validates the final type/subtype/code combination. Regression tests cover each case, including an old response arriving while a new initialization is pending. Independent review approved the fixes. Live acceptance remains with the owner.
