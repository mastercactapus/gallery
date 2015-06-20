import React from "react";
import {} from "./styles.scss";
import {} from "flexboxgrid/dist/flexboxgrid.css";
import Buckets from "./edit-bucket.jsx";
import Bluebird from "bluebird";
import Sorter from "./sorter.jsx";


var ready = new Bluebird(function(resolve, reject){
    document.addEventListener("readystatechange", function(){
        if (document.readyState === "complete") resolve();
    });
});

ready.then(function(){
    React.render(<div>
        <Buckets /></div>,
        document.getElementById("app"));
});
