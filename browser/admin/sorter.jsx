import React from "react";
import _ from "lodash";
import ImageEditor from "./edit-image.jsx";
import Bluebird from "bluebird";
import request from "browser-request";
Bluebird.promisifyAll(request);

import ReactCSSTransitionGroup from "react/lib/ReactCSSTransitionGroup";

export default class Sorter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            images: props.Images || [],
            dragging: false,
            draggingID: null,
            draggingIdx: -1,
            hovering: false,
            hoverID: null,
            hoverIdx: -1,
        };

        this.dragNum = 0;
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (this.state.images.length !== nextState.images.length) return true;
        var imgMatch = _.all(this.state.images, (img, i)=>{
            return img.ID === nextState.images[i].ID;
        });
        if (!imgMatch) return true;
        var cmp = (prop)=>{
            return this.state[prop] === nextState[prop];
        }

        var props = ["dragging", "draggingID", "draggingIdx", "hovering", "hoverID", "hoverIdx"];
        return !_.all(props, cmp);
    }

    dragStart(id, i, img, e) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("data/bucketImage", JSON.stringify(img));
        this.setState({
            dragging: true,
            draggingID: id,
            draggingIdx: i,
        });
    }
    dragEnd(id, i, e) {
        this.setState({
            dragging: false,
            draggingID: null,
            draggingIdx: -1,
        });
    }
    dragEnter(id, i, e) {
        e.stopPropagation();
        e.preventDefault();
        this.lastEnter = e.target;
        this.setState({
            hovering: true,
            hoverID: id,
            hoverIdx: i,
        });
    }

    dragExternalEnter(e) {
        e.stopPropagation();
        e.preventDefault();
        this.lastEnter = e.target;
        this.setState({
            hovering: true,
        });
    }

    dragExternalLeave(e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.target !== this.lastEnter) return;
        this.setState({
            hovering: false,
            hoverID: null,
            hoverIdx: -1,
        });
    }

    dragDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        var imgs = _.pluck(this.state.images, "ID");
        var lookup = _.indexBy(this.state.images, "ID");
        if (this.state.dragging) {
            imgs.splice(this.state.draggingIdx, 1);
            imgs.splice(this.state.hoverIdx, 0, this.state.draggingID);
        } else {
            var data = e.dataTransfer.getData("data/bucketImage");
            if (!!data) {
                var obj = JSON.parse(data);
                if (_.isObject(obj) && !_.contains(imgs, obj.ID)) {
                    lookup[obj.ID] = obj;
                    if (this.state.hoverIdx !== -1) { // insert mode
                        imgs.splice(this.state.hoverIdx, 0, obj.ID);
                    } else { // append mode
                        imgs.push(obj.ID);
                    }
                }
            }
        }
        var newImages = _.map(imgs, (id)=>{return lookup[id];});
        this.setState({
            images: newImages,
            hovering: false,
            dragging: false,
            hoverID: null,
            hoverIdx: -1,
            draggingID: null,
            draggingIdx: -1,
        });
        this.props.UpdateItems(newImages);
    }

    removeImage(id) {
        var newImages = _.reject(this.state.images, {ID: id});
        this.setState({
            images: newImages
        });
        this.props.UpdateItems(newImages);
    }

    render() {
        var imgDatas = _.indexBy(this.state.images,"ID");
        var imgs = _.pluck(this.state.images, "ID");
        if (this.state.hovering && this.state.dragging) { //reorder mode
            if (this.state.hoverIdx !== -1 && this.state.hoverIdx !== this.state.draggingIdx) { //non zero
                imgs.splice(this.state.draggingIdx, 1);
                imgs.splice(this.state.hoverIdx, 0, this.state.draggingID);
            }
        } else if (this.state.hovering && this.state.hoverIdx !== -1) { // insert mode
            imgs.splice(this.state.hoverIdx, 0, 0);
        } else if (this.state.hovering) { // append mode
            imgs.push(0);
        }

        var mapImg = (img,i)=>{
            var c = "box sortable" ;
            if (img===0 || (img === this.state.draggingID && this.state.hovering)) {
                c+=" dragging";
            }
            var editor;
            var copyStyle = {
                borderColor: "black",
                borderStyle: "solid",
                borderWidth: 1,
            };
            if (!this.props.Edit) {
                var boxStyle = {
                    height: "114px",
                    width: "171px",
                    margin: "4px",
                    backgroundColor: "#ccc",
                }
                var imgStyle = {
                    height: "auto",
                    width: "auto",
                    maxWidth:"100%",
                    maxHeight: "100%"
                };
                var imgTag = "";
                if (img !== 0) {
                    imgTag = <img src={imgDatas[img].SmallThumbnail.Filename}></img>
                } else {
                    _.extend(boxStyle, copyStyle);
                }
                editor = <div style={boxStyle} className="box">{imgTag}</div>
            } else {
                editor = img === 0 ? <div style={copyStyle} className="box bucketImage"></div> : <ImageEditor RemoveMe={this.removeImage.bind(this, img)} Image={imgDatas[img]} />;
            }

            return <div className={c}
                onDragEnd={this.dragEnd.bind(this, img, i)}
                onDragStart={this.dragStart.bind(this, img, i, imgDatas[img])}
                onDragEnter={this.dragEnter.bind(this, img, i)}
                onDrop={this.dragDrop.bind(this)}
                key={img} draggable="true">{editor}</div>
        };


        var numRows = this.props.Rows?+this.props.Rows:1;
        var numImgs = imgs.length;
        var images = new Array(numRows);

        if (numRows > 1 && numImgs > 0) {
            _.each(images, (rw, rowIdx)=>{
                var rowLength = numImgs/numRows|0;
                if (rowIdx < (numImgs%numRows)) {
                    rowLength++;
                }
                var row = new Array(rowLength);
                _.each(row, (rw, colIdx)=>{
                    var imgIdx = colIdx*numRows+rowIdx;
                    row[colIdx] = mapImg( imgs[imgIdx], imgIdx );
                });
                images[rowIdx] = <div key={rowIdx} className="row">{row}</div>;
            });
        } else if (numImgs > 0) {
            var imgEls = _.map(imgs, mapImg);
            images[0] = <div key="0" className="row">{imgEls}</div>;
        } else {
            images = <div key="-1" className="box">No images yet.</div>
        }

        var style = {};
        if (!this.props.Edit) {
            style = {
                height: "280px"
            }
        }

        return <div style={style}
            onDragEnter={this.dragExternalEnter.bind(this)}
            onDragLeave={this.dragExternalLeave.bind(this)}
            onDragOver={e=>{e.preventDefault();}}
            onDrop={this.dragDrop.bind(this)}
            className="sorter row">

            <div className="box">
                {images}
            </div>
        </div>
    }

}
