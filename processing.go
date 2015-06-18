package main

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"os/exec"
	"strings"
)

var ImgSizes = []string{"3840x2160", "1920x1080", "1280x720", "854x480", "240x240", "171x114"}
var ImgSuffixes = []string{"full", "large", "medium", "small", "thumb", "smthumb"}

func GenerateImages(file string) ([6]ImageFile, error) {
	var err error
	var files [6]ImageFile

	for i := range files {
		err = (&files[i]).GenerateImage(file, ImgSizes[i], ImgSuffixes[i])
		if err != nil {
			return files, err
		}
	}

	return files, nil
}

func (i *ImageFile) GenerateImage(file, dem, suffix string) error {
	var err error
	if i.ID == 0 {
		i.ID, err = getID()
		if err != nil {
			return err
		}
	}
	var op string
	if strings.Contains(suffix, "thumb") {
		op = "-thumbnail"
	} else {
		op = "-resize"
	}
	i.Filename = file + "." + suffix + ".jpg"
	data, err := exec.Command("convert", op, dem+">", file, i.Filename).CombinedOutput()
	if err != nil {
		return fmt.Errorf("generate image exec error: %s: %s", err.Error(), string(data))
	}
	fd, err := os.Open(file)
	if err != nil {
		return fmt.Errorf("generate image open error: %s", err.Error())
	}
	img, _, err := image.DecodeConfig(fd)
	fd.Close()
	if err != nil {
		return fmt.Errorf("generate image decode error: %s", err.Error())
	}
	i.Width = int32(img.Width)
	i.Height = int32(img.Height)
	return nil
}
