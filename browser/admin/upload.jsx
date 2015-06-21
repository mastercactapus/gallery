import React from "react";
import _ from "lodash";
import Bluebird from "bluebird";

function prettyByte(val) {
	if (val > Math.pow(1024, 3)) {
		return (val/(1000 * Math.pow(1024, 2))).toFixed(2) + " GiB";
	} else if (val > Math.pow(1024, 2)) {
		return (val/(1000 * Math.pow(1024, 1))).toFixed(2) + " MiB";
	} else if (val > Math.pow(1024, 1)) {
		return (val/(1000 * Math.pow(1024, 0))).toFixed(2) + " KiB";
	} else {
		return val + " Bytes";
	}
}

export default class Uploader extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			uploading: false,
			dragging: false,

			uploadedBytes: 0,
			totalBytes: 0,
			uploadedFiles: 0,
			totalFiles: 0,
			currentFile: "",

			err: null
		};
	}

	dragOver(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({dragging: true});
	}

	dragLeave(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({dragging: false});
	}

	uploadFile(file) {
		var startPos = this.state.uploadedBytes;
		this.setState({
			currentFile: file.name,
			uploadedFiles: this.state.uploadedFiles+1,
		});
		return new Bluebird((resolve,reject)=>{
			var xhr = new XMLHttpRequest();
			xhr.upload.addEventListener("progress", e=>{
				this.setState({uploadedBytes: startPos+e.loaded});
			});
			xhr.responseType="json";
			xhr.addEventListener("error", reject);
			xhr.addEventListener("readystatechange", ()=>{
				if (xhr.readyState !== 4) return;
				if (xhr.status !== 200) {
					reject(new Error("non-200 status code: " + xhr.status));
				} else {
					resolve(xhr.response);
				}
			});
			xhr.open("POST", "admin/upload/" + this.props.BucketId, true);
			xhr.setRequestHeader("Content-type", file.type);
			xhr.setRequestHeader("X-File-Name", file.name);
			xhr.send(file);
		})
		.tap(this.props.AddImage);
	}

	uploadFiles(files) {
		var totalSize = 0;
		_.each(files, file=>{
			totalSize+=file.size;
		});
		this.setState({
			uploading: true,
			totalBytes: totalSize,
			uploadedBytes: 0,
			totalFiles: files.length,
			uploadedFiles: 0,
			currentFile: files[0].name
		});

		return Bluebird.map(files, this.uploadFile.bind(this), {concurrency: 1})
		.then(() =>{
			this.setState({
				uploading: false
			});
		})
		.finally(this.props.updateCb);
	}

	drop(e) {
		e.stopPropagation();
		e.preventDefault();
		var images = _.chain(e.dataTransfer.files)
		.filter(file => {
			return file.type.indexOf("image") > -1;
		})
		.value();


		this.setState({dragging: false});
		if (images.length === 0) return;
		this.uploadFiles(images)
		.catch(err=>{
			this.setState({err: err});
			console.error(err);
		});
	}

	render() {
		if (this.state.err) {
			return <div className="box uploadbox error">upload failed: {this.state.err.message}</div>
		}

		if (this.state.uploading) {
			return <div className="box uploadbox uploading">
				<p>Current File: {this.state.currentFile}</p>
				<p>Uploading {this.state.uploadedFiles} of {this.state.totalFiles} ({prettyByte(this.state.uploadedBytes)}/{prettyByte(this.state.totalBytes)})</p>
				<progress value={this.state.uploadedBytes} max={this.state.totalBytes}></progress>
			</div>
		} else if (this.state.dragging) {
			return <div className="box uploadbox hover" onDragOver={this.dragOver.bind(this)} onDragLeave={this.dragLeave.bind(this)} onDrop={this.drop.bind(this)}>
				Drop it like it's hot
			</div>
		} else {
			return <div className="box uploadbox" onDragOver={this.dragOver.bind(this)} onDragLeave={this.dragLeave.bind(this)} onDrop={this.drop.bind(this)}>
				Drag image(s)<br />here to upload
			</div>
		}
	}
}
