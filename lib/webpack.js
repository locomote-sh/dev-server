// Copyright 2018 Locomote Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Setup webpack middleware.
function setupWebpack( config, mount ) {

    const {
        mountPath,
        useWebpack,
        webpackConfig
    } = config;

    if( useWebpack ) {

        // Configure webpack middleware.

        const Webpack = require('webpack');
        const WPMWare = require('webpack-dev-middleware');

        const compiler = Webpack( webpackConfig );

        mount.use( WPMWare( compiler, {
            hot:            true,
            filename:       'bundle.js',
            publicPath:     mountPath,
            stats: {
                colors:     true
            },
            historyApiFallback: true,
            writeToDisk:    true
        }));
    }

}

module.exports = { setupWebpack }

