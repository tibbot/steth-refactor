# Unified filter indexes

The member contract uses three complete member-wide sources:

- `scp.list_member_artifact_diagnosis_index`
- `scp.list_member_artifact_service_index`
- `scp.list_member_artifact_provider_index`

Each receives `@p_MEMB_KEYID`. The application continues sending `varchar` through ParameterSQL; the supplied SQL declares `uniqueidentifier`.

Every row contains `artifactType` (`CLAIM` or `AUTHORIZATION`) and `artifactId`. Diagnosis rows add `diagnosisCode` and `diagnosisDescription`. Service rows add `serviceCode` and `serviceDescription`. Provider rows add `providerId`, `providerKeyId`, `providerName`, `providerTaxId`, `providerNpi`, and `providerRole`.

Rmgr's optional secondary-source `sharedKey` identifies one full-source load per selected-reference lifecycle. Concurrent consumers share the same promise; successful results remain cached until reference replacement or destruction. Failed promises are removed for explicit retry. Consumers of one sharedKey must declare the same complete loader.

The optional `select` callback supplies the application-owned partition after retrieval. Claims select CLAIM rows and authorizations select AUTHORIZATION rows. Secondary parent accessors use artifactId; primary parent accessors retain CLAIMNO or AUTHNO. Core contains no artifact-type literals or SQL procedure knowledge.

The provider role remains available as support-row data; this change does not add a role control. A future provider/role pair must match the same support row.

Verification: `tests/fltr.browser.cjs` checks the actual member contract with synthetic procedure responses, exactly three index requests, same-text claim/auth identities, option derivation, reference replacement, and shared failure/retry. Core TypeScript checking also passes. Live SQL execution was not performed.

SQL source observations left for the owner: the service claim branch declares cdx but references det, and selects DIAGCODE as serviceCode; confirm the intended service-code column. The provider vendor join references prv although the provider alias is cpy. SQL files were not edited.

UI update: Tax ID and NPI are distinct multi-selection groups. Provider, Tax ID, and NPI definitions share providerAssociation as their matchGroup, requiring every active provider criterion to match the same index row. OR remains within each group; other groups combine with AND at the artifact level. Declarative columns and option details supply the table presentation without domain branching in Core.
