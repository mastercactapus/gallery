import React from "react";
import _ from "lodash";
import ImageEditor from "./edit-image.jsx";


function reorder(IDList, fromID, toID) {

}


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

    dragStart(id, i, e) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("data/imageID", id);
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
        var imgs = _.clone(this.state.images);
        if (this.state.dragging) {
            imgs.splice(this.state.draggingIdx, 1);
            imgs.splice(this.state.hoverIdx, 0, this.state.draggingID);
        } else {
            var id = +e.dataTransfer.getData("data/imageID");
            if (!_.contains(imgs, id)) {
                if (this.state.hoverIdx !== -1) { // insert mode
                    imgs.splice(this.state.hoverIdx, 0, id);
                } else { // append mode
                    imgs.push(id);
                }
            }
        }
        this.setState({
            images: imgs,
            hovering: false,
            dragging: false,
            hoverID: null,
            hoverIdx: -1,
            draggingID: null,
            draggingIdx: -1,
        });
    }

    render() {
        var imgs = _.clone(this.state.images);
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

        var images = _.map(imgs, (img,i)=>{
            var c = "box sortable" ;
            if (img===0 || (img === this.state.draggingID && this.state.hovering)) {
                c+=" dragging";
            }

            var editor = img === 0 ? <div className="box bucketImage drag-copy"></div> : <ImageEditor ID={img} />;

            return <div className={c}
                onDragEnd={this.dragEnd.bind(this, img, i)}
                onDragStart={this.dragStart.bind(this, img, i)}
                onDragEnter={this.dragEnter.bind(this, img, i)}
                onDrop={this.dragDrop.bind(this)}
                key={img} draggable="true">{editor}</div>
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
