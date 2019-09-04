import { FileSystemWallet, Gateway, X509WalletMixin } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import * as md5 from 'md5';
import parties from '../models/parties';

// capture network variables from config.json
const configPath = path.join(__dirname, '..', '..', 'config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
var connection_file = config.connection_file;
var appAdmin = config.appAdmin;
var orgMSPID = config.orgMSPID;
var gatewayDiscovery = config.gatewayDiscovery;

const ccpPath = path.resolve(__dirname, '..', '..', '..', connection_file);

export default async function registerParty(request) {
    if (request.body === undefined ||
        request.body === null ||
        request.body.name === undefined ||
        request.body.ceo === undefined ||
        request.body.location === undefined ||
        request.body.username === undefined ||
        request.body.password === undefined ||
        request.body.type === undefined) {
        return {
            status: 'FAILED',
            message: "Invalid Request"
        }
    }
    try {
        var username = request.body.username;

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the enrollmentID.
        const userExists = await wallet.exists(username);
        if (userExists) {
            await parties.create({username: request.body.username}, {
                name: request.body.name,
                ceo: request.body.ceo,
                location: request.body.location,
                username: request.body.username,
                password: md5(request.body.password),
                type: request.body.type
            });
            return {
                status: 'FAILED',
                message: `An identity for the enrollmentID ${username} already exists in the wallet`
            }
        }

        // Check to see if we've already enrolled the app-admin enrollmentID.
        const adminExists = await wallet.exists(appAdmin);
        if (!adminExists) {
            console.log('Run the enrollAdmin.ts application before retrying');
            return {
                status: 'FAILED',
                message: `An identity for the admin enrollmentID ${appAdmin} does not exist in the wallet`
            }
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: appAdmin, discovery: gatewayDiscovery });

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        // Register the enrollmentID, enroll the enrollmentID, and import the new identity into the wallet.
        const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client' }, adminIdentity);
        const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
        const userIdentity = X509WalletMixin.createIdentity(orgMSPID, enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(username, userIdentity);

        await parties.create({
            name: request.body.name,
            ceo: request.body.ceo,
            location: request.body.location,
            username: request.body.username,
            password: md5(request.body.password),
            type: request.body.type,
        });

        return {
            status: 'SUCCESS',
            message: `Successfully registered and enrolled user with name ${username} and imported it into the wallet`
        }
    } catch (error) {
        return `Failed to register enrollmentID ${request.body.username}: ${error}`;
    }
}