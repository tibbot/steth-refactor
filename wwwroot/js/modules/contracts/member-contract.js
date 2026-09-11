// @ts-nocheck
/**
 * Stethoscope / Microscope | Member Contract
 * --------------------------------------------------
 * Description : Member collections, lazy filter indexes, table presentation,
 *               and detail retrieval metadata
 * Author      : wogi
 * Created     : 2026-07-15
 *
 * Search resolves one member and passes MEMB_KEYID to Core.Rmgr.
 * Primary collections load immediately. Diagnosis, service, and provider
 * indexes load only when filtering is requested.
 */

import * as Core from 'http://localhost/core-service/';

const MEMBER_KEY_PARAMETER = '@p_MEMB_KEYID';
const MEMBER_KEY_TYPE = 'uniqueidentifier';

const procedures = Object.freeze({
  eligibility: 'scp.list_member_eligibility',
  claims: 'scp.list_member_claim',
  authorizations: 'scp.list_member_authorization',
  incidents: 'scp.list_member_incident',
  conditions: 'scp.list_member_condition',

  claimDiagnosisIndex: 'scp.list_member_claim_diagnosis_index',
  claimServiceIndex: 'scp.list_member_claim_service_index',
  claimProviderIndex: 'scp.list_member_claim_provider_index',

  authorizationDiagnosisIndex: 'scp.list_member_auth_diagnosis_index',
  authorizationServiceIndex: 'scp.list_member_auth_service_index',
  authorizationProviderIndex: 'scp.list_member_auth_provider_index',
});

/**
 * Executes a typed record-set procedure through Core.
 *
 * @param {string} spName
 * @param {string|number} memberKeyId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function loadRows(spName, memberKeyId) {
  const payload = {
    spName,
    parameters: [
      {
        Key: MEMBER_KEY_PARAMETER,
        Value: memberKeyId,
        Type: MEMBER_KEY_TYPE,
      },
    ],
  };

  const result = await Core.post('ParameterSQL', payload);

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.recordset)) return result.recordset;
  if (Array.isArray(result?.result)) return result.result;

  throw new TypeError(
    `[member-contract] ${spName} did not return a record set.`,
  );
}

/**
 * Creates an atomic code/description option.
 *
 * @param {string} value
 * @param {string|null|undefined} description
 */
function codeOption(value, description) {
  const code = String(value ?? '').trim();
  const text = String(description ?? '').trim();

  return {
    value: code,
    label: text ? `${code} — ${text}` : code,
    searchText: `${code} ${text}`.trim(),
  };
}

/**
 * Creates a provider option whose visible label stays readable while fuzzy
 * search can include the provider key, tax ID, NPI, and role.
 *
 * @param {Record<string, unknown>} row
 */
function providerOption(row) {
  const providerKeyId = String(row.providerKeyId ?? '').trim();
  if (!providerKeyId) return null;

  const providerName = String(row.providerName ?? '').trim();
  const providerTaxId = String(row.providerTaxId ?? '').trim();
  const providerNpi = String(row.providerNpi ?? '').trim();
  const providerRole = String(row.providerRole ?? '').trim();

  return {
    value: providerKeyId,
    label: providerName
      ? `${providerName} · ${providerKeyId}`
      : providerKeyId,
    searchText: [
      providerName,
      providerKeyId,
      providerTaxId,
      providerNpi,
      providerRole,
    ].filter(Boolean).join(' '),
  };
}

/**
 * Builds the application-specific Member contract consumed by Core.Rmgr.
 *
 * @returns {object}
 */
function createMemberContract() {
  return {
    key: 'member',
    label: 'Member Records',

    sets: {
      eligibility: {
        key: 'eligibility',
        label: 'Eligibility',

        loadPrimary: memberKeyId =>
          loadRows(procedures.eligibility, memberKeyId),

        // The list procedure should return a deterministic eligibilityKey.
        recordId: row => String(row.eligibilityKey ?? ''),

        allowFilter: true,

        filters: {
          dateRange: {
            concept: 'dateRange',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.eligibilityKey ?? ''),
            start: row => row.optionStartDate,
            end: row => row.optionEndDate,
            matchMode: 'overlap',
          },
        },

        metadata: {
          tableId: 'member-eligibility-table',
          columns: [
            { key: 'healthPlanCode', label: 'Health Plan', sortable: true },
            { key: 'optionCode', label: 'Option', sortable: true },
            { key: 'optionStartDate', label: 'Opt Start', sortable: true, format: 'date' },
            { key: 'optionEndDate', label: 'Opt End', sortable: true, format: 'date' },
            { key: 'eligibilityStatusCode', label: 'Status', sortable: true },
            { key: 'pcpProviderName', label: 'Primary Care Physician', sortable: true },
            { key: 'pcpStartDate', label: 'PCP Start', sortable: true, format: 'date' },
            { key: 'pcpEndDate', label: 'PCP End', sortable: true, format: 'date' },
          ],
        },
      },

      claims: {
        key: 'claims',
        label: 'Claims',

        loadPrimary: memberKeyId =>
          loadRows(procedures.claims, memberKeyId),

        recordId: row => String(row.CLAIMNO ?? ''),

        allowFilter: true,

        secondary: {
          diagnoses: {
            load: memberKeyId =>
              loadRows(procedures.claimDiagnosisIndex, memberKeyId),
            requiredForFilter: true,
          },
          services: {
            load: memberKeyId =>
              loadRows(procedures.claimServiceIndex, memberKeyId),
            requiredForFilter: true,
          },
          providers: {
            load: memberKeyId =>
              loadRows(procedures.claimProviderIndex, memberKeyId),
            requiredForFilter: true,
          },
        },

        filters: {
          dateRange: {
            concept: 'dateRange',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.CLAIMNO ?? ''),
            start: row => row.serviceFromDate,
            end: row => row.serviceThroughDate,
            matchMode: 'overlap',
          },
          diagnosis: {
            concept: 'diagnosis',
            kind: 'multi',
            source: 'diagnoses',
            parentId: row => String(row.CLAIMNO ?? ''),
            values: row => codeOption(
              row.diagnosisCode,
              row.diagnosisDescription,
            ),
          },
          serviceCode: {
            concept: 'serviceCode',
            kind: 'multi',
            source: 'services',
            parentId: row => String(row.CLAIMNO ?? ''),
            values: row => codeOption(
              row.serviceCode,
              row.serviceDescription,
            ),
          },
          provider: {
            concept: 'provider',
            kind: 'multi',
            source: 'providers',
            parentId: row => String(row.CLAIMNO ?? ''),
            values: providerOption,
           },
           specialty: {
             concept: 'specialty',
             kind: 'multi',
             source: 'primary',
             parentId: row => String(row.CLAIMNO ?? ''),
             values: row => {
              const code = String(row.specialtyCode ?? '').trim();
              if (!code) return null;
              return codeOption(
                 code,
                 row.specialtyDescription,
              );
            },
          },
        },

        metadata: {
          tableId: 'member-claim-table',
          columns: [
            { key: 'CLAIMNO', label: 'Claim #', sortable: true },
            { key: 'dateReceived', label: 'Date Received', sortable: true, format: 'date' },
            { key: 'serviceFromDate', label: 'Service From', sortable: true, format: 'date' },
            { key: 'serviceThroughDate', label: 'Service Through', sortable: true, format: 'date' },
            { key: 'providerName', label: 'Provider', sortable: true },
            { key: 'specialtyCode', label: 'Specialty', sortable: true },
            { key: 'contractCode', label: 'Contract', sortable: true },
            { key: 'billedAmount', label: 'Billed', sortable: true, format: 'currency' },
            { key: 'statusCode', label: 'Status', sortable: true },
          ],
          detail: {
            sp: 'scp.get_claim_detail',
            snip: 'clm',
            idParameter: '@p_claimno',
            canChoose: true,
          },
        },
      },

      authorizations: {
        key: 'authorizations',
        label: 'Authorizations',

        loadPrimary: memberKeyId =>
          loadRows(procedures.authorizations, memberKeyId),

        recordId: row => String(row.AUTHNO ?? ''),

        allowFilter: true,

        secondary: {
          diagnoses: {
            load: memberKeyId =>
              loadRows(procedures.authorizationDiagnosisIndex, memberKeyId),
            requiredForFilter: true,
          },
          services: {
            load: memberKeyId =>
              loadRows(procedures.authorizationServiceIndex, memberKeyId),
            requiredForFilter: true,
          },
          providers: {
            load: memberKeyId =>
              loadRows(procedures.authorizationProviderIndex, memberKeyId),
            requiredForFilter: true,
          },
        },

        filters: {
          dateRange: {
            concept: 'dateRange',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.AUTHNO ?? ''),
            start: row => row.requestDate,
            end: row => row.expirationDate,
            matchMode: 'overlap',
          },
          diagnosis: {
            concept: 'diagnosis',
            kind: 'multi',
            source: 'diagnoses',
            parentId: row => String(row.AUTHNO ?? ''),
            values: row => codeOption(
              row.diagnosisCode,
              row.diagnosisDescription,
            ),
          },
          serviceCode: {
            concept: 'serviceCode',
            kind: 'multi',
            source: 'services',
            parentId: row => String(row.AUTHNO ?? ''),
            values: row => codeOption(
              row.serviceCode,
              row.serviceDescription,
            ),
          },
          provider: {
            concept: 'provider',
            kind: 'multi',
            source: 'providers',
            parentId: row => String(row.AUTHNO ?? ''),
            values: providerOption,
          },
          specialty: {
            concept: 'specialty',
            kind: 'multi',
            source: 'primary',
            parentId: row => String(row.AUTHNO ?? ''),
            values: row => {
              const code = String(row.specialtyCode ?? '').trim();
              if (!code) return null;
              return codeOption(
                code,
                row.specialtyDescription,
              );
            },
          },
        },

        metadata: {
          tableId: 'member-authorization-table',
          columns: [
            { key: 'AUTHNO', label: 'Auth #', sortable: true },
            { key: 'requestDate', label: 'Request Date', sortable: true, format: 'date' },
            { key: 'expirationDate', label: 'Expires', sortable: true, format: 'date' },
            { key: 'requestedByProviderName', label: 'Requested By', sortable: true },
            { key: 'requestedProviderName', label: 'Provider', sortable: true },
            { key: 'specialtyCode', label: 'Specialty', sortable: true },
            { key: 'contractCode', label: 'Contract', sortable: true },
            { key: 'statusCode', label: 'Status', sortable: true },
          ],
          detail: {
            sp: 'scp.get_authorization_detail',
            snip: 'aut',
            idParameter: '@p_authno',
            canChoose: true,
          },
        },
      },

      incidents: {
        key: 'incidents',
        label: 'Incidents',

        loadPrimary: memberKeyId =>
          loadRows(procedures.incidents, memberKeyId),

        recordId: row => String(row.CSINO ?? ''),

        allowFilter: true,

        filters: {
          dateRange: {
            concept: 'dateRange',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.CSINO ?? ''),
            start: row => row.openDate,
            end: row => row.closeDate,
            matchMode: 'overlap',
          },
        },

        metadata: {
          tableId: 'member-incident-table',
          columns: [
            { key: 'CSINO', label: 'Incident #', sortable: true },
            { key: 'openDate', label: 'Opened', sortable: true, format: 'date' },
            { key: 'closeDate', label: 'Closed', sortable: true, format: 'date' },
            { key: 'incidentTypeDescription', label: 'Description', sortable: true },
            { key: 'statusCode', label: 'Status', sortable: true },
          ],
          detail: {
            sp: 'scp.get_incident_detail',
            snip: 'inc',
            idParameter: '@p_csino',
            canChoose: true,
          },
        },
      },

      conditions: {
        key: 'conditions',
        label: 'Conditions',

        loadPrimary: async () => [],


        recordId: row => String(row.conditionKey ?? ''),

        //   TODO
        // loadPrimary: memberKeyId =>
        //       loadRows(
        //           procedures.conditions,
        //           memberKeyId,
        //       ),

        allowFilter: false,

        metadata: {
          tableId: 'member-condition-table',
          columns: [
            { key: 'conditionCode', label: 'Condition', sortable: true },
            { key: 'conditionDescription', label: 'Description', sortable: true },
            { key: 'startDate', label: 'Start', sortable: true, format: 'date' },
            { key: 'endDate', label: 'End', sortable: true, format: 'date' },
          ],
        },
      },
    },
  };
}

export {
  createMemberContract,
  procedures as memberProcedures,
};
