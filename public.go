package main

import (
	log "github.com/sirupsen/logrus"
	"html/template"
	"io"
	"net/http"
)

var tmpl = template.Must(template.ParseGlob("public/*.html"))

func RenderContext() (*PageConfig, error) {
	p := new(PageConfig)
	err := db.View(p.Load)

	//filter by enabled
	bk := make([]BucketConfig, 0, len(p.Buckets))
	for _, b := range p.Buckets {
		if b.Enabled {
			img := make([]ImageMeta, 0, len(b.Images))
			for _, i := range b.Images {
				if i.Enabled {
					img = append(img, i)
				}
			}
			b.Images = img
			bk = append(bk, b)
		}
	}
	p.Buckets = bk

	return p, err
}

func HttpGetGallery(w http.ResponseWriter, req *http.Request) {
	r, err := RenderContext()
	if err != nil {
		w.WriteHeader(500)
		io.WriteString(w, err.Error())
		log.Errorln(err)
		return
	}
	err = tmpl.ExecuteTemplate(w, "index.html", r)
	if err != nil {
		log.Errorln(err)
	}
}
