package main

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"net/http"
)

func HttpUploadToBucket(w http.ResponseWriter, req *http.Request) {
	io.Copy(ioutil.Discard, req.Body)
	w.WriteHeader(204)
}

func HttpCreateBucket(w http.ResponseWriter, req *http.Request) {
	b, err := MakeNewBucket(req.URL.Query().Get("name"))
	if err != nil {
		io.WriteString(w, err.Error())
		w.WriteHeader(400)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(&b)
}

func HttpGetBuckets(w http.ResponseWriter, req *http.Request) {
	b, err := GetBuckets()
	if err != nil {
		io.WriteString(w, err.Error())
		w.WriteHeader(500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(&b)
}
