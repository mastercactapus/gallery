package main

import (
	"github.com/boltdb/bolt"
	"regexp"
	"strings"
)

var pageBucket = []byte("page")
var bucketsBucket = []byte("buckets")
var imagesBucket = []byte("images")

type PageConfig struct {
	Title   string
	Buckets []string
}

type BucketConfig struct {
	Name            string
	ID              string
	Enabled         bool
	Caption         string
	ThumbnailID     string
	SmallThumbnails []string
}

type BucketImage struct {
	Name     string
	BucketID string
	ID       string
	Caption  string
	Enabled  bool
	Full     string
	Large    string
	Medium   string
	Small    string
}

func MakeNewBucket(name string) (*BucketConfig, error) {
	b := new(BucketConfig)
	b.SmallThumbnails = []string{}
	b.Name = name
	b.ID = strings.ToLower(regexp.MustCompile("(?i)[^a-z0-9]").ReplaceAllString(name, "_"))
	err := db.Update(func(tx *bolt.Tx) error {
		err := b.Save(tx)
		if err != nil {
			return err
		}
		cfg := new(PageConfig)
		err = cfg.Load(tx)
		if err != nil {
			return err
		}
		cfg.Buckets = append(cfg.Buckets, b.ID)
		err = cfg.Save(tx)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (b *BucketConfig) Save(tx *bolt.Tx) error {
	bk, err := tx.Bucket([]byte("buckets")).CreateBucketIfNotExists([]byte(b.ID))
	if err != nil {
		return err
	}
	err = bk.Put([]byte("Caption"), []byte(b.Caption))
	if err != nil {
		return err
	}
	var enabled []byte
	if b.Enabled {
		enabled = []byte{1}
	} else {
		enabled = []byte{0}
	}
	err = bk.Put([]byte("Enabled"), enabled)
	if err != nil {
		return err
	}
	err = bk.Put([]byte("ID"), []byte(b.ID))
	if err != nil {
		return err
	}
	err = bk.Put([]byte("Name"), []byte(b.Name))
	if err != nil {
		return err
	}
	err = bk.Put([]byte("SmallThumbnails"), []byte(strings.Join(b.SmallThumbnails, "\n")))
	if err != nil {
		return err
	}
	err = bk.Put([]byte("ThumbnailID"), []byte(b.ThumbnailID))
	if err != nil {
		return err
	}

	return nil
}

func (b *BucketConfig) Load(tx *bolt.Tx) error {
	bk := tx.Bucket([]byte("buckets")).Bucket([]byte(b.ID))
	if bk == nil {
		*b = BucketConfig{ID: b.ID}
		b.SmallThumbnails = []string{}
		return nil
	}
	b.Name = string(bk.Get([]byte("Name")))
	b.ID = string(bk.Get([]byte("ID")))
	en := bk.Get([]byte("Enabled"))
	b.Enabled = len(en) == 1 && en[0] == 1
	b.Caption = string(bk.Get([]byte("Caption")))
	b.ThumbnailID = string(bk.Get([]byte("ThumbnailID")))
	b.SmallThumbnails = strings.Split(string(bk.Get([]byte("SmallThumbnails"))), "\n")
	return nil
}

func (p *PageConfig) Load(tx *bolt.Tx) error {
	bk := tx.Bucket([]byte("page"))
	p.Title = string(bk.Get([]byte("Title")))
	buckets := string(bk.Get([]byte("Buckets")))
	if len(buckets) == 0 {
		p.Buckets = []string{}
	} else {
		p.Buckets = strings.Split(buckets, "\n")
	}
	return nil
}
func (p *PageConfig) Save(tx *bolt.Tx) error {
	bk := tx.Bucket([]byte("page"))
	buckets := strings.Join(p.Buckets, "\n")
	err := bk.Put([]byte("Buckets"), []byte(buckets))
	if err != nil {
		return err
	}
	err = bk.Put([]byte("Title"), []byte(p.Title))
	if err != nil {
		return err
	}
	return nil
}

func GetPageConfig() (*PageConfig, error) {
	cfg := new(PageConfig)
	err := db.View(cfg.Load)
	return cfg, err
}

func GetBuckets() ([]BucketConfig, error) {
	cfg, err := GetPageConfig()
	if err != nil {
		return nil, err
	}
	var cfgs []BucketConfig
	err = db.View(func(tx *bolt.Tx) error {
		cfgs = make([]BucketConfig, 0, len(cfg.Buckets))
		for _, id := range cfg.Buckets {
			bkt := new(BucketConfig)
			bkt.ID = id
			err = bkt.Load(tx)
			if err != nil {
				return err
			}
			cfgs = append(cfgs, *bkt)
		}
		return nil
	})
	return cfgs, nil
}
