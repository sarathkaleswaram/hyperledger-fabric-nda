#!/bin/bash
kubectl create -f 4nda-cli.yaml
kubectl create -f 5nda-ca.yaml
kubectl create -f 6nda-orderer.yaml
kubectl create -f 7peer0-org1.yaml
kubectl create -f 8peer1-org1.yaml