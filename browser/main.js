import {} from "./main.scss";
import {} from "photoswipe/dist/photoswipe.css";
import {} from "photoswipe/dist/default-skin/default-skin.css";

import PhotoSwipe from "photoswipe/dist/photoswipe.js";
import PhotoSwipeUI from "photoswipe/dist/photoswipe-ui-default.js";


function launchGallery(galleryIndex, imageIndex, rect) {
    var pswp = document.getElementById("pswp");
    var ui = "PhotoSwipeUI_Default";
    var items = Buckets[galleryIndex].Images.map(function(img,idx){
        var res = {
            src: img.Full.Filename,
            w: img.Full.Width,
            h: img.Full.Height,
            title: img.Name + "<br><small>" + img.Caption + "</small>",
            pid: idx,
        };
        if (idx === 0) {
            res.msrc = img.Thumbnail.Filename;
        } else if (idx < 5) {
            res.msrc = img.SmallThumbnail.Filename;
        }
        return res;
    });
    var opts = {
        index: imageIndex,
        galleryUID: galleryIndex,
        galleryPIDs: true,
        getThumbBoundsFn: getBounds.bind(null, galleryIndex),
    };
    var gallery = new PhotoSwipe(pswp, PhotoSwipeUI, items, opts);
    gallery.init();
}

function getBounds(galleryIndex, imageIndex) {
    var galleries = document.getElementsByClassName("gallery");
    if (galleryIndex >= galleries.length) return;
    var gallery = galleries[galleryIndex];
    var thumbs = gallery.getElementsByTagName("img");
    if (imageIndex >= thumbs.length) return;
    var el = thumbs[imageIndex];
    var pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
    var rect = el.getBoundingClientRect();
    return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
}

function click(galleryIndex, e) {
    e.preventDefault();
    e.stopPropagation();

    launchGallery(galleryIndex, +e.target.dataset.index);
}

function init() {
    var buckets = document.getElementsByClassName("gallery");
    for (var i=0; i<buckets.length; i++) {
        var b = buckets[i];
        b.addEventListener("click", click.bind(null, i));
    }
}


document.addEventListener("readystatechange", function(){
    if (document.readyState === "complete") init();
});
if (document.readyState === "complete") init();
