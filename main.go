package main

import (
	"github.com/boltdb/bolt"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"net/http"
	"os"
	"strings"
)

var configDir = "config"

var db *bolt.DB

var adminEmails []string
var oauthClientID string

func init() {
	oauthClientID = os.Getenv("OAUTH_CLIENT_ID")
	adminEmails = strings.Split(os.Getenv("ADMIN_EMAIL"), " ")
}

func getID() (int32, error) {
	var id int32
	err := db.Update(func(tx *bolt.Tx) error {
		id = getIDTx(tx)
		return nil
	})
	return id, err
}
func getIDTx(tx *bolt.Tx) int32 {
	var id int32
	bk := tx.Bucket([]byte("core"))
	dat := bk.Get([]byte("idx"))
	if len(dat) > 0 {
		id = btoi(dat)
	}
	if id < 10000 {
		id = 10000
	}
	bk.Put([]byte("idx"), itob(id+1))
	return id
}

func initBuckets(tx *bolt.Tx) error {
	_, err := tx.CreateBucketIfNotExists([]byte("core"))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte(pageBucket))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte(bucketBucket))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte(imageBucket))
	if err != nil {
		return err
	}
	_, err = tx.CreateBucketIfNotExists([]byte(imageFileBucket))
	if err != nil {
		return err
	}
	return nil
}

func main() {
	_ = "breakpoint"
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

	r.Methods("GET").Path("/admin").HandlerFunc(HttpGetAdmin)
	r.Methods("GET").Path("/admin/logout").HandlerFunc(HttpLogout)
	r.Methods("POST").Path("/admin/login").HandlerFunc(HttpPostLogin)

	authed := mux.NewRouter()
	authed.Methods("POST").Path("/admin/upload/{bucket}").HandlerFunc(HttpUploadToBucket)
	authed.Methods("POST").Path("/admin/buckets").HandlerFunc(HttpCreateBucket)
	authed.Methods("GET").Path("/admin/buckets").HandlerFunc(HttpGetBuckets)
	authed.Methods("PATCH").Path("/admin/buckets").HandlerFunc(HttpUpdateBuckets)
	authed.Methods("GET").Path("/admin/buckets/{bucket}").HandlerFunc(HttpGetBucket)
	authed.Methods("PUT").Path("/admin/buckets/{id}").HandlerFunc(HttpUpdateBucket)
	authed.Methods("GET").Path("/admin/images/{id}").HandlerFunc(HttpGetImage)
	authed.Methods("DELETE").Path("/admin/images/{id}").HandlerFunc(HttpDeleteImage)
	authed.Methods("PUT").Path("/admin/images/{id}").HandlerFunc(HttpUpdateImage)
	r.PathPrefix("/admin").HandlerFunc((&nextHandler{Handler: authed}).HttpMustAuth)

	r.Methods("GET").Path("/").HandlerFunc(HttpGetGallery)

	updir := http.FileServer(http.Dir("upload"))
	r.Methods("GET").PathPrefix("/upload").Handler(http.StripPrefix("/upload/", updir))
	http.ListenAndServe(":8000", handlers.LoggingHandler(os.Stdout, r))
}
