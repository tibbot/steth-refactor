# Application detail

The active detail path is Incident._showDetail, using Core Detl. Member collection metadata supplies the header procedure, parameter, snippet, and choice policy. Incident._getRelatedDetail supplies supporting procedures and column presentation maps. Header and supporting rows are retrieved through ParameterSQL and rendered with Core Tblm; Razor TableSQL is no longer part of this application path.

Claims and authorizations can be chosen. Incidents are view-only; eligibility and conditions have no artifact detail. Choose writes the artifact type/ID into the notepad. Close hides the view and preserves the association; Clear removes the association and hides the view.

Each request builds a detached Core shell. A generation check prevents older header, supporting-record, or build completions from replacing the current view. Reference replacement and clearing invalidate pending work. Only a complete current request is attached. Missing/mismatched headers or missing layouts produce an error and Retry rather than a choosable partial artifact.

Application snippets clm, aut, and inc contain data-bind slots matching the returned aliases. Extra returned fields are ignored; missing values remain empty. Explicit data-format=html retains the existing SQL span/title projections. Incident resolves its category-derived ID labels after binding. Related-table maps declare column labels, sorting types, display formatting, and explicit HTML opt-in. Empty supporting sets retain their existing explanatory messages.

The former standalone Detail implementation and duplicate detail-contracts module have been retired. tests/detail.browser.cjs now exercises the active Incident orchestration, real Core Detl/Tblm, current member detail metadata, and saved snippets. It covers complete claim/auth sections, choice identity, close/clear behavior, incident choice policy, scalar HTML/tooltips, category labels, replacement/cancellation, missing/mismatched data, failure/retry, and empty supporting sets. tests/table-maps.browser.cjs covers table presentation declarations. Set CORE_ROOT to core-service and make Playwright available through NODE_PATH when running the tests.
