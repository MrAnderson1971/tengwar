const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        content: './src/content.js',
        background: './src/background.js',
        popup: './src/popup.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/popup.html', to: 'popup.html' },
                { from: 'src/annatar.ttf', to: 'annatar.ttf' },
                { from: 'src/parmaite.ttf', to: 'parmaite.ttf' },
                { from: 'src/icons', to: 'icons' }
            ],
        }),
    ],
    resolve: {
        fallback: {
            "fs": false,
            "path": false
        }
    },
    optimization: {
        minimize: true
    },
    performance: {
        hints: false
    },
    devtool: false,
};
