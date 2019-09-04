import { FileSystemWallet } from 'fabric-network';
import * as path from 'path';
import * as apiRequest from 'request';
import ndaForm from '../models/nda-form';
import parties from '../models/parties';

export default function initNDA(request, callback) {
    try {
        if (request.body === undefined ||
            request.body === null ||
            request.body.enrollmentID === undefined ||
            request.body.name == null ||
            request.body.ceo == null || 
            request.body.location == null || 
            request.body.username == null || 
            request.body.password == null || 
            request.body.date == null ||
            request.body.regarding == null) {
                callback({
                status: 'FAILED',
                message: "Invalid Request. missing input information"
            })
        }

        let enrollmentID = request.body.enrollmentID;

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the enrollmentID.
        wallet.exists(enrollmentID).then(userExists => {
            if (!userExists) {
                console.log('Run the registerUser.ts application before retrying');
                callback({
                    status: 'FAILED',
                    message: `An identity for the enrollmentID ${enrollmentID} does not exist in the wallet`
                })
            }

            let reqBody = {
                name: request.body.name,
                ceo: request.body.ceo,
                location: request.body.location,
                username: request.body.username,
                password: request.body.password,
                type: "user",
            };
    
            apiRequest({
                url: 'http://localhost:3000/registerParty', 
                method: 'POST',
                json: true,
                body: reqBody,
                headers: {
                    "content-type": "application/json"
                }
            }, function (error, res) {
                if (error) {
                    callback({
                        status: 'FAILED',
                        message: `${error}`
                    })
                } else {
                    if (res.body.status == "SUCCESS") {
                        parties.findOne({type: "admin"}).then(party => {
                            ndaForm.create({ 
                                disclosingparty: reqBody.name, 
                                disclosingpartylocation: reqBody.location, 
                                receivingparty: party.name, 
                                receivingpartylocation: party.location, 
                                date: request.body.date, 
                                regarding: request.body.regarding, 
                                partyusername: request.body.username 
                            }).then(() => {
                                callback({
                                    status: 'SUCCESS',
                                    message: `Transaction has been submitted`
                                });
                            });
                        });
                    } else {
                        callback(res.body);
                    }
                }
            });
        });
    } catch (error) {
        callback({
            status: 'FAILED',
            message: `${error}`
        })
    }
}