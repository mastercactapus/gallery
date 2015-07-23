import React from "react";
import _ from "lodash";
import Bluebird from "bluebird";
import Upload from "./upload.jsx";
import request from "browser-request";
import Sorter from "./sorter.jsx";
Bluebird.promisifyAll(request);
var req = Bluebird.promisify(request);

export default class Buckets extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			buckets: []
		};

	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		request.getAsync({uri:"admin/buckets", json: true})
		.spread((res,body)=>{
			this.setState({buckets: body});
		})
		.catch(err=>{
			console.error(err);
		});
	}

	create(bk) {
		var bks = _.clone(this.state.buckets);
		bks.push(bk);

		this.setState({
			buckets: bks
		});
	}

	delete(id) {
		this.state.buckets = _.reject(this.state.buckets, {ID: id});
		this.forceUpdate();
		this.save();
	}
	moveUp(i) {
		var bk = this.state.buckets.splice(i,1);
		this.state.buckets.splice(i-1,0,bk[0]);
		this.forceUpdate();
		this.save();
	}
	moveDown(i) {
		var bk = this.state.buckets.splice(i,1);
		this.state.buckets.splice(i+1,0,bk[0]);
		this.forceUpdate();
		this.save();
	}

	save() {
		// array of objects with IDs
		var mapFn = _.ary(_.partialRight(_.pick, "ID"), 1);
		var buckets = _.map(this.state.buckets, mapFn);
		this.setState({
            saving: true,
            changed: false,
            err: null,
        });
        return req({
			method: "PATCH",
            uri:"admin/buckets",
            body: JSON.stringify(buckets)
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

	render() {
		var editors = _.map(this.state.buckets, (bucket, i)=>{

			return <div key={bucket.ID} className="row">
				<BucketEditor
					First={i===0}
					Last={i===(this.state.buckets.length-1)}
					Delete={this.delete.bind(this, bucket.ID)}
					MoveUp={this.moveUp.bind(this, i)}
					MoveDown={this.moveDown.bind(this, i)}
					bucket={bucket} />

				</div>
		});

		return <div>
			{editors}
			<div className="row">
				<BucketEditor create={this.create.bind(this)} />
			</div>
		</div>;
	}
}

class BucketEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = _.clone(props.bucket||{});
		this.state.err = null;
		this.save = _.debounce(this.save, 1000);
	}

	updateName(e) {
		this.setState({Name: e.target.value});
	}

	create(e) {
		this.setState({err: null, Name: ""});
		e.preventDefault();
		e.stopPropagation();
		return request.postAsync({uri:"/admin/buckets?name=" + encodeURIComponent(this.state.Name), json: true})
		.spread((res,body)=>{
			this.props.create(body);
		})
		.catch(err=>{
			this.setState({err: err.message});
			console.error(err);
		})
	}

	updateImages(images) {
		this.state.Images = images;
		this.state.changed = true;
		this.validate();
		this.save();
	}
	updateThumbnails(thumbnails) {
		this.state.SmallThumbnails = thumbnails;
		this.state.changed = true;
		this.validate();
		this.save();
	}
	updateEnabled(id, enabled) {
		var obj = _.find(this.state.Images, {ID: id});
		if (obj) {
			obj.Enabled = enabled;
		}
		var obj = _.find(this.state.SmallThumbnails, {ID: id});
		if (obj) {
			obj.Enabled = enabled;
		}
		if (this.state.Thumbnail.ID === id) {
			this.state.Thumbnail.Enabled = enabled;
		}
		this.validate();
		//don't need save, just UI update
	}
	onChange(prop, e) {
		if (prop === "Enabled") {
			this.state[prop] = e.target.checked;
		} else {
			this.state[prop] = e.target.value;
		}
		this.state.changed = true;
		this.validate();
		this.save();
	}
	validate() {
		var imageIDs = _.pluck(this.state.Images, "ID");
		this.state.SmallThumbnails = _.filter(this.state.SmallThumbnails, (t)=>{
			return _.contains(imageIDs, t.ID);
		});
		if (!_.contains(imageIDs, this.state.Thumbnail.ID)) {
			this.state.Thumbnail.ID = 0;
			this.state.Thumbnail.Filename = "";
		}
		this.forceUpdate();
	}
	save() {
		this.setState({
            saving: true,
            changed: false,
            err: null,
        });
        return request.putAsync({
            uri:"admin/buckets/" + this.state.ID,
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

	addImage(img) {
		this.state.Images.push(img);
		this.validate();
	}

	clearThumb() {
		this.state.Thumbnail.ID = 0;
		this.state.Thumbnail.Filename = "";
		this.state.changed = true;
		this.validate();
		this.save();
	}

	thumbDragStart() {
		this.setState({
			thumbDragging: true
		});
	}
	thumbDragEnd() {
		this.setState({
			thumbDragging: false
		});
	}
	thumbDragEnter(e) {
		e.preventDefault();
		e.stopPropagation();
		this.setState({
			thumbHovering: true
		});
	}
	thumbDragLeave(e) {
		e.preventDefault();
		e.stopPropagation();
		this.setState({
			thumbHovering: false
		});
	}
	thumbDragDrop(e) {
		e.preventDefault();
		var data = e.dataTransfer.getData("data/bucketImage");
		if (!!data) {
			var obj = JSON.parse(data);
			this.state.SmallThumbnails = _.reject(this.state.SmallThumbnails, {ID: obj.ID});
		}
		this.state.thumbHovering=false;
		this.state.thumbDragging=false;
		this.state.changed = true;
		this.validate();
		this.save();
	}

	renderCreateNew() {
		var style = this.getBucketStyle();
		return <div style={style} className="editBucket">
			<div className="row">
				<div className="">
					<div>
						<label>Create New Bucket<br /><input type="text" onChange={this.updateName.bind(this)} value={this.state.Name} /></label>
					</div>
				</div>
			</div>
			<div className="row">
				<button disabled={this.state.Name?"":"disabled"} onClick={this.create.bind(this)}>Create</button>
			</div>
			<div className="error">{this.state.err}</div>
		</div>
	}

	renderThumbClearButton() {
		// thumbnail clear
		// click to clear main thumbnail
		// when dragging, show red drop zone
		// to remove thumbnail (for small ones)

		var clearStyle = {
			borderColor: "grey",
			borderWidth: 1,
			borderStyle: "solid",
			fontSize: 16,
			padding: 16
		};
		var clearMsg;
		if (this.state.thumbDragging) {
			clearMsg = "Drop thumb here to remove";
			clearStyle.backgroundColor = this.state.thumbHovering? "red": "orange";
			// clearStyle.fontWeight = "bold";
			clearStyle.color = "black";
		} else {
			clearMsg = <button onClick={this.clearThumb.bind(this)}>Click to clear main thumb</button>
		}

		return <div style={clearStyle}
			onDragOver={e=>{e.preventDefault()}}
			onDragEnter={e=>{e.preventDefault()}}
			onDragEnterCapture={this.thumbDragEnter.bind(this)}
			onDragLeaveCapture={this.thumbDragLeave.bind(this)}
			onDrop={this.thumbDragDrop.bind(this)}
			className="box">
			{clearMsg}
		</div>
	}

	getBucketStyle() {
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

		return {
			backgroundColor: this.state.Enabled?"#bcf":"#ccc",
			borderStyle: "solid",
			borderWidth: "4px",
			borderColor: bdcolor
		};
	}

	delete() {
		this.setState({
			confirmDelete: true
		});
	}
	renderEditBox() {

		var buttons = [];
		if (!this.props.First) {
			buttons.push(<button
				key="0"
				onClick={this.props.MoveUp}>Move Up</button>);
		}
		if(!this.props.Last) {
			buttons.push(<button
			key="1"
			onClick={this.props.MoveDown}>Move Down</button>);
		}
		buttons.push(<button
			key="2"
			onClick={this.delete.bind(this)}>Delete</button>);

		return 	(
			<div className="box">
				<div>
					{buttons}
				</div>
				<div>
					<label>Name<br /><input onChange={this.onChange.bind(this, "Name")} type="text" value={this.state.Name} /></label>
				</div>
				<div>
					<label>Caption<br /><textarea onChange={this.onChange.bind(this, "Caption")} value={this.state.Caption}/></label>
				</div>
				<div>
					<label><input onChange={this.onChange.bind(this, "Enabled")} type="checkbox" checked={this.state.Enabled?"checked":""} />Enabled</label>
				</div>
			</div>
		);
	}


	mainThumbDragEnter(e) {
		this.setState({
			mainThumbHover: true
		});
	}
	mainThumbDragLeave(e) {
		this.setState({
			mainThumbHover: false
		});
	}
	mainThumbDragDrop(e) {
		e.preventDefault();
		var data = e.dataTransfer.getData("data/bucketImage");
		if (!!data) {
			var obj = JSON.parse(data);
			this.state.Thumbnail = obj;
			this.state.mainThumbHover = false;
			this.validate();
			this.save();
		} else {
			this.setState({
				mainThumbHover: false
			})
		}
	}


	renderConfirmDelete() {
		var style = this.getBucketStyle();

		return <div style={style} className="editBucket">
			<div className="row">
			Are you sure you want to delete this bucket?
			</div>
			<div className="row">
			<button
			onClick={this.props.Delete}
			>Yes</button><button
				onClick={()=>{this.setState({confirmDelete: false})}}
			>Cancel</button>
			</div>
		</div>
	}

	render() {
		if (!this.props.bucket) {
			return this.renderCreateNew();
		}
		if (this.state.confirmDelete) {
			return this.renderConfirmDelete();
		}
		var thumbClear = this.renderThumbClearButton();
		var style = this.getBucketStyle();

		return <div style={style} className="editBucket">
			<div className="row">
				{this.renderEditBox()}
				<div className="col-xs imgs">
					<div className="row">
						<div className="box">
							<div className="row">
								<div className="box">Upload</div>
							</div>
							<div className="row">
								<Upload BucketId={this.state.ID} AddImage={this.addImage.bind(this)}/>
							</div>
							<div className="row">
								<div className="box">Images</div>
							</div>
							<div className="row">
								<div className="col-xs">
									<div className="box">
										<Sorter UpdateEnabled={this.updateEnabled.bind(this)} UpdateItems={this.updateImages.bind(this)} Edit="true" Images={this.state.Images} />
									</div>
								</div>
							</div>
						</div>
					</div>

				</div>
			</div>
		</div>

	}
}
