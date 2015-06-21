import React from "react";
import _ from "lodash";
import Bluebird from "bluebird";
import Upload from "./upload.jsx";
import request from "browser-request";
import Sorter from "./sorter.jsx";
Bluebird.promisifyAll(request);

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

	render() {
		var editors = _.map(this.state.buckets, bucket=>{
			return <div key={bucket.ID} className="row"><BucketEditor bucket={bucket} /></div>
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
		this.setState({err: null});
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
        .catch(err=>{
            console.error(err);
            this.setState({err: err});
        })
        .finally(()=>{
            this.setState({saving: false});
        });
	}

	addImage() {
		return request.getAsync({uri: "admin/buckets/" + encodeURIComponent(this.state.ID), json:true})
		.spread((res,body)=>{
			this.setState(body);
		});
	}

	clearThumb() {
		this.state.Thumbnail.ID = 0;
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

	render() {
		if (!this.props.bucket) {
			return <div className="editBucket">
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

		var thumbClear = <div style={clearStyle}
			onDragOver={e=>{e.preventDefault()}}
			onDragEnter={e=>{e.preventDefault()}}
			onDragEnterCapture={this.thumbDragEnter.bind(this)}
			onDragLeaveCapture={this.thumbDragLeave.bind(this)}
			onDrop={this.thumbDragDrop.bind(this)}
			className="box">
			{clearMsg}
		</div>

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
            borderWidth: "4px",
            borderColor: bdcolor
        };

		return <div style={style} className="editBucket">
			<div className="row">
				<div className="box">
					<div>
						<label>Name<br /><input onChange={this.onChange.bind(this, "Name")} type="text" value={this.state.Name} /></label>
					</div>
					<div>
						<label>Caption<br /><textarea onChange={this.onChange.bind(this, "Caption")} value={this.state.Caption}/></label>
					</div>
					<div>
						<label><input onChange={this.onChange.bind(this, "Enabled")} type="checkbox" checked={this.state.Enabled?"checked":""} />Enabled</label>
					</div>
					<div className="row">
						<Upload BucketId={this.state.ID} AddImage={this.addImage.bind(this)}/>
					</div>
				</div>
				<div className="col-xs imgs">
					<div className="row">
						<div className="box">
							<div className="row">
								<div className="box">Thumbnails</div>
							</div>
							<div className="row">
									<div className="box">
										<div className="row">
											<div className="main-thumbnail">
												<img src={this.state.Thumbnail.Filename}></img>
											</div>
										</div>
										<div className="row">
											{thumbClear}
										</div>

									</div>
									<div className="col-xs"
											onDragStartCapture={this.thumbDragStart.bind(this)}
											onDragEndCapture={this.thumbDragEnd.bind(this)}
											onDropCapture={this.thumbDragEnd.bind(this)}

											>
										<Sorter UpdateEnabled={this.updateEnabled.bind(this)} UpdateItems={this.updateThumbnails.bind(this)} Rows="2" Images={this.state.SmallThumbnails} />
									</div>
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


			<div className="error">{this.state.err}</div>
		</div>

	}
}
