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

const { absPath } = require('./support');
const { setupWebpack } = require('./webpack');
const { setupFileAPI } = require('./file-api');
const { setupHeckle }  = require('./heckle');
const { setupProxies } = require('./proxies');

// Heckle integration:
// - enable using a command line switch
// - exclude the context path + node_modules from the site source

// Run the server using the provided configuration.
async function run( config ) {

    // Setup express server.
    let {
        mountPath,
        port,
        publicPath
    } = config;

    const mount = Express();

    setupWebpack( config, mount );

    setupFileAPI( config, mount );

    await setupHeckle( config, mount );

    // Mount public files.
    console.log(`Serving files from ${publicPath}`);
    mount.use( Express.static( Path.resolve( publicPath ) ) );

    // Check for non-root mount path.
    let server = mount;
    if( mountPath != '/' ) {
        mountPath = absPath( mountPath );
        server = Express();
        server.use( mountPath, mount );
    }

    const serverURL = `http://localhost:${port}`;

    setupProxies( config, server, serverURL );

    // Start the HTTP server.
    server.listen( port, () => {
        console.log(`Dev server running @ ${serverURL}${mountPath}`);
    });

}

exports.run = run;

async function start( config, args ) {

    // Create an express server as the main mount point.
    const mount = Express();

    // Create a build environment with a "server" var.
    const env = { server: { config, mount } };

    // Configure the server by running the ds:build command.
    // TODO Move defs to calling code.
    const defs = [ require('./build-conf') ];
    await run('ds:build', env, args, defs );

    // Check for non-root mount path.
    let server = mount;
    if( mountPath != '/' ) {
        mountPath = absPath( mountPath );
        server = Express();
        server.use( mountPath, mount );
    }

    const serverURL = `http://localhost:${port}`;

    // Attach proxy endpoints.
    setupProxies( config, server, serverURL );

    // Start the HTTP server.
    server.listen( port, () => {
        console.log(`Dev server running @ ${serverURL}${mountPath}`);
    });
}

