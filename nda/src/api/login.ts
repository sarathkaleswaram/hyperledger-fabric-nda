import * as path from 'path';
import * as fs from 'fs';
import { FileSystemWallet, Gateway } from 'fabric-network';

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'connection-org.json');

export default async function login(request) {
    if (request.body === undefined || 
        request.body === null ||
        request.body.username === undefined ||
        request.body.password === undefined) {
        return {
            status: 'FAILED',
            message: "Invalid Request"
        }
    }

    try {
        const walletPath = await path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        let enrollmentID =  await fs.readdirSync(walletPath).find(file => file != "admin");
    
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: enrollmentID, discovery: { enabled: true, asLocalhost: true } });
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('nda');
        const loginResult = await contract.submitTransaction('loginParty', request.body.username, request.body.password);

        try {
            let buttons = [];
            let party;
            try {
                party = JSON.parse(loginResult.toString());                
            } catch (error) {
                throw loginResult.toString();                
            }
            if (party.Record.type == "admin") {
                buttons.push({label: "Add NDA", route: "/add-nda"}, {label: "Transactions", route: "/transactions"});
                return {
                    status: 'SUCCESS',
                    enrollmentID: enrollmentID,
                    partyKey: party.Key,
                    buttons: buttons
                }
            } else {
                const result = await contract.submitTransaction('getNDA', party.Record.name.toUpperCase());
                buttons.push({label: "Agreement", route: "/agreement"}, {label: "Transactions", route: "/transactions"});
                let nda;
                if (result.toString().length > 1) {
                    nda = JSON.parse(result.toString());
                    if (nda.status == "Agreed") {
                        buttons = [];
                        buttons.push({label: "Agreement", route: "/agreement-print"}, {label: "Transactions", route: "/transactions"});
                    }
                } else {
                    nda = null;
                }
                return {
                    status: 'SUCCESS',
                    enrollmentID: enrollmentID,
                    partyKey: party.Key,
                    nda: nda,
                    buttons: buttons
                }
            }
        } catch (error) {
            return {
                status: 'FAILED',
                message: error
            }
        }
    } catch (error) {
        return {
            status: 'FAILED',
            message: 'Failed to login. Please try later.'
        }
    }

}