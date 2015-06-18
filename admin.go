package main

import (
	"encoding/json"
	"fmt"
	"github.com/boltdb/bolt"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	"io"
	"net/http"
	"os"
	"strconv"
)

func HttpUploadToBucket(w http.ResponseWriter, req *http.Request) {
	l := log.WithFields(log.Fields{
		"Path":       req.RequestURI,
		"Method":     req.Method,
		"RemoteAddr": req.RemoteAddr,
	})
	bad := func(status int, msg string, err error) {
		e := fmt.Sprintf("error: %s: %s", msg, err.Error())
		l.Errorln(e)
		io.WriteString(w, e)
		w.WriteHeader(status)
	}

	bucket := mux.Vars(req)["bucket"]
	id, err := strconv.Atoi(bucket)
	if err != nil {
		bad(400, "bucket not a number", err)
		return
	}
	img := new(ImageFile)
	img.ID, err = getID()
	if err != nil {
		bad(500, "couldn't get new id", err)
		return
	}
	img.Filename = "upload/" + strconv.Itoa(int(img.ID))
	fd, err := os.Create(img.Filename)
	if err != nil {
		bad(500, "couldn't create upload file", err)
		return
	}
	_, err = io.Copy(fd, req.Body)
	if err != nil {
		fd.Close()
		os.Remove(img.Filename)
		bad(500, "upload transfer failed", err)
		return
	}
	fd.Close()
	files, err := GenerateImages(img.Filename)
	if err != nil {
		os.Remove(img.Filename)
		bad(500, "generating images failed", err)
		return
	}
	meta := new(ImageMeta)
	meta.ID, err = getID()
	if err != nil {
		bad(500, "couldn't generate id for meta", err)
		return
	}
	meta.Original = *img
	meta.Full = files[0]
	meta.Large = files[1]
	meta.Medium = files[2]
	meta.Small = files[3]
	meta.Thumbnail = files[4]
	meta.SmallThumbnail = files[5]
	meta.Name = req.Header.Get("X-File-Name")
	err = db.Update(meta.Save)
	if err != nil {
		bad(500, "could not save imagemeta", err)
		return
	}

	err = db.Update(func(tx *bolt.Tx) error {
		err := img.Save(tx)
		if err != nil {
			return err
		}
		for i := range files {
			err = (&files[i]).Save(tx)
			if err != nil {
				return err
			}
		}
		bkt := new(BucketConfig)
		bkt.ID = int32(id)
		err = bkt.Load(tx)
		if err != nil {
			return err
		}
		if bkt.Images == nil {
			bkt.Images = []ImageMeta{}
		}
		bkt.Images = append(bkt.Images, *meta)
		return bkt.Save(tx)
	})

	if err != nil {
		bad(500, "updating database failed", err)
		return
	}

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
