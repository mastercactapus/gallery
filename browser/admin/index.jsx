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
        var images1=[
            {ID: 10001, Filename: "upload/10001.smthumb.jpg"},
            {ID: 10133, Filename: "upload/10133.smthumb.jpg"},
            {ID: 10061, Filename: "upload/10061.smthumb.jpg"},
        ];
        var images2=[
            {ID: 10001, Filename: "upload/10001.smthumb.jpg"},
        ];

    React.render(<div>
        <Sorter Title="Images" Images={images1} />
        <Sorter Title="Images" Images={images2} />
        <Buckets /></div>,
        document.getElementById("app"));
});
