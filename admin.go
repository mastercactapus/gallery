package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/boltdb/bolt"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	log "github.com/sirupsen/logrus"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
)

var store *sessions.CookieStore

const adminSessionName = "admin-session"

func init() {
	k1 := make([]byte, 4096)
	k2 := make([]byte, 4096)
	_, err := io.ReadFull(rand.Reader, k1)
	if err != nil {
		panic(err)
	}
	_, err = io.ReadFull(rand.Reader, k2)
	if err != nil {
		panic(err)
	}

	store = sessions.NewCookieStore(k1, k2)
	store.Options.HttpOnly = true
	// store.Options.Secure = true
}

func HttpGetAdmin(w http.ResponseWriter, req *http.Request) {
	var state struct {
		Title    string
		ClientID string
	}
	state.Title = "Gallery Admin"
	state.ClientID = oauthClientID

	err := tmpl.ExecuteTemplate(w, "admin.html", &state)
	if err != nil {
		log.Errorln(err)
	}
}

func HttpLogout(w http.ResponseWriter, req *http.Request) {
	sess, _ := store.Get(req, adminSessionName)
	sess.Values["admin-access"] = false
	sess.Save(req, w)
	w.Header().Set("Location", "/admin")
	w.WriteHeader(302)
}

func HttpPostLogin(w http.ResponseWriter, req *http.Request) {
	l := log.WithFields(log.Fields{
		"Path":       req.RequestURI,
		"Method":     req.Method,
		"RemoteAddr": req.RemoteAddr,
	})
	var data struct {
		Token string
	}
	err := json.NewDecoder(req.Body).Decode(&data)
	if err != nil {
		l.Warnln(err)
		w.WriteHeader(400)
		return
	}
	resp, err := http.Get("https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=" + url.QueryEscape(data.Token))
	if err != nil {
		l.Warnln(err)
		w.WriteHeader(503)
		return
	}
	var token struct {
		Email string
		Aud   string
	}
	err = json.NewDecoder(resp.Body).Decode(&token)
	resp.Body.Close()
	if err != nil {
		l.Warnln(err)
		w.WriteHeader(500)
		return
	}

	if token.Aud != oauthClientID {
		l.Warnln("OAUTH_CLIENT_ID Mismatch")
		w.WriteHeader(400)
		return
	}

	var isAdminEmail bool
	for _, e := range adminEmails {
		if e != "" && e == token.Email {
			isAdminEmail = true
			break
		}
	}
	if !isAdminEmail {
		l.Warnln("logged in via google, but not admin")
		w.WriteHeader(401)
		return
	}

	sess, _ := store.Get(req, adminSessionName)
	sess.Values["admin-access"] = true
	sess.Values["email"] = token.Email
	sess.Save(req, w)
}

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
	os.MkdirAll("upload", 0755)
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

	json.NewEncoder(w).Encode(meta)
}

func HttpDeleteImage(w http.ResponseWriter, req *http.Request) {
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
	idStr := mux.Vars(req)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		bad(400, "invalid id", err)
		return
	}
	key := itob(int32(id))
	err = db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(imageBucket).DeleteBucket(key)
	})
	if err != nil {
		bad(500, "delete failed", err)
		return
	}
	w.WriteHeader(204)
}
func HttpUpdateImage(w http.ResponseWriter, req *http.Request) {
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
	idStr := mux.Vars(req)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		bad(400, "invalid id", err)
		return
	}
	meta := new(ImageMeta)
	err = json.NewDecoder(req.Body).Decode(meta)
	if err != nil {
		bad(400, "invalid json", err)
		return
	}
	if int32(id) != meta.ID {
		bad(400, "id mismatch", fmt.Errorf("expected id numbers to match"))
		return
	}
	err = db.Update(meta.Save)
	if err != nil {
		bad(500, "failed to save", err)
		return
	}
	w.WriteHeader(204)
}

func HttpUpdateBucket(w http.ResponseWriter, req *http.Request) {
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
	idStr := mux.Vars(req)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		bad(400, "invalid id", err)
		return
	}
	bucket := new(BucketConfig)
	err = json.NewDecoder(req.Body).Decode(bucket)
	if err != nil {
		bad(400, "invalid json", err)
		return
	}
	if int32(id) != bucket.ID {
		bad(400, "id mismatch", fmt.Errorf("expected id numbers to match"))
		return
	}
	err = db.Update(bucket.Save)
	if err != nil {
		bad(500, "failed to save", err)
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

func HttpUpdateBuckets(w http.ResponseWriter, req *http.Request) {
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
	var buckets []struct {
		ID int32
	}
	err := json.NewDecoder(req.Body).Decode(&buckets)
	if err != nil {
		bad(400, "invalid json", err)
		return
	}
	ids := make([]int32, len(buckets))
	for i, b := range buckets {
		if b.ID < 1 {
			bad(400, "invalid id", fmt.Errorf("invalid bucket id"))
			return
		}
		ids[i] = b.ID
	}
	err = db.Update(func(tx *bolt.Tx) error {
		bk := tx.Bucket(pageBucket)
		bb := &BBucket{bk}
		return bb.WriteInt32s("Buckets", ids)
	})
	if err != nil {
		bad(500, "failed to save to db", err)
		return
	}
	w.WriteHeader(204)
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

func HttpGetImage(w http.ResponseWriter, req *http.Request) {
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
	idStr := mux.Vars(req)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		bad(400, "invalid id", err)
		return
	}

	meta := new(ImageMeta)
	meta.ID = int32(id)
	err = db.View(meta.Load)
	if err != nil {
		bad(400, "could not load meta", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meta)
}

func HttpGetBucket(w http.ResponseWriter, req *http.Request) {
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

	bkt := new(BucketConfig)
	bkt.ID = int32(id)
	err = db.View(bkt.Load)
	if err != nil {
		bad(400, "failed to get bucket", err)
		return
	}

	err = json.NewEncoder(w).Encode(bkt)
	if err != nil {
		bad(500, "failed to encode json", err)
	}
}
