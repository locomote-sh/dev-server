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

const Express = require('express');
const Path    = require('path');
const Proxy   = require('express-http-proxy');
const URL     = require('url');

// Run the server using the provided configuration.
function run( config ) {

    // Setup express server.
    let {
        mountPath,
        port,
        publicPath,
        useWebpack,
        proxies,
        logProxyRequests
    } = config;

    let mount = Express();

    // Mount public files.
    mount.use( Express.static( Path.join( __dirname, publicPath ) ) );

    if( useWebpack ) {

        // Configure webpack middleware.

        const Webpack = require('webpack');
        const WPMWare = require('webpack-dev-middleware');

        let { webpackConfig } = config;
        let compiler = Webpack( webpackConfig );

        mount.use( WPMWare( compiler, {
            hot:        true,
            filename:   'bundle.js',
            publicPath: mountPath,
            stats: {
                colors: true
            },
            historyApiFallback: true,
            writeToDisk: true
        }));
    }

    // Check for non-root mount path.
    let server = mount;
    if( mountPath != '/' ) {
        mountPath = absPath( mountPath );
        server = Express();
        server.use( mountPath, mount );
    }

    const serverURL = `http://localhost:${port}`;

    // Mount proxies.
    for( let path in proxies ) {
        // Read proxy forward URL.
        let url = proxies[path];
        if( typeof url != 'string' ) {
            console.error(`Forwarding URL for proxy path "${path}" must be a string`);
            process.exit( 1 );
        }
        path = absPath( path );
        server.use( path, createProxy( url ) );
        console.log(`Forwarding ${serverURL}${path} -> ${url}`);
    }

    // Start the HTTP server.
    server.listen( port, () => {
        console.log(`Dev server running @ ${serverURL}${mountPath}`);
    });

    // Ensure that a server path starts with a forward slash.
    function absPath( path ) {
        if( path.startsWith('/') ) {
            return path;
        }
        return '/'+path;
    }


    // Create a HTTP proxy.
    function createProxy( url ) {
        // Extract parts from URL.
        let { protocol, hostname, port, pathname = '' } = URL.parse( url );
        // Make the proxy host.
        let host = `${hostname}${port ? ':'+port : ''}`;
        return Proxy( host, {
            https: protocol == 'https:',
            preserveHostHdr: true,
            // Prepend the forwarding path to the request path.
            proxyReqPathResolver: req => {
                let path = Path.join( pathname, req.url );
                if( logProxyRequests ) {
                    console.log('>', path );
                }
                return path;
            }
        });
    }
}

exports.run = run;
