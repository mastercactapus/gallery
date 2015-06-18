module.exports = {
	entry: "./browser/main.js",
	output: {
		path: __dirname + "/public",
		filename: "bundle.js"
	},

	module: {
		loaders: [
			{ test: /\.css$/, loader: "style-loader!css-loader" },
			{ test: /browser\/.*\.jsx?$/, loader: "babel-loader", exclude: /(node_modules)/ },
			{ test: /node_modules\/.*\.jsx$/, loader: "babel-loader"},
			{ test: /\.(svg|eot|woff2?|ttf|png|gif)$/, loader: "url-loader" }
		],
	},
	devServer: {
		proxy: {
			"/admin/*": "http://127.0.0.1:8000"
		}
	},
};
