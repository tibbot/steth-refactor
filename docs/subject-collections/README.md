# Provider and vendor collections

Provider reference selection loads Specialty via scp.get_provider_specialty and Locations via scp.get_provider_location, each with @p_PROV_KEYID. Vendor selection loads Roster via scp.get_vendor_roster and Address via scp.get_vendor_address, each with @p_VEN_KEYID. Despite its name, the vendor parameter takes VENDORID, matching search's VEND_KEYID projection.

These contracts consume recordsets through ParameterSQL and declare presentation columns for Core Tblm. Only provider Street 1 and vendor-address Vendor Name opt into HTML, retaining the SQL-generated tooltip spans. Provider Cert. Date uses the existing date formatting/sorting mechanism. Subject key columns remain hidden as in the legacy tables.

The projections do not supply per-row primary keys. Normalization creates an internal display identity from the returned row values plus the occurrence count for identical rows. Multiple rows with the same PROV_KEYID or VENDORID remain visible and countable. No SQL mutation or domain logic was added to Core.

The application now derives Clct tabs from each domain contract. Member tabs retain their detail configuration. Provider/vendor tables have no detail/choose contracts or filters, matching legacy behavior. Old asynchronous loads cannot replace a newer reference's collections.

Browser verification: tests/subject-collections.browser.cjs uses the actual contracts and application orchestration with synthetic procedure responses and current Core. It covers parameter identity, counts, columns, date formatting/sorting, explicit HTML, empty/error results, member tabs, hidden detail/absent filtering, and reference replacement. Persistence and filter tests also pass. No SQL was executed. The owner has confirmed live acceptance.
