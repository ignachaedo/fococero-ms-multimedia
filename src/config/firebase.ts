import * as admin from 'firebase-admin';
import { envs } from './envs';

if (!admin.apps.length) {
    const privateKey = envs.FIREBASE_PRIVATE_KEY
        .replace(/\\n/g, '\n')
        .replace(/"/g, '')
        .trim();

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: envs.FIREBASE_PROJECT_ID,
            clientEmail: envs.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

export const firebaseAuth = admin.auth();
