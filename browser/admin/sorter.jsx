import React from "react";
import _ from "lodash";
import ImageEditor from "./edit-image.jsx";


export default class Sorter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            images: props.Images || [],
            extDrag: 0,
            drag: 0,
            dragID: null
        };
        this.drag = 0;
        this.extDrag = 0;
        this._dragID = null;
        this._dragE = {};
    }

    dragID(v) {
        if (_.isUndefined(v)) {
            return this._dragID;
        } else {
            this._dragID = v;
            this.setState({
                dragID: v
            });
        }
    }

    dragDrop(e) {
        e.preventDefault();
        if (this.dragID() !== -1) return;
        var obj = JSON.parse(e.dataTransfer.getData("data"));
        var img = _.clone(this.state.images);
        if (_.any(img, {ID: obj.ID})) {
            this.dragID(null);
            this.setState({
                images: _.reject(img, {ID: -1})
            });
            return;
        }
        var idx = _.findIndex(img, {ID: -1});
        if (idx > -1) {
            img[idx] = obj;
        }
        this.dragID(null);
        this.setState({
            images: img
        });
    }
    dragStart(id, e) {
        this._originalOrder = _.clone(this.state.images);
        this.dragID(id);
        e.dataTransfer.setData("data", JSON.stringify(_.find(this.state.images, {ID: id})));
    }
    dragEnd(id, e) {
        this.dragID(null);
        this.setState({
            images: _.reject(this.state.images, {ID:-1})
        })
    }

    dragExternalEnter(e) {
        this.extDrag++;
        this.setState({extDrag: this.extDrag});
        if (this.extDrag > 1) return;

        if (this.dragID() > 0) {
            e.dataTransfer.effectAllowed = "move";
        } else {
            e.dataTransfer.effectAllowed = "copy";
            this.dragID(-1);
            if (!this._origImages) {
                this._origImages = this.state.images;
            }
            this.setState({
                images: this._origImages.concat({ID: -1})
            });
        }
    }

    dragExternalLeave(e) {
        this.extDrag--;
        this.setState({extDrag:this.extDrag});
        if (this.extDrag>0) return;
        if (this.dragID() > 0) {
            this.setState({
                images: this._originalOrder
            });
        } else {
            this.dragID(null);
            this.setState({
                images: this._origImages
            });
        }
    }

    dragEnter(id, e) {
        if (this.dragID() === id) return;
        var imgs = _.clone(this.state.images);
        var a = _.findIndex(imgs, {ID: this.dragID()});
        var b = _.findIndex(imgs, {ID: id});
        var drag = imgs[a];
        if (a > b) { // if after the el; then place before
            imgs = _.slice(imgs, 0, b).concat(drag, _.chain(imgs).slice(b).reject({ID: this.dragID()}).value());
        } else { // if before el, then place after
            imgs = _.chain(imgs).slice(0, b+1).reject({ID: this.dragID()}).value().concat(drag, _.slice(imgs, b+1));
        }

        this.setState({images: imgs});
    }


    render() {
        var images = _.map(this.state.images, (img,i)=>{
            var c = "box sortable" ;
            if (img.ID === this.state.dragID && this.state.extDrag>0) {
                c+=" dragging";
            }

            var editor = img.ID === -1 ? <div className="box bucketImage drag-copy"></div> : <ImageEditor ID={img.ID} src={img.Filename} />;

            return <div className={c}
                onDragEnd={this.dragEnd.bind(this, img.ID)}
                onDragStart={this.dragStart.bind(this, img.ID)}
                onDragEnter={this.dragEnter.bind(this, img.ID)}
                onDrop={this.dragDrop.bind(this)}
                key={img.ID} draggable="true">{editor}</div>
        });

        return <div data-top="true"
            onDragEnter={this.dragExternalEnter.bind(this)}
            onDragLeave={this.dragExternalLeave.bind(this)}
            onDragOver={e=>{e.preventDefault();}}
            onDrop={this.dragDrop.bind(this)}
            className="sorter row">
            {images}
        </div>
    }

}
