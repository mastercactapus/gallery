import React from "react";
import {} from "./styles.scss";
import {} from "flexboxgrid/dist/flexboxgrid.css";
import Buckets from "./edit-bucket.jsx";
import Bluebird from "bluebird";
import Sorter from "./sorter.jsx";
import request from "browser-request";
Bluebird.promisifyAll(request);

var domReady = new Bluebird(function(resolve, reject){
    document.addEventListener("readystatechange", function(){
        if (document.readyState === "complete") resolve();
    });
});
var gapiReady = new Bluebird(function(resolve, reject){
	window.gapiLoaded = resolve;
});
var signedIn = new Bluebird(function(resolve, reject){
	window.onSignIn = resolve;
});


function launch() {
	function signOut(e) {
		e.preventDefault();
		Bluebird.resolve(gapi.auth2.getAuthInstance().signOut())
		.finally(function(){
			window.location.href += "/logout";
		});
	}

	React.render(<a onClick={signOut} href="logout">Sign Out</a>, document.getElementById("signOut"));

    React.render(<div>
        <Buckets /></div>,
        document.getElementById("app"));
}

function signIn() {
	document.getElementById("autherr").innerHTML = "";
	var authToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
	request.postAsync({
		uri: "/admin/login",
		body: JSON.stringify({
			Token: authToken
		}),
	})
	.spread(function(res,body){
		if (res.statusCode === 401) throw new Error("You are not an admin.");
		if (res.statusCode !== 200) throw new Error("Auth failed.");
	})
	.then(launch)
	.catch(function(err){
		console.error(err);
		document.getElementById("autherr").innerHTML = err.message;
	});
}

Bluebird.join(domReady, gapiReady, signedIn)
.then(function(){
	window.onSignIn = signIn;
	signIn();
})
.then(function(){ //get permission from backend

})
.then(function(){


})
.catch()
