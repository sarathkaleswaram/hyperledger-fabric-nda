import * as path from 'path';
import * as fs from 'fs';
import * as md5 from 'md5';
import { FileSystemWallet, Gateway } from 'fabric-network';
import parties from '../models/parties';
import ndaForm from '../models/nda-form';

// capture network variables from config.json
const configPath = path.join(__dirname, '..', '..', 'config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
var connection_file = config.connection_file;
var appAdmin = config.appAdmin;
var channel = config.channel;
var chaincode = config.chaincode;
var gatewayDiscovery = config.gatewayDiscovery;

const ccpPath = path.resolve(__dirname, '..', '..', '..', connection_file);

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

    let username = request.body.username;

    try {
        const walletPath = await path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        let enrollmentID =  await fs.readdirSync(walletPath).find(file => file != appAdmin);
    
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: enrollmentID, discovery: gatewayDiscovery });
        const network = await gateway.getNetwork(channel);
        const contract = network.getContract(chaincode);

        try {
            let buttons = [];
            let party = await parties.findOne({ username: username, password: md5(request.body.password) }).exec();
            if (party == null) {
                return {
                    status: 'FAILED',
                    message: "Invalid Credentials."
                }
            }
            if (party.type == "admin") {
                buttons.push({ label: "Add NDA", route: "/add-nda" }, { label: "Transactions", route: "/transactions" });
                return {
                    status: 'SUCCESS',
                    enrollmentID: username,
                    buttons: buttons
                }
            } else {
                let nda;
                if (party.ndaSubmitted) {
                    const result = await contract.evaluateTransaction('getNDA', party.ndaKey);
                    nda = JSON.parse(result.toString());
                    buttons.push({label: "Agreement", route: "/agreement-print"}, {label: "Transactions", route: "/transactions"});
                } else {
                    let ndaData = await ndaForm.findOne({partyusername: username}).exec();
                    nda = ndaData;
                    buttons.push({label: "Agreement", route: "/agreement"}, {label: "Transactions", route: "/transactions"});
                }
                return {
                    status: 'SUCCESS',
                    enrollmentID: username,
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