kubectl exec -it $(kubectl get pod -l app=cli -o jsonpath={.items..metadata.name}) -- /bin/bash

peer channel create \
    -o orderer:31010 \
    -c mychannel \
    -f ./channel-artifacts/channel.tx \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
