import { subjectCollection, subjectColumn as col } from './subject-collection-contract.js';

export function createVendorContract() {
    return {
        key: 'vendor', label: 'Vendor',
        sets: {
            roster: subjectCollection({
                key: 'roster', label: 'Roster',
                procedure: 'scp.get_vendor_roster', parameter: '@p_VEN_KEYID', tableId: 'roster-table',
                columns: [col('Vendor Name'), col('Tax ID'), col('Provider Name'), col('Provider NPI'), col('Classification')],
            }),
            addresses: subjectCollection({
                key: 'addresses', label: 'Address',
                procedure: 'scp.get_vendor_address', parameter: '@p_VEN_KEYID', tableId: 'address-table',
                columns: [col('Vendor Name', {format:'html'}), col('Tax ID'), col('NPI'), col('Type'), col('Address'), col('Phone'), col('Fax')],
            }),
        },
    };
}
