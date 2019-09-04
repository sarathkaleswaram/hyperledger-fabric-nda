#!/bin/bash

CHANNEL_NAME=mychannel
DELAY=3

createChannel() {
    sleep $DELAY

    peer channel create \
        -o orderer.example.com:7050 \
        -c $CHANNEL_NAME \
        -f ./channel-artifacts/channel.tx \
        --tls \
        --cafile $ORDERER_TLS_CERT
    
	echo "===================== Channel '$CHANNEL_NAME' created ===================== "
	echo
}

joinChannel () {
    sleep $DELAY

    CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer channel join -b $CHANNEL_NAME.block

    CORE_PEER_ADDRESS=peer1.org1.example.com:8051     
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA_CERT

    peer channel join -b $CHANNEL_NAME.block

    echo "===================== Peers joined channel '$CHANNEL_NAME' ===================== "
    echo
}

updateAnchorPeers() {
    sleep $DELAY

    CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer channel update \
        -o orderer.example.com:7050 \
        -c $CHANNEL_NAME \
        -f ./channel-artifacts/Org1MSPanchors.tx \
        --tls \
        --cafile $ORDERER_TLS_CERT

    echo "===================== Anchor peers updated on channel '$CHANNEL_NAME' ===================== "
    echo
}

installChaincode() {
    sleep $DELAY

    CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer chaincode install \
        -n nda \
        -v 1.0 \
        -p github.com/chaincode/ \
        -l golang

    CORE_PEER_ADDRESS=peer1.org1.example.com:8051     
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA_CERT

    peer chaincode install \
        -n nda \
        -v 1.0 \
        -p github.com/chaincode/ \
        -l golang

    echo "===================== Chaincode is installed on all peers ===================== "
    echo
}

instantiateChaincode() {
    sleep $DELAY

    CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA_CERT

    peer chaincode instantiate \
        -o orderer.example.com:7050 \
        -C $CHANNEL_NAME \
        -n nda \
        -l golang \
        -v 1.0 \
        -c '{"Args":[]}' \
        --tls \
        --cafile $ORDERER_TLS_CERT \
        --peerAddresses peer0.org1.example.com:7051 \
        --tlsRootCertFiles $PEER0_ORG1_CA_CERT

    echo "===================== Chaincode is instantiated on channel '$CHANNEL_NAME' ===================== "
    echo
}


CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
CORE_PEER_LOCALMSPID="Org1MSP"
PEER0_ORG1_CA_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER1_ORG1_CA_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt 
ORDERER_TLS_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

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
