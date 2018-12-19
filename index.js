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

// Read command line.
const [ , , configFile = './locomote-dev-server.json' ] = process.argv;

// Default configuration.
const DefaultConfig = {
    // Where to mount the server.
    mountPath:      '/',
    // Port to listen under.
    port:           3000,
    // Where to read public files from.
    publicPath:     '_public',
    // Whether to use webpack middleware.
    useWebpack:     false,
    // Name of the webpack config file.
    webpackConfig:  './webpack.config.js',
    // An object mapping paths to proxied URLs.
    proxies:        {}
}

// Load custom configuration.
let config = DefaultConfig;
try {
    if( !configFile.startsWith('./') ) {
        configFile = './'+configFile;
    }
    config = Object.assign( config, require( configFile ) );
    console.log(`✅ Loaded configuration from ${configFile}`);
}
catch( e ) {
    if( e.code != 'MODULE_NOT_FOUND' ) {
        console.error('⛔️ Error loading configuration:');
        console.error( e );
        process.exit( 1 );
    }
    console.log('✅ Using default configuration');
}

// Setup express server.
const Express = require('express');
const Path = require('path');

let {
    mountPath,
    port,
    publicPath,
    useWebpack,
    proxies
} = config;

let mount = Express();

// Mount public files.
mount.use( Express.static( Path.join( __dirname, publicPath ) ) );

if( useWebpack ) {

    // Configure webpack middleware.

    const Webpack = require('webpack');
    const WPMWare = require('webpack-dev-middleware');

    let { webpackConfig } = config;
    let compiler = Webpack( require( webpackConfig ) );

    mount.use( WPMWare( compiler, {
        hot:        true,
        filename:   'bundle.js',
        publicPath: mountPath,
        stats: {
            colors: true
        },
        historyApiFallback: true,
        writeToDisk: true//
    }));
}

// Check for non-root mount path.
let server = mount;
if( mountPath != '/' ) {
    mountPath = absPath( mountPath );
    server = Express();
    server.use( mountPath, mount );
}
// Mount proxies.
const Proxy = require('express-http-proxy');
for( let path in proxies ) {
    // Read proxy settings.
    let proxy = proxies[path];
    let { url, opts } = proxy;
    if( !url && typeof proxy == 'string' ) {
        // Allow proxy setting to be set as URL string.
        url = proxy;
    }
    else {
        console.error(`⛔️ Bad proxy config for ${path}: No URL specified.`);
        process.exit( 1 );
    }
    path = absPath( path );
    server.use( path, Proxy( url, opts ) );
    console.log(`✅ Forwarding ${path} -> ${url}`);
}

// Start the HTTP server.
server.listen( port, () => {
    console.log(`✅ Dev server running @ http://localhost:${port}${mountPath}`);
});

// Ensure that a server path starts with a forward slash.
function absPath( path ) {
    if( path.startsWith('/') ) {
        return path;
    }
    return '/'+path;
}

