import React from "react";
import remote from "./remote";
import Bluebird from "bluebird";
import request from "browser-request";
Bluebird.promisifyAll(request);

var req = Bluebird.promisify(request);

export default class ImageEditor extends React.Component {
    constructor(props) {
        super(props)
        this.state = this.props.Image;
        this.save = _.debounce(this.save, 1000);
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
        req({
            method: "DELETE",
            uri: "admin/images/" + this.state.ID,
        })
        .spread((res,body)=>{
            if (res.statusCode !== 204) throw new Error("non-204");
            this.props.RemoveMe();
        })
        .catch(err=>{
            console.error(err);
            this.setState({
                err: err
            });
        });
    }
    onChange(prop, e) {
        if (prop === "Enabled") {
            this.state[prop] = e.target.checked;
        } else {
            this.state[prop] = e.target.value;
        }
        this.state.changed = true;
        this.forceUpdate();
        this.save();
        this.props.UpdateEnabled(e.target.checked);
    }

    save() {
        this.setState({
            saving: true,
            changed: false,
            err: null,
        });
        return request.putAsync({
            uri:"admin/images/" + this.state.ID,
            body: JSON.stringify(this.state)
        })
        .spread((res,body)=>{
            if (res.statusCode !== 204) throw new Error("non-204");
        })
        .catch(err=>{
            console.error(err);
            this.setState({err: err});
        })
        .finally(()=>{
            this.setState({saving: false});
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        var props = ["Enabled", "Name", "confirm", "Caption", "ID", "err", "saving"];
        var cmp = (prop)=>{
            return this.state[prop] === nextState[prop];
        };
        return !_.all(props, cmp);
    }

    render() {
        if (this.state.confirm) {
            return <div onMouseLeave={this.cancelDelete.bind(this)} className="box bucketImage">
                Are you sure you want to delete this image?
                <div className="row">
                    <button onClick={this.doDelete.bind(this)}>Yes</button><button onClick={this.cancelDelete.bind(this)}>Cancel</button>
                </div>
            </div>
        }

        var bdcolor;
        if (this.state.changed && !this.state.saving) {
            bdcolor = "orange";
        } else if (this.state.saving) {
            bdcolor = "green";
        } else if (this.state.err) {
            bdcolor = "red";
        } else {
            bdcolor = this.state.Enabled?"#aac":"#aaa";
        }

        var style = {
            backgroundColor: this.state.Enabled?"#bcf":"#ccc",
            borderStyle: "solid",
            borderWidth: "2px",
            borderColor: bdcolor
        };

        return <div className="box bucketImage" style={style}>
            <div className="row between-xs">
                <div className="box">
                    <input onChange={this.onChange.bind(this, "Enabled")} className="img-enable" type="checkbox" checked={this.state.Enabled?"checked":""} title="Enable/Disable Image" />
                </div>
                <div className="box"></div>
                <div className="box">
                    <a onClick={this.confirmDelete.bind(this)} className="img-delete" href="#" title="Delete Image">X</a>
                </div>
            </div>
            <div className="row">
                <img draggable="false" src={this.state.SmallThumbnail.Filename}></img>
            </div>

            <div className="row"><input onChange={this.onChange.bind(this, "Name")} placeholder="name" value={this.state.Name} /></div>
            <div className="row"><textarea onChange={this.onChange.bind(this, "Caption")} placeholder="caption" value={this.state.Caption} /></div>
        </div>
    }
}
