import React from "react";
import {} from "./styles.css";
import Buckets from "./edit-bucket.jsx";
import Bluebird from "bluebird";

var ready = new Bluebird(function(resolve, reject){
    document.addEventListener("readystatechange", function(){
        if (document.readyState === "complete") resolve();
    });
});

ready.then(function(){
    React.render(<Buckets />,
        document.getElementById("app"));
});
