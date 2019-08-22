import * as FabricCAServices from 'fabric-ca-client';
import { FileSystemWallet, X509WalletMixin } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'connection-org.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

export default async function enrollAdmin() {
    try {
        
        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACertsPath = path.resolve(__dirname, '..', '..', '..', caInfo.tlsCACerts.path);
        const caTLSCACerts = fs.readFileSync(caTLSCACertsPath);
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (adminExists) {
            return {
                status: 'FAILED',
                message: "An identity for the admin user 'admin' already exists in the wallet"
            }
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const identity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
        await wallet.import('admin', identity);
        return {
            status: 'SUCCESS',
            message: "Successfully enrolled admin user 'admin' and imported it into the wallet"
        }

    } catch (error) {
        return {
            status: 'FAILED',
            message: `Failed to enroll admin user "admin": ${error}`
        }
    }
}
