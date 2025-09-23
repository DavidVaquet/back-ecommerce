import 'dotenv/config';

export const ORG_ID = process.env.ORG_ID;
if (!ORG_ID) {
    throw new Error('Falta org_id en env');
}