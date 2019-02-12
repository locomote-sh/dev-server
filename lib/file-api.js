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

const {
    makeFileRecords
} = require('@locomote.sh/filesets');

const { 
    make: makeSchema
} = require('@locomote.sh/file.api/lib/schema');

const FileAPI = require('@locomote.sh/file.api/lib/server');

const initIDB = require('indexeddbshim');

const Chokidar = require('chokidar');

/**
 * Initialize query functions with a content origin.
 */
function setupFileAPI( config, mount ) {

    const { publicPath } = config;

    // Initialize an in-memory indexeddb.
    const global = {};
    global.window = global;

    initIDB( global, {
        checkOrigin:    false,
        memoryDatabase: ':memory:'
    });

    // Initialize the file API.
    const {
        addFileRecords,
        removeFileRecords,
        handleFileRecordRequest,
        handleQueryRequest,
    } = FileAPI( global );

    // Initialize content origin.
    const origin = {
        schema: makeSchema()
    }

    // Watch for file updates.
    watchFiles( publicPath, origin, addFileRecords, removeFileRecords );

    // Middleware to intercept file record requests.
    // Any file request with a ?format=record query string will return
    // the file db record for the request file.
    mount.use( ( req, res, next ) => {
        if( req.query.format === 'record' ) {
            handleFileRecordRequest( origin, req, res );
            return;
        }
        // Non-record request, continue processing.
        next();
    });

    // Query API request handler.
    mount.get('query.api', ( req, res ) => {
        try {
            handleQueryRequest( origin, req, res );
        }
        catch( e ) {
            res.sendStatus( 500, e.toString() );
        }
    });

}

/**
 * Watch for file updates and update the file db accordingly.
 * @param path      The path to watch.
 * @param origin    A content origin.
 * @param add       A function for adding file records to the file db.
 * @param remove    A function for removing file records from the file db.
 */
function watchFiles( path, origin, add, remove) {

    let additions = []; // List of file additions.
    let deletions = []; // List of file deletions.

    // Watch for file system changes and update the file DB.
    Chokidar
        .watch( path, {})
        .on('all', ( type, file ) => {
            switch( type ) {
                case 'add':
                case 'change':
                    additions.push( file );
                    break;
                case 'unlink':
                    deletions.push( file );
                    break;
            }
        });

    // File changes are batched over a half-second interval.
    setInterval( async () => {
        // Capture file lists.
        const _additions = additions;
        additions = [];
        const _deletions = deletions;
        deletions = [];
        // Apply updates.
        await add( origin, _additions );
        await remove( origin, _deletions );
    }, 500 );

}

module.exports = { setupFileAPI };

