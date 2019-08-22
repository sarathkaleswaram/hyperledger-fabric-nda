import { FileSystemWallet, Gateway } from 'fabric-network';
import * as path from 'path';

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'connection-org.json');

export default async function getNDATxs(request) {
    try {

        if (request.body === undefined || 
            request.body === null ||
            request.body.enrollmentID === undefined ||
            request.body.partyKey === undefined) {
            return {
                status: 'FAILED',
                message: "Invalid Request."
            }
        }

        let enrollmentID = request.body.enrollmentID;
        let partyKey = request.body.partyKey;

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the enrollmentID.
        const userExists = await wallet.exists(enrollmentID);
        if (!userExists) {
            console.log('Run the registerUser.ts application before retrying');
            return {
                status: 'FAILED',
                message: `An identity for the enrollmentID ${enrollmentID} does not exist in the wallet`
            }
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: enrollmentID, discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('nda');

        // Evaluate the specified transaction.
        const result = await contract.submitTransaction('getNDATxs', partyKey);
        return {
            status: 'SUCCESS',
            message: JSON.parse(result.toString())
        }

    } catch (error) {
        return {
            status: 'FAILED',
            message: `Failed to evaluate transaction: ${error}`
        }
    }
}
