import * as FabricCAServices from 'fabric-ca-client';
import { FileSystemWallet, X509WalletMixin } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

// capture network variables from config.json
const configPath = path.join(__dirname, '..', '..', 'config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
var connection_file = config.connection_file;
var appAdmin = config.appAdmin;
var appAdminSecret = config.appAdminSecret;
var orgMSPID = config.orgMSPID;
var caName = config.caName;

const ccpPath = path.resolve(__dirname, '..', '..', '..', connection_file);
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

export default async function enrollAdmin() {
    try {
        
        // Create a new CA client for interacting with the CA.
        // const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        // const caTLSCACertsPath = path.resolve(__dirname, '..', '..', '..', caInfo.tlsCACerts.path);
        // const caTLSCACerts = fs.readFileSync(caTLSCACertsPath);
        // const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const caURL = ccp.certificateAuthorities[caName].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists(appAdmin);
        if (adminExists) {
            return {
                status: 'FAILED',
                message: `An identity for the admin user ${appAdmin} already exists in the wallet`
            }
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: appAdmin, enrollmentSecret: appAdminSecret });
        const identity = X509WalletMixin.createIdentity(orgMSPID, enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(appAdmin, identity);
        return {
            status: 'SUCCESS',
            message: `Successfully enrolled admin user ${appAdmin} and imported it into the wallet`
        }

    } catch (error) {
        return {
            status: 'FAILED',
            message: `Failed to enroll admin user ${appAdmin}: ${error}` 
        }
    }
}
