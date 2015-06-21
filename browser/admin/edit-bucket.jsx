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
		this.forceUpdate();
		this.save();
	}
	updateThumbnails(thumbnails) {
		this.state.SmallThumbnails = thumbnails;
		this.state.changed = true;
		this.forceUpdate();
		this.save();
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
										<div className="main-thumbnail">
											<img src={this.state.Thumbnail.Filename}></img>
										</div>
									</div>
									<div className="col-xs">
										<Sorter UpdateItems={this.updateThumbnails.bind(this)} Rows="2" Images={this.state.SmallThumbnails} />
									</div>
							</div>
							<div className="row">
								<div className="box">Images</div>
							</div>
							<div className="row">
								<div className="col-xs">
									<div className="box">
										<Sorter UpdateItems={this.updateImages.bind(this)} Edit="true" Images={this.state.Images} />
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
