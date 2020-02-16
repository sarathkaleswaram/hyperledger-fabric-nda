#!/bin/bash

ORDERER=nda-orderer:30750
CHANNEL_NAME=mychannel
CC_NAME=nda
CC_VERSION=1.0
DELAY=3

createChannel() {
    sleep $DELAY

    peer channel create \
        -o $ORDERER \
        -c $CHANNEL_NAME \
        -f ./channel-artifacts/channel.tx 
    
	echo "===================== Channel '$CHANNEL_NAME' created ===================== "
	echo
}

joinChannel () {
    sleep $DELAY

    CORE_PEER_ADDRESS=nda-peer0-org1:30751
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer channel join -b $CHANNEL_NAME.block

    CORE_PEER_ADDRESS=nda-peer1-org1:30851
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA_CERT

    peer channel join -b $CHANNEL_NAME.block

    echo "===================== Peers joined channel '$CHANNEL_NAME' ===================== "
    echo
}

updateAnchorPeers() {
    sleep $DELAY

    CORE_PEER_ADDRESS=nda-peer0-org1:30751
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer channel update \
        -o $ORDERER \
        -c $CHANNEL_NAME \
        -f ./channel-artifacts/Org1MSPanchors.tx

    echo "===================== Anchor peers updated on channel '$CHANNEL_NAME' ===================== "
    echo
}

installChaincode() {
    sleep $DELAY

    CORE_PEER_ADDRESS=nda-peer0-org1:30751
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer chaincode install \
        -n $CC_NAME \
        -v $CC_VERSION \
        -p github.com/chaincode/ \
        -l golang

    CORE_PEER_ADDRESS=nda-peer1-org1:30851     
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA_CERT

    peer chaincode install \
        -n $CC_NAME \
        -v $CC_VERSION \
        -p github.com/chaincode/ \
        -l golang

    echo "===================== Chaincode is installed on all peers ===================== "
    echo
    peer chaincode list --installed
    echo "===================== Chaincode installed list ===================== "
}

instantiateChaincode() {
    sleep $DELAY

    CORE_PEER_ADDRESS=nda-peer0-org1:30751
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer chaincode instantiate \
        -o $ORDERER \
        -C $CHANNEL_NAME \
        -n $CC_NAME \
        -l golang \
        -v $CC_VERSION \
        -c '{"Args":[]}' 

    echo "===================== Chaincode is instantiated on channel '$CHANNEL_NAME' ===================== "
    echo
}

queryChaincode() {
    sleep $DELAY
    
    CORE_PEER_ADDRESS=nda-peer1-org1:30851     
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA_CERT

    peer chaincode query \
    -C $CHANNEL_NAME \
    -n $CC_NAME \
    -c '{"Args":["getAllNDA"]}'

    CORE_PEER_ADDRESS=nda-peer0-org1:30751
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    echo "===================== Chaincode query success ===================== "
    echo
    peer chaincode list --instantiated -C $CHANNEL_NAME
    echo "===================== Chaincode instantiated list ===================== "
}


CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
CORE_PEER_LOCALMSPID="Org1MSP"
PEER0_ORG1_CA_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER1_ORG1_CA_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt 

echo "Creating channel..."
createChannel

echo "Having all peers join the channel..."
joinChannel

echo "Updating anchor peers..."
updateAnchorPeers

echo "Installing chaincode..."
installChaincode

echo "Instantiating chaincode..."
instantiateChaincode

echo "Querying chaincode..."
queryChaincode