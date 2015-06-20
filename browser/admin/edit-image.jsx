import React from "react";

export default class ImageEditor extends React.Component {
    constructor(props) {
        super(props)
        this.state = {};
    }

    confirmDelete(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({confirm: true});
    }
    cancelDelete(e) {
        this.setState({confirm: false});
    }
    doDelete(e) {

    }

    render() {
        var src = "upload/" + this.props.ID + ".smthumb.jpg";
        if (this.state.confirm) {
            return <div onMouseLeave={this.cancelDelete.bind(this)} className="box bucketImage">
                Are you sure you want to delete this image?
                <div className="row">
                    <button onClick={this.doDelete.bind(this)}>Yes</button><button onClick={this.cancelDelete.bind(this)}>Cancel</button>
                </div>
            </div>
        }

        var style = {
            "background-color": this.state.Enabled?"#cce":"#ccc",
            border: "4px solid " + (this.state.Enabled?"#aac":"#aaa"),
        };

        return <div className="box bucketImage" style={style}>
            <div className="row between-xs">
                <div className="box">
                    <input className="img-enable" type="checkbox" checked={this.state.Enabled?"checked":""} title="Enable/Disable Image" />
                </div>
                <div className="box"></div>
                <div className="box">
                    <a onClick={this.confirmDelete.bind(this)} className="img-delete" href="#" title="Delete Image">X</a>
                </div>
            </div>
            <div className="row">
                <img draggable="false" src={src}></img>
            </div>

            <div className="row"><input placeholder="name" value={this.state.Name} /></div>
            <div className="row"><textarea placeholder="caption" value={this.state.Caption} /></div>
        </div>
    }
}
