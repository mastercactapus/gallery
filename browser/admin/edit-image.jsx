import React from "react";

export default class ImageEditor extends React.Component {
    constructor(props) {
        super(props)
        this.state = {};
    }

    dragStart() {

    }

    render() {
        return <div className="box bucketImage">
            <div className="row">
                <img draggable="false" src={this.props.src}></img>
            </div>
            <div className="row">
                <label><input type="checkbox" checked={this.state.Enabled?"checked":""} />Enabled</label>
            </div>
            <div className="row"><input placeholder="name" value={this.state.Name} /></div>
            <div className="row"><textarea placeholder="caption" value={this.state.Caption}></textarea></div>
        </div>
    }
}
