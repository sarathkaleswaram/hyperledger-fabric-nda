import { FileSystemWallet, Gateway, X509WalletMixin } from 'fabric-network';
import * as path from 'path';

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'connection-org.json');

export default async function registerUser(request) {
    let enrollmentID = request.body.enrollmentID;

    if (!enrollmentID || enrollmentID.length == 0) {
        return {
            status: 'FAILED',
            message: "Please Enter a valid enrollmentID"
        }
    }
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the enrollmentID.
        const userExists = await wallet.exists(enrollmentID);
        if (userExists) {
            return {
                status: 'FAILED',
                message: `An identity for the enrollmentID ${enrollmentID} already exists in the wallet`
            }
        }

        // Check to see if we've already enrolled the admin enrollmentID.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            console.log('Run the enrollAdmin.ts application before retrying');
            return {
                status: 'FAILED',
                message: 'An identity for the admin enrollmentID "admin" does not exist in the wallet'
            }
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        // Register the enrollmentID, enroll the enrollmentID, and import the new identity into the wallet.
        const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: enrollmentID, role: 'client' }, adminIdentity);
        const enrollment = await ca.enroll({ enrollmentID: enrollmentID, enrollmentSecret: secret });
        const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(enrollmentID, userIdentity);

        return {
            status: 'SUCCESS',
            message: `Successfully registered and enrolled admin enrollmentID ${enrollmentID} and imported it into the wallet`
        }

    } catch (error) {
        return `Failed to register enrollmentID ${enrollmentID}: ${error}`;
    }
}