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
// TODO: restore 'uniqueidentifier' when CoreBackend/Razr supports it.
// const MEMBER_KEY_TYPE = 'uniqueidentifier';
const MEMBER_KEY_TYPE = 'varchar';

const procedures = Object.freeze({
  eligibility: 'scp.list_member_eligibility',
  claims: 'scp.list_member_claim',
  authorizations: 'scp.list_member_authorization',
  incidents: 'scp.list_member_incident',
  conditions: 'scp.list_member_condition',

  diagnosisIndex: 'scp.list_member_artifact_diagnosis_index',
  serviceIndex: 'scp.list_member_artifact_service_index',
  providerIndex: 'scp.list_member_artifact_provider_index',
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

  if (result == null || result === '') return [];
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
    createFilter: args => new Core.Fltr(args),

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
            label: 'Date Range',
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
            { key: 'memberId', label: 'Member ID', sortable: true, sortType: 'text' },
            { key: 'healthPlanCode', label: 'Health Plan', sortable: true, sortType: 'text' },
            { key: 'optionCode', label: 'Option', sortable: true, sortType: 'text' },
            { key: 'optionStartDate', label: 'Opt Start', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'optionEndDate', label: 'Opt End', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'eligibilityStatusCode', label: 'Status', sortable: true, sortType: 'text' },
            { key: 'pcpProviderId', label: 'PCP Provider ID', sortable: true, sortType: 'text' },
            { key: 'pcpProviderName', label: 'Primary Care Physician', sortable: true, sortType: 'text' },
            { key: 'pcpStartDate', label: 'PCP Start', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'pcpEndDate', label: 'PCP End', sortable: true, sortType: 'date', displayFormat: 'date' },
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
              loadRows(procedures.diagnosisIndex, memberKeyId),
            sharedKey: procedures.diagnosisIndex,
            select: row => row.artifactType === 'CLAIM',
            requiredForFilter: true,
          },
          services: {
            load: memberKeyId =>
              loadRows(procedures.serviceIndex, memberKeyId),
            sharedKey: procedures.serviceIndex,
            select: row => row.artifactType === 'CLAIM',
            requiredForFilter: true,
          },
          providers: {
            load: memberKeyId =>
              loadRows(procedures.providerIndex, memberKeyId),
            sharedKey: procedures.providerIndex,
            select: row => row.artifactType === 'CLAIM',
            requiredForFilter: true,
          },
        },

        filters: {
          dateRange: {
            concept: 'dateRange',
            label: 'Date Range',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.CLAIMNO ?? ''),
            start: row => row.serviceFromDate,
            end: row => row.serviceThroughDate,
            matchMode: 'overlap',
          },
          diagnosis: {
            concept: 'diagnosis',
            label: 'Diagnosis',
            kind: 'multi',
            source: 'diagnoses',
            parentId: row => String(row.artifactId ?? row.CLAIMNO ?? ''),
            values: row => codeOption(
              row.diagnosisCode,
              row.diagnosisDescription,
            ),
          },
          serviceCode: {
            concept: 'serviceCode',
            label: 'Service Code',
            kind: 'multi',
            source: 'services',
            parentId: row => String(row.artifactId ?? row.CLAIMNO ?? ''),
            values: row => codeOption(
              row.serviceCode,
              row.serviceDescription,
            ),
          },
          provider: {
            concept: 'provider',
            label: 'Provider',
            kind: 'multi',
            source: 'providers',
            parentId: row => String(row.artifactId ?? row.CLAIMNO ?? ''),
            values: providerOption,
           },
           specialty: {
             concept: 'specialty',
            label: 'Specialty',
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
            { key: 'CLAIMNO', label: 'Claim #', sortable: true, sortType: 'text' },
            { key: 'dateReceived', label: 'Date Received', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'serviceFromDate', label: 'Service From', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'serviceThroughDate', label: 'Service Through', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'providerName', label: 'Provider', sortable: true, sortType: 'text' },
            { key: 'specialtyCode', label: 'Specialty', sortable: true, sortType: 'text' },
            { key: 'contractCode', label: 'Contract', sortable: true, sortType: 'text' },
            { key: 'billedAmount', label: 'Billed', sortable: true, sortType: 'number', displayFormat: 'currency' },
            { key: 'statusCode', label: 'Status', sortable: true, sortType: 'text' },
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
              loadRows(procedures.diagnosisIndex, memberKeyId),
            sharedKey: procedures.diagnosisIndex,
            select: row => row.artifactType === 'AUTHORIZATION',
            requiredForFilter: true,
          },
          services: {
            load: memberKeyId =>
              loadRows(procedures.serviceIndex, memberKeyId),
            sharedKey: procedures.serviceIndex,
            select: row => row.artifactType === 'AUTHORIZATION',
            requiredForFilter: true,
          },
          providers: {
            load: memberKeyId =>
              loadRows(procedures.providerIndex, memberKeyId),
            sharedKey: procedures.providerIndex,
            select: row => row.artifactType === 'AUTHORIZATION',
            requiredForFilter: true,
          },
        },

        filters: {
          dateRange: {
            concept: 'dateRange',
            label: 'Date Range',
            kind: 'dateRange',
            source: 'primary',
            parentId: row => String(row.AUTHNO ?? ''),
            start: row => row.requestDate,
            end: row => row.expirationDate,
            matchMode: 'overlap',
          },
          diagnosis: {
            concept: 'diagnosis',
            label: 'Diagnosis',
            kind: 'multi',
            source: 'diagnoses',
            parentId: row => String(row.artifactId ?? row.AUTHNO ?? ''),
            values: row => codeOption(
              row.diagnosisCode,
              row.diagnosisDescription,
            ),
          },
          serviceCode: {
            concept: 'serviceCode',
            label: 'Service Code',
            kind: 'multi',
            source: 'services',
            parentId: row => String(row.artifactId ?? row.AUTHNO ?? ''),
            values: row => codeOption(
              row.serviceCode,
              row.serviceDescription,
            ),
          },
          provider: {
            concept: 'provider',
            label: 'Provider',
            kind: 'multi',
            source: 'providers',
            parentId: row => String(row.artifactId ?? row.AUTHNO ?? ''),
            values: providerOption,
          },
          specialty: {
            concept: 'specialty',
            label: 'Specialty',
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
            { key: 'AUTHNO', label: 'Auth #', sortable: true, sortType: 'text' },
            { key: 'requestDate', label: 'Request Date', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'startDate', label: 'Start', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'expirationDate', label: 'Expires', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'requestedByProviderName', label: 'Requested By', sortable: true, sortType: 'text' },
            { key: 'requestedProviderName', label: 'Provider', sortable: true, sortType: 'text' },
            { key: 'specialtyCode', label: 'Specialty', sortable: true, sortType: 'text' },
            { key: 'contractCode', label: 'Contract', sortable: true, sortType: 'text' },
            { key: 'statusCode', label: 'Status', sortable: true, sortType: 'text' },
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
            label: 'Date Range',
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
            { key: 'CSINO', label: 'Incident #', sortable: true, sortType: 'text' },
            { key: 'openDate', label: 'Opened', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'closeDate', label: 'Closed', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'incidentTypeDescription', label: 'Description', sortable: true, sortType: 'text' },
            { key: 'statusCode', label: 'Status', sortable: true, sortType: 'text' },
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

        loadPrimary: memberKeyId =>
            loadRows(
                procedures.conditions,
                memberKeyId,
            ),


        recordId: row => String(row.conditionKey ?? ''),

        allowFilter: false,

        metadata: {
          tableId: 'member-condition-table',
          columns: [
            { key: 'conditionCode', label: 'Condition', sortable: true, sortType: 'text' },
            { key: 'conditionDescription', label: 'Description', sortable: true, sortType: 'text' },
            { key: 'conditionFromDate', label: 'Start', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'conditionToDate', label: 'End', sortable: true, sortType: 'date', displayFormat: 'date' },
            { key: 'conditionStatus', label: 'Status', sortable: true, sortType: 'text' },
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
