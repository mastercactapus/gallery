module.exports = {
	entry: "./browser/main.js",
	output: {
		path: __dirname + "/public",
		filename: "bundle.js"
	},

	module: {
		loaders: [
			{ test: /\.css$/, loader: "style!css" },
			{ test: /\.scss$/, loader: "style!css!sass" },
			{ test: /browser\/.*\.jsx?$/, loader: "babel", exclude: /(node_modules)/ },
			{ test: /node_modules\/.*\.jsx$/, loader: "babel"},
			{ test: /\.(svg|eot|woff2?|ttf|png|gif)$/, loader: "url" }
		],
	},
	devServer: {
		devtool: "inline-source-map",
		proxy: {
			"/admin/*": "http://127.0.0.1:8000",
			"/upload/*": "http://127.0.0.1:8000"
		}
	},
};
