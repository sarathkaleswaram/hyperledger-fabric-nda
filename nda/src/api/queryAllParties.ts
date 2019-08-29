import { FileSystemWallet, Gateway } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

// capture network variables from config.json
const configPath = path.join(__dirname, '..', '..', 'config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
var connection_file = config.connection_file;
var channel = config.channel;
var chaincode = config.chaincode;
var gatewayDiscovery = config.gatewayDiscovery;

const ccpPath = path.resolve(__dirname, '..', '..', '..', connection_file);

export default async function queryAllParties(request) {
    try {

        if (request.body === undefined || 
            request.body === null ||
            request.body.enrollmentID === undefined) {
            return {
                status: 'FAILED',
                message: "Invalid Request. enrollmentID missing"
            }
        }

        let enrollmentID = request.body.enrollmentID;

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
        await gateway.connect(ccpPath, { wallet, identity: enrollmentID, discovery: gatewayDiscovery });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channel);

        // Get the contract from the network.
        const contract = network.getContract(chaincode);

        // Evaluate the specified transaction.
        const result = await contract.evaluateTransaction('queryAllParties');
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
