package main

import (
	"encoding/binary"
	"fmt"
	"github.com/boltdb/bolt"
	log "github.com/sirupsen/logrus"
	"regexp"
)

var pageBucket = []byte("page")
var bucketBucket = []byte("buckets")
var imageBucket = []byte("images")
var imageFileBucket = []byte("image_files")
var dirNameRx = regexp.MustCompile("(?i)[^a-z0-9]")

type PageConfig struct {
	Title   string
	Buckets []BucketConfig
}

//add creator
//and/or copywrite holder stuff
//https://dev.twitter.com/cards/types/gallery
type BucketConfig struct {
	ID              int32
	Name            string
	Enabled         bool
	Caption         string
	Thumbnail       ImageMeta
	Images          []ImageMeta
	SmallThumbnails []ImageMeta
}

type ImageMeta struct {
	ID             int32
	Name           string
	Caption        string
	Enabled        bool
	Original       ImageFile
	Full           ImageFile
	Large          ImageFile
	Medium         ImageFile
	Small          ImageFile
	Thumbnail      ImageFile
	SmallThumbnail ImageFile
}
type ImageFile struct {
	ID       int32
	Filename string
	Width    int32
	Height   int32
}

type BBucket struct {
	*bolt.Bucket
}

func itob(val int32) []byte {
	buf := make([]byte, 4)
	binary.LittleEndian.PutUint32(buf, uint32(val))
	return buf
}
func istob(val []int32) []byte {
	buf := make([]byte, 4*len(val))
	for i, v := range val {
		binary.LittleEndian.PutUint32(buf[i*4:], uint32(v))
	}
	return buf
}
func btoi(val []byte) int32 {
	return int32(binary.LittleEndian.Uint32(val))
}
func btois(val []byte) []int32 {
	res := make([]int32, len(val)/4)
	for i := range res {
		res[i] = int32(binary.LittleEndian.Uint32(val[i*4:]))
	}
	return res
}

func bltob(val bool) []byte {
	if val {
		return []byte{1}
	} else {
		return []byte{0}
	}
}
func btobl(v []byte) bool {
	return len(v) == 1 && v[0] == 1
}

func (bk *BBucket) WriteString(key string, value string) error {
	return bk.Put([]byte(key), []byte(value))
}
func (bk *BBucket) WriteInt32(key string, value int32) error {
	return bk.Put([]byte(key), itob(value))
}
func (bk *BBucket) WriteInt32s(key string, value []int32) error {
	return bk.Put([]byte(key), istob(value))
}
func (bk *BBucket) WriteBool(key string, value bool) error {
	if value {
		return bk.Put([]byte(key), []byte{1})
	} else {
		return bk.Put([]byte(key), []byte{0})
	}
}
func (bk *BBucket) ReadString(key string) string {
	return string(bk.Get([]byte(key)))
}
func (bk *BBucket) ReadInt32(key string) int32 {
	return btoi(bk.Get([]byte(key)))
}
func (bk *BBucket) ReadBool(key string) bool {
	v := bk.Get([]byte(key))
	return len(v) == 1 && v[0] == 1
}

func (p *PageConfig) Save(tx *bolt.Tx) error {
	bk := tx.Bucket(pageBucket)
	bb := &BBucket{bk}
	bb.WriteString("Title", p.Title)
	bucketIDs := make([]int32, len(p.Buckets))
	for i, bkt := range p.Buckets {
		bucketIDs[i] = bkt.ID
	}
	bb.WriteInt32s("Buckets", bucketIDs)
	return nil
}
func (p *PageConfig) Load(tx *bolt.Tx) error {
	c := tx.Bucket(pageBucket).Cursor()
	var err error
	for key, val := c.First(); key != nil; key, val = c.Next() {
		switch string(key) {
		case "Title":
			p.Title = string(val)
		case "Buckets":
			bktIDs := btois(val)
			p.Buckets = make([]BucketConfig, 0, len(bktIDs))
			for i, id := range bktIDs {
				var bkt BucketConfig
				bkt.ID = id
				err = (&bkt).Load(tx)
				if err != nil {
					log.WithFields(log.Fields{"BucketID": id, "Bucket#": i}).Errorln("failed to load bucket config:", err)
					continue
				}
				p.Buckets = append(p.Buckets, bkt)
			}
		}
	}
	return nil
}

func (b *BucketConfig) Save(tx *bolt.Tx) error {
	bk, err := tx.Bucket(bucketBucket).CreateBucketIfNotExists(itob(b.ID))
	if err != nil {
		return err
	}
	bb := &BBucket{bk}
	bb.WriteInt32("ID", b.ID)
	bb.WriteString("Name", b.Name)
	bb.WriteBool("Enabled", b.Enabled)
	bb.WriteString("Caption", b.Caption)
	if b.Thumbnail.ID > 0 {
		bb.WriteInt32("Thumbnail", b.Thumbnail.ID)
	}
	imageIds := make([]int32, len(b.Images))
	for i, img := range b.Images {
		imageIds[i] = img.ID
	}
	bb.WriteInt32s("Images", imageIds)
	stIDs := make([]int32, len(b.SmallThumbnails))
	for i, img := range b.SmallThumbnails {
		stIDs[i] = img.ID
	}
	bb.WriteInt32s("SmallThumbnails", stIDs)
	return nil
}

func (b *BucketConfig) Load(tx *bolt.Tx) error {
	if b.ID == 0 {
		return fmt.Errorf("Tried to get bucket with id of 0")
	}
	bk := tx.Bucket(bucketBucket).Bucket(itob(b.ID))
	if bk == nil {
		return fmt.Errorf("could not find bucket config #%d", b.ID)
	}

	l := log.WithField("BucketID", b.ID)
	c := bk.Cursor()
	var err error
	for key, val := c.First(); key != nil; key, val = c.Next() {
		switch string(key) {
		case "ID":
			b.ID = btoi(val)
		case "Name":
			b.Name = string(val)
			l = l.WithField("Name", b.Name)
		case "Enabled":
			b.Enabled = btobl(val)
		case "Caption":
			b.Caption = string(val)
		case "Thumbnail":
			b.Thumbnail.ID = btoi(val)
			err = (&b.Thumbnail).Load(tx)
			if err != nil {
				l.WithField("ThumbnailID", b.Thumbnail.ID).Errorln("failed to load thumbnail:", err)
				continue
			}
		case "Images":
			imgIDs := btois(val)
			b.Images = make([]ImageMeta, 0, len(imgIDs))
			for i, id := range imgIDs {
				meta := ImageMeta{ID: id}
				err = (&meta).Load(tx)
				if err != nil {
					l.WithField("ImageID", id).WithField("Image#", i).Errorln("failed to load image:", err)
					continue
				}
				b.Images = append(b.Images, meta)
			}
		case "SmallThumbnails":
			imgIDs := btois(val)
			b.SmallThumbnails = make([]ImageMeta, 0, len(imgIDs))
			for i, id := range imgIDs {
				st := ImageMeta{ID: id}
				err = (&st).Load(tx)
				if err != nil {
					l.WithFields(log.Fields{"SmThumbnail#": i, "SmThumbnailID": id}).Errorln("failed to load small thumbnail:", err)
					continue
				}
				b.SmallThumbnails = append(b.SmallThumbnails, st)
			}
		}
	}
	return nil
}

func (i *ImageMeta) Save(tx *bolt.Tx) error {
	bk, err := tx.Bucket(imageBucket).CreateBucketIfNotExists(itob(i.ID))
	if err != nil {
		return err
	}
	b := &BBucket{bk}
	b.WriteInt32("ID", i.ID)
	b.WriteString("Name", i.Name)
	b.WriteString("Caption", i.Caption)
	b.WriteBool("Enabled", i.Enabled)
	b.WriteInt32("Original", i.Original.ID)
	b.WriteInt32("Full", i.Full.ID)
	b.WriteInt32("Large", i.Large.ID)
	b.WriteInt32("Medium", i.Medium.ID)
	b.WriteInt32("Small", i.Small.ID)
	b.WriteInt32("Thumbnail", i.Thumbnail.ID)
	b.WriteInt32("SmallThumbnail", i.SmallThumbnail.ID)
	return nil
}
func (i *ImageMeta) Load(tx *bolt.Tx) error {
	if i.ID == 0 {
		return nil
	}
	bk := tx.Bucket(imageBucket).Bucket(itob(i.ID))
	if bk == nil {
		return fmt.Errorf("could not find image meta #%d", i.ID)
	}
	c := bk.Cursor()
	var err error
	for key, val := c.First(); key != nil; key, val = c.Next() {
		switch string(key) {
		case "ID":
			i.ID = btoi(val)
		case "Name":
			i.Name = string(val)
		case "Caption":
			i.Caption = string(val)
		case "Enabled":
			i.Enabled = btobl(val)
		case "Original":
			i.Original.ID = btoi(val)
			err = (&i.Original).Load(tx)
		case "Full":
			i.Full.ID = btoi(val)
			err = (&i.Full).Load(tx)
		case "Large":
			i.Large.ID = btoi(val)
			err = (&i.Large).Load(tx)
		case "Medium":
			i.Medium.ID = btoi(val)
			err = (&i.Medium).Load(tx)
		case "Small":
			i.Small.ID = btoi(val)
			err = (&i.Small).Load(tx)
		case "Thumbnail":
			i.Thumbnail.ID = btoi(val)
			err = (&i.Thumbnail).Load(tx)
		case "SmallThumbnail":
			i.SmallThumbnail.ID = btoi(val)
			err = (&i.SmallThumbnail).Load(tx)
		}
		if err != nil {
			log.WithFields(log.Fields{
				"Attribute":   string(key),
				"ImageMetaID": i.ID,
			}).Errorln("failed to load image:", err)
			continue
		}
	}
	return nil
}

func (i *ImageFile) Save(tx *bolt.Tx) error {
	bk, err := tx.Bucket(imageFileBucket).CreateBucketIfNotExists(itob(i.ID))
	if err != nil {
		return err
	}
	b := &BBucket{bk}
	b.WriteInt32("ID", i.ID)
	b.WriteInt32("Height", i.Height)
	b.WriteInt32("Width", i.Width)
	b.WriteString("Filename", i.Filename)
	return nil
}
func (i *ImageFile) Load(tx *bolt.Tx) error {
	if i.ID == 0 {
		return nil
	}
	bk := tx.Bucket(imageFileBucket).Bucket(itob(i.ID))
	if bk == nil {
		return fmt.Errorf("could not find image file bucket #%d", i.ID)
	}
	c := bk.Cursor()
	for key, val := c.First(); key != nil; key, val = c.Next() {
		switch string(key) {
		case "ID":
			i.ID = btoi(val)
		case "Height":
			i.Height = btoi(val)
		case "Width":
			i.Width = btoi(val)
		case "Filename":
			i.Filename = string(val)
		}
	}
	return nil
}

func GetBuckets() ([]BucketConfig, error) {
	cfg := new(PageConfig)
	err := db.View(cfg.Load)
	if err != nil {
		return nil, err
	}
	return cfg.Buckets, nil
}

func MakeNewBucket(name string) (*BucketConfig, error) {
	bkt := new(BucketConfig)
	bkt.Name = name
	bkt.SmallThumbnails = []ImageMeta{}
	bkt.Images = []ImageMeta{}
	err := db.Update(func(tx *bolt.Tx) error {
		bkt.ID = getIDTx(tx)
		bk := tx.Bucket([]byte("page"))
		pageBuckets := bk.Get([]byte("Buckets"))
		newBuckets := make([]byte, len(pageBuckets)+4)
		copy(newBuckets, pageBuckets)
		copy(newBuckets[len(pageBuckets):], itob(bkt.ID))
		err := bkt.Save(tx)
		if err != nil {
			return err
		}
		bk.Put([]byte("Buckets"), newBuckets)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return bkt, nil
}
