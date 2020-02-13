#!/bin/bash
kubectl cp ../crypto-config fabric-tools:/opt/share/
kubectl cp ../chaincode/ fabric-tools:/opt/share/
kubectl cp ../channel-artifacts/ fabric-tools:/opt/share/