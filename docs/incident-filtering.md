# Incident association filtering

Shared application contract for Stethoscope and Microscope; deploy Core PR #4 first. The contract requires Rmgr.supportsRelatedFilters and reports an explicit upgrade error against old Core. Each app retains its own contract and snippet copies.

Incident dates are primary: openDate/closeDate use the existing overlap/open-end semantics. Date-only filtering preserves unlinked incidents. Active diagnosis/service criteria then require at least one linked claim or authorization to match those criteria and their own dates. Both diagnosis and service must qualify the same artifact; separate links cannot satisfy half the criteria each. Clearing those criteria removes the link restriction.

scp.list_member_incident_related_artifact_index receives @p_MEMB_KEYID as varchar and returns CSINO, artifactType (CLAIM/AUTHORIZATION), artifactId. It loads only when Apply activates diagnosis/service, and is cached per member. Empty matches mean zero incidents; duplicate links do not duplicate primary rows.

scp.list_member_incident_provider_index receives the same member parameter and returns CSINO, professionalType (PROVIDER/VENDOR), professionalId, professionalRole (CUSTOMER/REFERENCE). It loads when opening the shared filter to supply options. Either role qualifies. Provider and Vendor selections combine with AND, and each selection permits any selected ID. Roles are informational; there is no role selector. GUID provider keys normalize case for SQL-cast/recordset parity.

Direct provider/vendor criteria are matched on incident associations, not on providers of linked artifacts. Related artifact matching projects date/diagnosis/service only. Other criteria unsupported by the incident contract, including the separate Tax ID/NPI/specialty concepts, retain the existing unsupported-criterion behavior. The professional index contains IDs/roles only: direct-only options display IDs; shared provider options can retain names from artifact index metadata.

All restrictions must pass. Failed/malformed source loads report failure and retain previous criteria/views; retry works for the same member. Clear and member replacement invalidate pending filter application. No SQL writes or domain rules were added to Core.

Proof: tests/incident-filter.browser.cjs runs actual application collection orchestration, member contracts, Core Rmgr/Fltr/Clct, and native filter controls in Edge with synthetic procedure rows. It verifies dates, typed DX/service joins, roles, AND/OR semantics, same-artifact qualification, counts, lazy/cache, retry, clear, member replacement, and narrow-screen controls. Live deployed-procedure acceptance remains with the owner. Conditions work is separate.
