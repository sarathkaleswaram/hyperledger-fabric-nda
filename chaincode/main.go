package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

type SmartContract struct {
}

type NDA struct {
	DisclosingParty         string `json:"disclosingparty"`
	DisclosingPartyLocation string `json:"disclosingpartylocation"`
	ReceivingParty          string `json:"receivingparty"`
	ReceivingPartyLocation  string `json:"receivingpartylocation"`
	Date                    string `json:"date"`
	Regarding               string `json:"regarding"`
	AgreementSign           string `json:"agreementsign"`
}

func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	function, args := APIstub.GetFunctionAndParameters()

	if function == "getAllNDA" {
		return s.getAllNDA(APIstub)
	} else if function == "getNDA" {
		return s.getNDA(APIstub, args)
	} else if function == "submitNDA" {
		return s.submitNDA(APIstub, args)
	} else if function == "getNDATxs" {
		return s.getNDATxs(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) submitNDA(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 8 {
		return shim.Error("Incorrect number of arguments. Expecting 8")
	}
	var buffer bytes.Buffer

	now := time.Now()
	parseTime, _ := time.Parse("2006-01-02", now.Format("2006-01-02"))
	ndaDate, _ := time.Parse("2006-01-02", args[5])
	if ndaDate.Before(parseTime) {
		buffer.WriteString("Your NDA has expired. Please contact administrator.")
		return shim.Success(buffer.Bytes())
	}

	var NDA = NDA{DisclosingParty: args[1], DisclosingPartyLocation: args[2], ReceivingParty: args[3], ReceivingPartyLocation: args[4], Date: args[5], Regarding: args[6], AgreementSign: args[7]}
	ndaAsBytes, _ := json.Marshal(NDA)
	APIstub.PutState(args[0], ndaAsBytes)
	return shim.Success(nil)
}

func (s *SmartContract) getNDA(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	ndaAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(ndaAsBytes)
}

func (s *SmartContract) getAllNDA(APIstub shim.ChaincodeStubInterface) sc.Response {
	startKey := "NDA0"
	endKey := "NDA999"
	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	var buffer bytes.Buffer
	buffer.WriteString("[")
	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	fmt.Printf("- getAllNDA:\n")
	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) getNDATxs(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	if args[0] == "admin" {
		startKey := "NDA0"
		endKey := "NDA999"
		ndaResultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
		if err != nil {
			return shim.Error(err.Error())
		}
		var buffer bytes.Buffer
		buffer.WriteString("[")
		addComma := false
		i := 0
		for ndaResultsIterator.HasNext() {
			ndaResultsIterator.Next()
			ndaTxResultsIterator, err := APIstub.GetHistoryForKey("NDA" + strconv.Itoa(i))
			if err != nil {
				return shim.Error(err.Error())
			}
			bArrayMemberAlreadyWritten := false
			for ndaTxResultsIterator.HasNext() {
				response, err := ndaTxResultsIterator.Next()
				if err != nil {
					return shim.Error(err.Error())
				}
				if bArrayMemberAlreadyWritten == true {
					buffer.WriteString(",")
				}
				if addComma == true {
					buffer.WriteString(",")
				}
				addComma = false

				buffer.WriteString("{\"TxId\":")
				buffer.WriteString("\"")
				buffer.WriteString(response.TxId)
				buffer.WriteString("\"")

				buffer.WriteString(", \"Value\":")
				if response.IsDelete {
					buffer.WriteString("null")
				} else {
					buffer.WriteString(string(response.Value))
				}
				buffer.WriteString(", \"Timestamp\":")
				buffer.WriteString("\"")
				buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
				buffer.WriteString("\"")

				buffer.WriteString(", \"IsDelete\":")
				buffer.WriteString("\"")
				buffer.WriteString(strconv.FormatBool(response.IsDelete))
				buffer.WriteString("\"")

				buffer.WriteString("}")
				bArrayMemberAlreadyWritten = true
			}
			if bArrayMemberAlreadyWritten == true {
				addComma = true
			}
			i = i + 1
		}
		buffer.WriteString("]")
		return shim.Success(buffer.Bytes())
	} else {
		resultsIterator, err := APIstub.GetHistoryForKey(strings.ToUpper(args[0]))
		if err != nil {
			return shim.Error(err.Error())
		}
		defer resultsIterator.Close()
		var buffer bytes.Buffer
		buffer.WriteString("[")
		bArrayMemberAlreadyWritten := false
		for resultsIterator.HasNext() {
			response, err := resultsIterator.Next()
			if err != nil {
				return shim.Error(err.Error())
			}
			if bArrayMemberAlreadyWritten == true {
				buffer.WriteString(",")
			}
			buffer.WriteString("{\"TxId\":")
			buffer.WriteString("\"")
			buffer.WriteString(response.TxId)
			buffer.WriteString("\"")

			buffer.WriteString(", \"Value\":")
			if response.IsDelete {
				buffer.WriteString("null")
			} else {
				buffer.WriteString(string(response.Value))
			}
			buffer.WriteString(", \"Timestamp\":")
			buffer.WriteString("\"")
			buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
			buffer.WriteString("\"")

			buffer.WriteString(", \"IsDelete\":")
			buffer.WriteString("\"")
			buffer.WriteString(strconv.FormatBool(response.IsDelete))
			buffer.WriteString("\"")

			buffer.WriteString("}")
			bArrayMemberAlreadyWritten = true
		}
		buffer.WriteString("]")
		return shim.Success(buffer.Bytes())
	}
}

func main() {
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
