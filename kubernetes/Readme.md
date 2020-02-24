# Manual Steps - Tested on minikube

```bash
cryptogen generate --config=./crypto-config.yaml
mkdir channel-artifacts
configtxgen -profile NDA_Profile -channelID nda-sys-channel -outputBlock ./channel-artifacts/genesis.block
configtxgen -profile NDA_Profile -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
configtxgen -profile NDA_Profile -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP


kubectl exec -it $(kubectl get pod -l name=nda-cli -o jsonpath={.items..metadata.name}) -- /bin/bash


peer channel create \
    -o nda-orderer:30750 \
    -c mychannel \
    -f ./channel-artifacts/channel.tx 

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer0-org1:30751

peer channel join -b mychannel.block

CORE_PEER_ADDRESS=nda-peer1-org1:30851

peer channel join -b mychannel.block

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer0-org1:30751

peer channel update \
    -o nda-orderer:30750 \
    -c mychannel \
    -f ./channel-artifacts/Org1MSPanchors.tx

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer0-org1:30751

peer chaincode install \
    -n nda \
    -v 1.0 \
    -p github.com/chaincode/ \
    -l golang

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer1-org1:30851

peer chaincode install \
    -n nda \
    -v 1.0 \
    -p github.com/chaincode/ \
    -l golang

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer0-org1:30751

peer chaincode list --installed

-------------------------------------------------------------------------------------------------------------------------------------------
CORE_PEER_ADDRESS=nda-peer0-org1:30751

peer chaincode instantiate \
    -o nda-orderer:30750 \
    -C mychannel \
    -n nda \
    -l golang \
    -v 1.0 \
    -c '{"Args":[]}'

-------------------------------------------------------------------------------------------------------------------------------------------
peer chaincode list --instantiated -C mychannel 

-------------------------------------------------------------------------------------------------------------------------------------------
peer chaincode invoke \
    -o nda-orderer:30750 \
    -C mychannel \
    -n nda \
    -c '{"function":"submitNDA","Args":["NDA1", "Person1", "Bang", "Blockmatrix", "HYD", "2100-12-12", "Explorer", "sign"]}' 

-------------------------------------------------------------------------------------------------------------------------------------------
peer chaincode invoke \
    -o nda-orderer:30750 \
    -C mychannel \
    -n nda \
    -c '{"function":"getAllNDA","Args":[]}'

-------------------------------------------------------------------------------------------------------------------------------------------
peer chaincode query -C mychannel -n nda -c '{"Args":["getAllNDA"]}'

```

CouchDB: ip_address:30984/_utils, ip_address:30985/_utils

kubectl exec -it $(kubectl get pods | grep blockchain-explorer-db | awk '{print $1}') -- /bin/bash

kubectl cp config/ nda-copy-files:/opt/share/
