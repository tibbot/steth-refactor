// @ts-nocheck
import * as Core from 'http://localhost/core-service/';


/** Application adapter for non-choosable subject collections. */
export function subjectCollection({ key, label, procedure, parameter, tableId, columns }) {
    return {
        key,
        label,
        allowFilter: false,
        loadPrimary: async referenceKey => {
            if (referenceKey == null || String(referenceKey).trim() === '') throw new Error(`${label}: missing subject key.`);
            const result = await Core.post('ParameterSQL', {
                spName: procedure,
                parameters: [{ Key: parameter, Value: referenceKey, Type: 'varchar' }],
            });
            if (result == null || result === '') return [];
            const records = Array.isArray(result) ? result : result.rows || result.recordset || result.result;
            if (!Array.isArray(records)) throw new Error(`${procedure} did not return a recordset.`);
            return records;
        },
        // These projections have no row PK: PROV_KEYID/VENDORID identify the
        // subject, not each specialty, location, roster entry, or address.
        normalizePrimary: records => {
            const occurrences = new Map();
            return records.map(record => {
                const signature = JSON.stringify(Object.keys(record).sort().map(name => [name, record[name]]));
                const occurrence = occurrences.get(signature) || 0;
                occurrences.set(signature, occurrence + 1);
                return Object.defineProperty({ ...record }, '_collectionRowId', {
                    value: JSON.stringify([key, signature, occurrence]),
                    enumerable: false,
                });
            });
        },
        recordId: record => record._collectionRowId,
        metadata: { tableId, columns },
    };
}

export const subjectColumn = (key, overrides = {}) => ({ key, label: key, sortable: true, sortType: 'text', ...overrides });
