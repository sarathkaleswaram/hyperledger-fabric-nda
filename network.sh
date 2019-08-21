#!/bin/bash

function printHelp() {
  echo "Usage: "
  echo "	./network.sh generate"
  echo "	./network.sh up"
  echo "	./network.sh down"
  echo "	./network.sh start"
  echo "	./network.sh wallet"  
}

function generateCerts() {
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "============== Generate certificates using cryptogen tool =============="
  if [ -d "crypto-config" ]; then
    rm -Rf crypto-config
  fi
  cryptogen generate --config=./crypto-config.yaml
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi
  echo

  if [ -d channel-artifacts ]; then
    echo    
	else
		mkdir channel-artifacts
	fi

  echo "==============  Generating Orderer Genesis block =============="
  configtxgen -profile TwoOrgsOrdererGenesis -channelID $SYS_CHANNEL -outputBlock ./channel-artifacts/genesis.block
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo
  echo "==============  Generating channel configuration transaction 'channel.tx' =============="
  configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi
  echo
  echo "==============  Generating anchor peer update for Org1MSP  =============="
  configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate anchor peer update for Org1MSP..."
    exit 1
  fi
  echo
  echo "============== Generating anchor peer update for Org2MSP   =============="
  configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org2MSP
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate anchor peer update for Org2MSP..."
    exit 1
  fi
}


function networkUp() {
  export NDA_CA1_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)
  export NDA_CA2_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org2.example.com/ca && ls *_sk)

  docker-compose up -d
  docker ps -a
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi

  docker exec cli scripts/script.sh
  if [ $? -ne 0 ]; then
    echo "ERROR !!!!"
    exit 1
  fi

  echo "============== Successfully started the network ============="
}


function networkDown() {
  export NDA_CA1_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)
  export NDA_CA2_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org2.example.com/ca && ls *_sk)

  docker-compose down --volumes --remove-orphans
  docker rmi -f $(docker images | grep dev | awk {'print $3'})
  docker container rm $(docker container ps -aq)
  y | docker network prune
  echo
}

function startAPI() {
  cd nda
  echo
	if [ -d node_modules ]; then
		echo "============== node modules installed already ============="
	else
		echo "============== Installing node modules ============="
		npm install
	fi
	echo

  echo "============== Running API ============="
  npm run start:watch
}

function wallet() {
  cd nda
  if [ -d wallet/admin ]; then
    echo "============== Wallet already exists ============="
  else 
    echo "============== Generating Wallet ============="
    mkdir wallet

    curl -X POST \
      http://localhost:3000/enrollAdmin \
      -H 'content-type: application/json' 

    echo
    
    curl -X POST \
      http://localhost:3000/registerUser \
      -H 'content-type: application/json' \
      -d '{
        "enrollmentID": "ksb"
      }'
  fi
}


CHANNEL_NAME=mychannel
SYS_CHANNEL=nda-sys-channel
MODE=$1
if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
elif [ "${MODE}" == "generate" ]; then
  generateCerts
  generateChannelArtifacts
elif [ "${MODE}" == "start" ]; then
  startAPI
elif [ "${MODE}" == "wallet" ]; then
  wallet
else
  printHelp
  exit 1
fi