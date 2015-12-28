'use strict';

var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');
var argv = require('minimist')(process.argv.slice(2));
var DEBUG = !(argv.release || argv.dbeta);
var GLOBALS = {}

var ExtractTextPlugin = require("extract-text-webpack-plugin");

var config = {
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract("style-loader", "css-loader")
                // loader: 'style-loader!css-loader!' + AUTOPREFIXER_LOADER
            },
            {
                test: /\.less$/,
                loader: ExtractTextPlugin.extract("style-loader", "css-loader!less-loader")
                // loader: 'style-loader!css-loader!' + AUTOPREFIXER_LOADER + '!less-loader'
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|eot|ttf|woff|woff2)$/,
                loader: 'url-loader?limit=10000&name=assets/[name].[ext]'
            },
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loaders: ['babel']
                // loader: 'babel-loader!jsx-loader?harmony'
            }
        ]
    }
};

var appConfig = _.merge({},config,{
    entry: {
        app: './src/main.js'
    },
    output: {
        path: path.join(__dirname, "www/public/"),
        publicPath: '',
        filename: 'main.js'
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin(),
        new ExtractTextPlugin('main.css',{
        allChunks: true
    })].concat([
      new webpack.DefinePlugin(_.merge(GLOBALS, {'__SERVER__': false}))
    ]).concat(DEBUG ? [] : [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.optimize.AggressiveMergingPlugin()
    ])
});


module.exports = [appConfig];
