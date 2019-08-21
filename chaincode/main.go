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

type Party struct {
	Name     string `json:"name"`
	CEO      string `json:"ceo"`
	Location string `json:"location"`
	UserName string `json:"username"`
	Password string `json:"password"`
	Type     string `json:"type"`
}

type NDA struct {
	DisclosingParty         string `json:"disclosingparty"`
	DisclosingPartyLocation string `json:"disclosingpartylocation"`
	ReceivingParty          string `json:"receivingparty"`
	ReceivingPartyLocation  string `json:"receivingpartylocation"`
	Date                    string `json:"date"`
	Regarding               string `json:"regarding"`
	AgreementSign           string `json:"agreementsign"`
	Status                  string `json:"status"`
}

func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	function, args := APIstub.GetFunctionAndParameters()

	if function == "initParties" {
		return s.initParties(APIstub)
	} else if function == "loginParty" {
		return s.loginParty(APIstub, args)
	} else if function == "queryParty" {
		return s.queryParty(APIstub, args)
	} else if function == "createParty" {
		return s.createParty(APIstub, args)
	} else if function == "queryAllParties" {
		return s.queryAllParties(APIstub)
	} else if function == "changePartyCEO" {
		return s.changePartyCEO(APIstub, args)
	} else if function == "initNDA" {
		return s.initNDA(APIstub, args)
	} else if function == "submitNDA" {
		return s.submitNDA(APIstub, args)
	} else if function == "getNDA" {
		return s.getNDA(APIstub, args)
	} else if function == "getAllNDA" {
		return s.getAllNDA(APIstub)
	} else if function == "getNDATxs" {
		return s.getNDATxs(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) initParties(APIstub shim.ChaincodeStubInterface) sc.Response {
	partys := []Party{
		Party{Name: "Blockmatrix", CEO: "Praveen", Location: "Hyderabad", UserName: "blockmatrix", Password: "password", Type: "admin"},
		Party{Name: "ABC", CEO: "XYZ", Location: "Delhi", UserName: "abc", Password: "password", Type: "user"},
	}
	i := 0
	for i < len(partys) {
		partysAsBytes, _ := json.Marshal(partys[i])
		APIstub.PutState("PARTY"+strconv.Itoa(i), partysAsBytes)
		fmt.Printf("\n%s - Party Added\n", partys[i].Name)
		i = i + 1
	}
	return shim.Success(nil)
}

func (s *SmartContract) loginParty(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	startKey := "PARTY0"
	endKey := "PARTY999"
	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	var buffer bytes.Buffer
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		party := Party{}
		json.Unmarshal(queryResponse.Value, &party)
		if party.UserName == args[0] {
			if party.Password != args[1] {
				buffer.WriteString("Invalid password.")
				return shim.Success(buffer.Bytes())
			} else {
				buffer.WriteString("{\"Key\":")
				buffer.WriteString("\"")
				buffer.WriteString(queryResponse.Key)
				buffer.WriteString("\"")

				buffer.WriteString(", \"Record\":")
				buffer.WriteString(string(queryResponse.Value))
				buffer.WriteString("}")
				return shim.Success(buffer.Bytes())
			}
		}
	}
	buffer.WriteString("Invalid credentials.")
	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) queryParty(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	partysAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(partysAsBytes)
}

func (s *SmartContract) createParty(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 7 {
		return shim.Error("Incorrect number of arguments. Expecting 7")
	}
	var party = Party{Name: args[1], CEO: args[2], Location: args[3], UserName: args[4], Password: args[5], Type: args[6]}
	partysAsBytes, _ := json.Marshal(party)
	APIstub.PutState(args[0], partysAsBytes)
	return shim.Success(nil)
}

func (s *SmartContract) queryAllParties(APIstub shim.ChaincodeStubInterface) sc.Response {
	startKey := "PARTY0"
	endKey := "PARTY999"
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
	fmt.Printf("- queryAllParties:\n%s\n", buffer.String())
	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) changePartyCEO(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	partysAsBytes, _ := APIstub.GetState(args[0])
	party := Party{}
	json.Unmarshal(partysAsBytes, &party)
	party.CEO = args[1]
	partysAsBytes, _ = json.Marshal(party)
	APIstub.PutState(args[0], partysAsBytes)
	return shim.Success(nil)
}

func (s *SmartContract) initNDA(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 7 {
		return shim.Error("Incorrect number of arguments. Expecting 7")
	}
	startKey := "PARTY0"
	endKey := "PARTY999"
	count := 0
	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	for resultsIterator.HasNext() {
		queryResponse, _ := resultsIterator.Next()
		fmt.Println("Party:", queryResponse)
		count++
	}
	key := "PARTY" + strconv.Itoa(count)
	// Insert Party
	var newParty = Party{Name: args[0], CEO: args[1], Location: args[2], UserName: args[3], Password: args[4], Type: "user"}
	newPartysAsBytes, err := json.Marshal(newParty)
	if err != nil {
		return shim.Error(err.Error())
	}
	APIstub.PutState(key, newPartysAsBytes)
	// Insert NDA
	adminPartysAsBytes, err := APIstub.GetState("PARTY0")
	if err != nil {
		return shim.Error(err.Error())
	}
	adminParty := Party{}
	json.Unmarshal(adminPartysAsBytes, &adminParty)
	var NDA = NDA{DisclosingParty: newParty.Name, DisclosingPartyLocation: newParty.Location, ReceivingParty: adminParty.Name, ReceivingPartyLocation: adminParty.Location, Date: args[5], Regarding: args[6], AgreementSign: "", Status: "Pending"}
	ndaAsBytes, _ := json.Marshal(NDA)
	APIstub.PutState(strings.ToUpper(newParty.Name), ndaAsBytes)
	return shim.Success(nil)
}

func (s *SmartContract) submitNDA(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 8 {
		return shim.Error("Incorrect number of arguments. Expecting 8")
	}
	startKey := "PARTY0"
	endKey := "PARTY999"
	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	disclosingCheck := false
	receivingCheck := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		party := Party{}
		json.Unmarshal(queryResponse.Value, &party)
		if party.Name == args[1] {
			disclosingCheck = true
		}
		if party.Name == args[3] {
			receivingCheck = true
		}
	}
	var buffer bytes.Buffer
	if !disclosingCheck {
		buffer.WriteString("Disclosing Party does not exists.")
		return shim.Success(buffer.Bytes())
	}
	if !receivingCheck {
		buffer.WriteString("Receiving Party does not exists.")
		return shim.Success(buffer.Bytes())
	}
	var NDA = NDA{DisclosingParty: args[1], DisclosingPartyLocation: args[2], ReceivingParty: args[3], ReceivingPartyLocation: args[4], Date: args[5], Regarding: args[6], AgreementSign: args[7], Status: "Agreed"}
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
	fmt.Printf("- getAllNDA:\n%s\n", buffer.String())
	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) getNDATxs(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	partysAsBytes, _ := APIstub.GetState(args[0])
	party := Party{}
	json.Unmarshal(partysAsBytes, &party)

	if party.Type == "admin" {
		startKey := "PARTY0"
		endKey := "PARTY999"
		partyResultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
		if err != nil {
			return shim.Error(err.Error())
		}
		var buffer bytes.Buffer
		buffer.WriteString("[")
		addComma := false
		for partyResultsIterator.HasNext() {
			queryResponse, err := partyResultsIterator.Next()
			if err != nil {
				return shim.Error(err.Error())
			}
			party := Party{}
			json.Unmarshal(queryResponse.Value, &party)
			ndaResultsIterator, err := APIstub.GetHistoryForKey(strings.ToUpper(party.Name))
			if err != nil {
				return shim.Error(err.Error())
			}
			bArrayMemberAlreadyWritten := false
			for ndaResultsIterator.HasNext() {
				response, err := ndaResultsIterator.Next()
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
		}

		buffer.WriteString("]")
		fmt.Printf("- getNDATxs:\n%s\n", buffer.String())
		return shim.Success(buffer.Bytes())

	} else {
		resultsIterator, err := APIstub.GetHistoryForKey(strings.ToUpper(party.Name))
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
		fmt.Printf("- getNDATxs:\n%s\n", buffer.String())
		return shim.Success(buffer.Bytes())
	}
}

func main() {
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
