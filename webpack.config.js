const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        content: './src/content.ts',
        background: './src/background.ts',
        popup: './src/popup.ts',
        'dom-patcher': './src/dom-patcher.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/, // Matches .ts and .tsx files
                use: 'ts-loader',
                exclude: /node_modules/,
            },
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
        extensions: ['.tsx', '.ts', '.js'],
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
