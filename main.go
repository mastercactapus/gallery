package main

import (
	"github.com/boltdb/bolt"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"net/http"
	"os"
)

var configDir = "config"

var db *bolt.DB

func initBuckets(tx *bolt.Tx) error {
	_, err := tx.CreateBucketIfNotExists([]byte("page"))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte("buckets"))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte("images"))
	if err != nil {
		return err
	}
	return nil
}
func main() {
	var err error
	db, err = bolt.Open("config.bolt", 0644, nil)
	if err != nil {
		panic(err)
	}
	err = db.Update(initBuckets)
	if err != nil {
		panic(err)
	}

	r := mux.NewRouter()
	r.Methods("POST").Path("/admin/upload/{bucket}").HandlerFunc(HttpUploadToBucket)
	r.Methods("POST").Path("/admin/buckets").HandlerFunc(HttpCreateBucket)
	r.Methods("GET").Path("/admin/buckets").HandlerFunc(HttpGetBuckets)
	http.ListenAndServe(":8000", handlers.LoggingHandler(os.Stdout, r))
}
