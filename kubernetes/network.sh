#!/bin/bash

function printHelp() {
  echo "Usage: "
  echo "	./network.sh generate"
  echo "	./network.sh up"
  echo "	./network.sh down"
  echo "	./network.sh delete" 
  echo "	./network.sh deploy" 
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
    rm -rf crypto-config
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
    rm channel-artifacts/*
	else
		mkdir channel-artifacts
	fi

  echo "==============  Generating Orderer Genesis block =============="
  configtxgen -profile NDA_Profile -channelID $SYS_CHANNEL -outputBlock ./channel-artifacts/genesis.block
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo
  echo "==============  Generating channel configuration transaction 'channel.tx' =============="
  configtxgen -profile NDA_Profile -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi
  echo
  echo "==============  Generating anchor peer update for Org1MSP  =============="
  configtxgen -profile NDA_Profile -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
  res=$?
  if [ $res -ne 0 ]; then
    echo "Failed to generate anchor peer update for Org1MSP..."
    exit 1
  fi
}


function networkUp() {
  # export NDA_CA1_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)

  echo "============== Creating Persistant Volume and Files Pod =============="

  kubectl create -f kube-files/persistent-volume.yaml
  kubectl create -f kube-files/pod-files.yaml

  filesPodStatus=$(kubectl get pods -l app=nda-copy-files --output=jsonpath={.items..phase})

  echo
  while [ "${filesPodStatus}" != "Running" ]; do
    echo "Wating for Files Pod to run. Current status of Pod is ${filesPodStatus}"
    sleep 5;
    if [ "${filesPodStatus}" == "Error" ]; then
      echo "There is an error in the Files pod. Please check logs."
      exit 1
    fi
    filesPodStatus=$(kubectl get pods -l app=nda-copy-files --output=jsonpath={.items..phase})
  done

  echo
  kubectl get pv
  echo
  kubectl get pvc
  echo
  kubectl get pods

  startNetwork
}

function networkDown() {
  echo "============== Truncating Network =============="
  kubectl get pvc | tail -n+2 | awk '{print $1}' | xargs -I{} kubectl patch pvc {} -p '{"metadata":{"finalizers": null}}'
  kubectl get pv | tail -n+2 | awk '{print $1}' | xargs -I{} kubectl patch pv {} -p '{"metadata":{"finalizers": null}}'

  kubectl delete -f kube-files/deploy-orderer.yaml
  kubectl delete -f kube-files/deploy-peer0-org1.yaml
  kubectl delete -f kube-files/deploy-peer1-org1.yaml
  kubectl delete -f kube-files/deploy-ca.yaml
  kubectl delete -f kube-files/deploy-cli.yaml
  kubectl delete -f kube-files/deploy-explorer-db.yaml
  kubectl delete -f kube-files/deploy-explorer.yaml
  kubectl delete -f kube-files/persistent-volume.yaml
  kubectl delete -f kube-files/pod-files.yaml

  echo "END"
}

function delete() {
  echo "============== Deleting Deployments and Services =============="
  kubectl delete -f kube-files/deploy-orderer.yaml
  kubectl delete -f kube-files/deploy-peer0-org1.yaml
  kubectl delete -f kube-files/deploy-peer1-org1.yaml
  kubectl delete -f kube-files/deploy-ca.yaml
  kubectl delete -f kube-files/deploy-cli.yaml
  kubectl delete -f kube-files/deploy-explorer-db.yaml
  kubectl delete -f kube-files/deploy-explorer.yaml

  echo
  kubectl get services
  echo
  kubectl get pods
}

function deploy() {
  echo "============== Deleting files from Files Pod =============="
  kubectl exec nda-copy-files -- rm -r /opt/share/crypto-config
  kubectl exec nda-copy-files -- rm -r /opt/share/channel-artifacts
  kubectl exec nda-copy-files -- rm -r /opt/share/scripts
  kubectl exec nda-copy-files -- rm -r /opt/share/explorer
  kubectl exec nda-copy-files -- rm -r /opt/share/chaincode
  echo "Delete Success"

  startNetwork
}

function startNetwork() {
  echo
  echo "============== Copying artifacts and chaincode to Files Pod =============="
  kubectl cp crypto-config/ nda-copy-files:/opt/share/
  kubectl cp channel-artifacts/ nda-copy-files:/opt/share/
  kubectl cp scripts/ nda-copy-files:/opt/share/
  kubectl cp explorer/ nda-copy-files:/opt/share/
  kubectl cp ../chaincode/ nda-copy-files:/opt/share/
  echo "Copy Success"

  echo
  echo "============== Files in Files pod =============="
  kubectl exec nda-copy-files ls /opt/share/

  echo
  echo "============== Creating Deployments and Services =============="
  kubectl create -f kube-files/deploy-orderer.yaml
  kubectl create -f kube-files/deploy-peer0-org1.yaml
  kubectl create -f kube-files/deploy-peer1-org1.yaml
  kubectl create -f kube-files/deploy-ca.yaml
  kubectl create -f kube-files/deploy-cli.yaml

  echo
  echo "============== Checking if all deployments are ready =============="

  NUMPENDING=$(kubectl get deployments | grep nda | awk '{print $2}' | grep 0 | wc -l | awk '{print $1}')
  while [ "${NUMPENDING}" != "0" ]; do
    echo "Waiting on pending deployments. Deployments pending = ${NUMPENDING}"
    NUMPENDING=$(kubectl get deployments | grep nda | awk '{print $2}' | grep 0 | wc -l | awk '{print $1}')
    sleep 1
  done

  echo
  kubectl get services
  echo
  kubectl get pods

  echo
  echo "Waiting for 10 seconds for peers and orderer to settle"
  echo
  sleep 10

  kubectl exec $(kubectl get pod -l name=nda-cli -o jsonpath={.items..metadata.name}) scripts/script.sh
  if [ $? -ne 0 ]; then
    echo "ERROR !!!!"
    exit 1
  fi

  echo
  echo "============== Starting Blockchain Explorer =============="
  startExplorer

  echo
  echo "============== Starting Backend API =============="
  startAPI

  echo
  echo "============== NDA Started Successfully =============="
  showPorts
}

function startExplorer() {
  kubectl create -f kube-files/deploy-explorer-db.yaml

  echo
  explorerDBStatus=$(kubectl get pods -l name=nda-explorer-db --output=jsonpath={.items..phase})

  while [ "${explorerDBStatus}" != "Running" ]; do
    echo "Wating for Explorer Database to run. Current status of Deployment is ${explorerDBStatus}"
    sleep 5;
    if [ "${explorerDBStatus}" == "Error" ]; then
      echo "There is an error in the Explorer Deployment. Please check logs."
      exit 1
    fi
    explorerDBStatus=$(kubectl get pods -l name=nda-explorer-db --output=jsonpath={.items..phase})
  done

  echo
  kubectl create -f kube-files/deploy-explorer.yaml

  echo
  NUMPENDING=$(kubectl get deployments | grep nda | awk '{print $2}' | grep 0 | wc -l | awk '{print $1}')
  while [ "${NUMPENDING}" != "0" ]; do
    echo "Waiting on pending deployments. Deployments pending = ${NUMPENDING}"
    NUMPENDING=$(kubectl get deployments | grep nda | awk '{print $2}' | grep 0 | wc -l | awk '{print $1}')
    sleep 1
  done

  echo
  kubectl get services
  echo
  kubectl get pods
}

function startAPI() {
  echo "TODO: api"
}

function showPorts() {
  IP_ADDRESS="$(dig +short myip.opendns.com @resolver1.opendns.com)"
  echo "--------------------------------------------------------------"
  echo "CouchDB running on: http://${IP_ADDRESS}:30984"
  echo "Backend API running on: http://${IP_ADDRESS}:30000"
  echo "Blockchain Explorer running on: http://${IP_ADDRESS}:30080"
  echo "User: admin, Password: adminpw"
  echo "--------------------------------------------------------------"
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
elif [ "${MODE}" == "delete" ]; then
  delete
elif [ "${MODE}" == "deploy" ]; then
  deploy
else
  printHelp
  exit 1
fi