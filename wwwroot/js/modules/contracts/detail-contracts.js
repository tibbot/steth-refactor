// Application-owned procedure names and presentation policy. Core has no domain knowledge.
const table = (key, procedure, parameter, tableId) => ({ key, procedure, parameter, tableId });
const shared = [
    table('diagnoses', 'scp.get_artifact_diagnosis', '@p_artifact_id', 'artifactDiagnosis-table'),
    table('notes', 'scp.get_artifact_note', '@p_artifact_id', 'artifactNote-table'),
    table('references', 'scp.get_referenced_artifact', '@p_artifact_id', 'referencedArtifact-table'),
    table('relatedIncidents', 'scp.get_related_incident', '@p_artifact_id', 'relatedIncident-table'),
];

const definitions = {
    claim: {
        label: 'Claim', snip: 'clm', idField: 'CLAIMNO', parameter: '@p_CLAIMNO',
        procedure: 'scp.get_claim_detail', canChoose: true, htmlFields: [],
        tables: [
            ...shared,
            table('services', 'scp.get_claim_procedure', '@p_CLAIMNO', 'claimProcedure-table'),
            table('processingStatus', 'scp.get_claim_processing_status', '@p_CLAIMNO', 'claimProcessStatus-table'),
            table('duplicates', 'scp.get_claim_duplicate', '@p_CLAIMNO', 'claimDuplicate-table'),
        ],
    },
    authorization: {
        label: 'Authorization', snip: 'aut', idField: 'AUTHNO', parameter: '@p_AUTHNO',
        procedure: 'scp.get_authorization_detail', canChoose: true,
        htmlFields: ['place_of_service', 'req_by_speccode', 'ref_to_speccode', 'fac_provider_speccode'],
        tables: [
            ...shared,
            table('inpatient', 'scp.get_authorization_inpatient_detail', '@p_AUTHNO', 'inpatientDetail-table'),
            table('services', 'scp.get_authorization_procedure', '@p_AUTHNO', 'authorizationProcedure-table'),
            table('claimReferences', 'scp.get_claim_xref', '@p_AUTHNO', 'claimXref-table'),
        ],
    },
    incident: {
        label: 'Incident', snip: 'inc', idField: 'CSINO', parameter: '@p_CSINO',
        procedure: 'scp.get_incident_detail', canChoose: false,
        htmlFields: [
            'incident_ctc_relation', 'incident_ref_type', 'incident_ref_sub_type',
            'incident_res_priority', 'incident_res_status', 'incident_res_action', 'incident_res_result',
        ],
        tables: [table('notes', 'scp.get_incident_note', '@p_CSINO', 'incidentNote-table')],
    },
};

export function getDetailContract(type) {
    const contract = definitions[String(type).toLowerCase()];
    if (!contract) throw new Error(`Unsupported detail type: ${type}`);
    return contract;
}
