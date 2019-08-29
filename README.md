# NON-DISCLOSURE AGREEMENT - Hyperledger Fabric

## Prerequisites

Source: [https://hyperledger-fabric.readthedocs.io/en/release-1.4/prereqs.html](https://hyperledger-fabric.readthedocs.io/en/release-1.4/prereqs.html)

## Usage

To generate artifacts

```
./network.sh generate
```

To bring network up

```
./network.sh up
```

To start API

```
./network.sh start
```

To generate wallet keys to access fabric through API

```
./network.sh wallet
```

To bring network down

```
./network.sh down
```


If running with IBM Blockchain Platform - modify nda/config.json
```
{
    "connection_file": "connection-ibp.json",
    "channel": "mychannel",
    "chaincode": "nda",
    "appAdmin": "app-admin",
    "appAdminSecret": "app-adminpw",
    "orgMSPID": "org1msp",
    "caName": "173.193.82.18:32017",
    "userName": "user1",
    "gatewayDiscovery": { "enabled": true, "asLocalhost": false }
}
```
change 'caName' as generated from IBP

If running in local
```
{
    "connection_file": "connection-local.json",
    "channel": "mychannel",
    "chaincode": "nda",
    "appAdmin": "admin",
    "appAdminSecret": "adminpw",
    "orgMSPID": "Org1MSP",
    "caName": "ca.org1.example.com",
    "userName": "user1",
    "gatewayDiscovery": { "enabled": true, "asLocalhost": true }
}
```