// Copyright 2019 Locomote Limited
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

const Chokidar = require('chokidar');
const Path = require('path');

const { DefaultConfigFile } = require('./process-argv');

async function setupHeckle( config, mount ) {

    const {
        publicPath,
        useHeckle
    } = config;

    if( useHeckle ) {

        const {
            build,
            loadSiteConfig
        } = require('@locomote.sh/heckle/lib/build');

        const source = Path.resolve();
        const target = Path.resolve( publicPath );

        const { config } = await loadSiteConfig( source );

        const { configFile = DefaultConfigFile } = config;

        // Read excluded path list from the configuration.
        const { exclude = [] } = config;
        // Ensure following files/paths are excluded from the build.
        xadd( exclude, 'node_modules');
        xadd( exclude, publicPath );
        xadd( exclude, configFile );
        // If webpack is being used then ensure that webpack files and
        // source are also excluded.
        if( useWebpack ) {
            xadd( exclude, webpackConfig.context );
            xadd( exclude, 'webpack.config.js');
        }
        // Add extended exclude list back to site config.
        config.exclude = exclude;
        // Add site config to build options.
        opts.config = config;

        // Do an initial build of the source.
        await build( source, target, opts );

        // Watch for changes to the site source.
        watchSource( source, target, exclude, opts );
    }

}

// Watch for changes to the site source.
function watchSource( source, target, exclude, opts ) {
    // List of modified files.
    let changes = [];

    // Watch for updates to the source.
    Chokidar
        .watch( source, {
            ignored: exclude.map( path => Path.resolve( source, path ) )
        })
        .on('change', ( type, file ) => {
            changes.push( Path.relative( source, file ) );
        });

    // Check for changes once per second and do a new build if needed.
    setInterval( () => {
        if( changes.length ) {
            const files = changes;
            changes = [];
            build( source, target, opts, false, files );
        }
    }, 1000 );
}

/**
 * Exclusive add: Add an item to an array if that item is not already
 * on the array.
 * @param a An array.
 * @param i The item to add.
 */
function xadd( a, i ) {
    if( !a.includes( i ) ) {
        a.push( i );
    }
}

module.exports = { setupHeckle }

