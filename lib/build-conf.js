
const Express = require('express');
const Path    = require('path');

const { setupWebpack } = require('./webpack');
const { setupHeckle }  = require('./heckle');
const { setupFileAPI } = require('./file-api');

function readServerProps( env ) {
    const { server } = env;
    if( !server ) {
        throw new Error('ds: "server" environment variable is required');
    }
    const { config, mount } = server;
    if( !config ) {
        throw new Error('ds: "config" server property is required');
    }
    if( !mount ) {
        throw new Error('ds: "mount" server property is required');
    }
    return server;
}

/**
 * Development server build commands.
 * Note that unlike normal build commands, dev server build commands are
 * used to configure the dev server to (incrementally) build content.
 */
module.exports = {
    "ds:webpack:" function( env, args ) {
        const { config, mount } = readServerProps( env );
        // TODO source/target could be passed here
        setupWebpack( config, mount );
    },
    "ds:heckle": async function( env, args ) {
        const { config, mount } = readServerProps( env );
        // TODO source/target should definitely be passed here
        await setupHeckle( config, mount );
    },
    "ds:file-api": function( env, args ) {
        const { config, mount } = readServerProps( env );
        // TODO target could be passed there
        setupFileAPI( config, mount );
    },
    "ds:static-files": function( env, args ) {
        const [ target ] = args;
        if( !target ) {
            throw new Error('static-files: "target" arg is required');
        }
        mount.use( Express.static( Path.resolve( target ) ) );
    },
    "ds:build": {
        "args": [ "source", "target" ],
        "vars": {
            "source": ".",
            "target": "_site"
        },
        "actions": [
            "ds:webpack {source} {target",
            "ds:file-api {target}",
            "ds:heckle {source} {target}",
            "ds:static-files {target}"
        ]
    }
}
