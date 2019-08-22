import { FileSystemWallet, Gateway } from 'fabric-network';
import * as path from 'path';

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'connection-org.json');

export default async function invoke(request) {
    try {
        if (request.body === undefined || 
            request.body === null || 
            request.body.invokeFunc === undefined ||
            request.body.enrollmentID === undefined) {
            return {
                status: 'FAILED',
                message: "Invalid Request."
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
        await gateway.connect(ccpPath, { wallet, identity: enrollmentID, discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('nda');


        switch (request.body.invokeFunc) {
            case "createParty":        
                if (request.body.partyname == null ||
                    request.body.ceo == null || 
                    request.body.location == null)
                {
                    return {
                        status: 'FAILED',
                        message: "Invalid Request. missing input information"
                    }
                }

                let partykey = gateway.getClient().newTransactionID().getTransactionID();
                let partyname = request.body.partyname;
                let ceo = request.body.ceo;
                let location = request.body.location;

                // Submit the specified transaction.
                await contract.submitTransaction('createParty', partykey, partyname, ceo, location);
                return {
                    status: 'SUCCESS',
                    message: `Transaction has been submitted`,
                    txID: partykey
                }

            case "initNDA":
                if (request.body.name == null ||
                    request.body.ceo == null || 
                    request.body.location == null || 
                    request.body.username == null || 
                    request.body.password == null || 
                    request.body.date == null ||
                    request.body.regarding == null)
                {
                    return {
                        status: 'FAILED',
                        message: "Invalid Request. missing input information"
                    }
                }

                await contract.submitTransaction('initNDA', request.body.name, request.body.ceo, request.body.location, request.body.username, request.body.password, request.body.date, request.body.regarding);
                return {
                    status: 'SUCCESS',
                    message: `Transaction has been submitted`
                }

            case "submitNDA": 
                if (request.body.disclosingParty == null ||
                    request.body.receivingParty == null || 
                    request.body.date == null || 
                    request.body.disclosingPartyLocation == null || 
                    request.body.receivingPartyLocation == null || 
                    request.body.ndaKey == null)
                {
                    return {
                        status: 'FAILED',
                        message: "Invalid Request. missing input information"
                    }
                }

                let ndaKey = request.body.ndaKey;
                let disclosingParty = request.body.disclosingParty;
                let disclosingPartyLocation = request.body.disclosingPartyLocation; 
                let receivingParty = request.body.receivingParty; 
                let receivingPartyLocation = request.body.receivingPartyLocation; 
                let date = request.body.date;
                let regarding = request.body.ndaRegarding;
                let agreementsign = request.body.agreementSign;

                // Submit the specified transaction.
                let result = await contract.submitTransaction('submitNDA', ndaKey, disclosingParty, disclosingPartyLocation, receivingParty, receivingPartyLocation, date, regarding, agreementsign);
                if (result.toString().length > 1) {
                    return {
                        status: 'FAILED',
                        message: result.toString()
                    }
                } else {
                    return {
                        status: 'SUCCESS',
                        message: `Transaction has been submitted`
                    }
                }
        
            default:
                return {
                    status: 'FAILED',
                    message: `Invalid Smart Contract function name`
                }   
        }
    } catch (error) {
        return {
            status: 'FAILED',
            message: `${error}`
        }
    }
}