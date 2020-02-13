#!/bin/bash
kubectl delete -f 4nda-cli.yaml
kubectl delete -f 5nda-ca.yaml
kubectl delete -f 6nda-orderer.yaml
kubectl delete -f 7peer0-org1.yaml
kubectl delete -f 8peer1-org1.yaml