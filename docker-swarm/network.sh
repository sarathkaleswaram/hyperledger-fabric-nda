#!/bin/bash

function printHelp() {
  echo "Usage: "
  echo "	./network.sh create_network"
  echo "	./network.sh up"
  echo "	./network.sh down"
  echo "	./network.sh start"
  echo "	./network.sh init"  
}

function createNetwork() {
  docker network create -d overlay --attachable nda
}

function networkUp() {
  export NDA_CA1_PRIVATE_KEY=$(cd ../crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)

  docker stack deploy -c docker-compose.yaml $DOCKER_STACK
  docker ps -a
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi

  echo
  echo "Waiting for 10 seconds for peers and orderer to settle"
  echo
  sleep 10

  docker exec $(docker ps --format='{{.Names}}' | grep _cli) scripts/script.sh
  if [ $? -ne 0 ]; then
    echo "ERROR !!!!"
    exit 1
  fi
}

function clearContainers() {
  CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer.*.nda.*/) {print $1}')
  if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
    echo "---- No containers available for deletion ----"
  else
    docker rm -f $CONTAINER_IDS
  fi
}

function removeUnwantedImages() {
  DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*.nda.*/) {print $3}')
  if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
    echo "---- No images available for deletion ----"
  else
    docker rmi -f $DOCKER_IMAGE_IDS
  fi
}

function networkDown() {
  export NDA_CA1_PRIVATE_KEY=$(cd ../crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)

  docker stack rm $DOCKER_STACK

  clearContainers
  removeUnwantedImages

  echo
  echo "Waiting for 5 seconds"
  echo
  sleep 5

  docker volume prune
  docker system prune
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

function init() {
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
      http://localhost:3000/registerParty \
      -H 'content-type: application/json' \
      -d '{
        "name": "Blockmatrix",
        "ceo": "Praveen",
        "location": "Hyderabad",
        "username": "blockmatrix",
        "password": "password",
        "type": "admin"
      }'
      
    echo
  fi
}


CHANNEL_NAME=mychannel
SYS_CHANNEL=nda-sys-channel
DOCKER_STACK=nda
MODE=$1
if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
elif [ "${MODE}" == "create_network" ]; then
  createNetwork
elif [ "${MODE}" == "start" ]; then
  startAPI
elif [ "${MODE}" == "init" ]; then
  init
else
  printHelp
  exit 1
fi