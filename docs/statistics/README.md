# Statistics

The Statistics menu action instantiates one application Statistics class. It retrieves scp.get_incident_by_agent through ParameterSQL with @p_user_name from pEL. @p_workday is omitted to retain the procedure's current-day default. Records are rendered with Core Tblm rather than Razor TableSQL. The hidden stethoscope_key identifies the incident; displayed columns retain the procedure aliases. Initiated includes time and receives an application-derived numeric sort value without changing its display text.

Each row can be selected with a mouse, Enter, or Space to retrieve scp.get_last_incident_note with @p_CSINO. The note is shown as plain text with preserved line breaks. Copy is offered only where a secure clipboard API is available; copy errors retain the note for manual copying. Closing the statistics dialog settles its lifecycle before opening the note dialog. Generation checks discard responses after close/reopen.

Statistics does not load or edit an incident and does not touch the current draft or timer. Loading, empty, missing-user, retrieval-error, and missing-note states are handled. Reopening performs a new retrieval, so newly saved incidents are included.

Verification: tests/statistics.browser.cjs exercises the class with actual Core table and modal implementations in Edge and synthetic transport responses. It covers agent/parameter identity, sorting across years, keyboard selection, literal note markup, clipboard text, empty/error responses, late completion, and preservation of the draft. No database procedure was executed. Live acceptance remains with the owner.
