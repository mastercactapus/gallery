import React from "react";
import _ from "lodash";
import Bluebird from "bluebird";
import Upload from "./upload.jsx";
import request from "browser-request";
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

	update() {
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

		var images = _.map(this.state.Images, img=>{
			return <div key={img.ID} className="box bucketImage"><img src={img.SmallThumbnail.Filename}></img></div>
		})

		return <div className="editBucket">
			<div className="row">
				<div className="">
					<div>
						<label>Name<br /><input type="text" value={this.state.Name} /></label>
					</div>
					<div>
						<label>Caption<br /><textarea type="text">{this.state.Caption}</textarea></label>
					</div>
					<div>
						<label><input type="checkbox" checked={this.state.Enabled?"checked":""} />Enabled</label>
					</div>
				</div>
				<div className="col-xs imgs">
					<div className="row start-xs">
						<div className="row">Images</div>
						<div className="row">
							{images}
						</div>
					</div>
					<div className="row">
						<Upload bucketId={this.state.ID} updateCb={this.update.bind(this)}/>
					</div>
					<ul></ul>
				</div>
			</div>


			<div className="error">{this.state.err}</div>
		</div>

	}
}
