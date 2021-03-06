/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const winston = require('winston');
const loggers = {};
const MESSAGE = Symbol.for('message');
const util = require('util');


// looks odd, but this is the most efficient way of padding strings in js
const padding = '                                               ';

const formatter = name => winston.format.combine(
    winston.format.splat(),
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.simple(),
    winston.format.padLevels(),
    winston.format.printf((info) => {
        const {timestamp, level} = info;
        const str = (`[${name}]` + padding).substring(0, padding.length);
        return `${timestamp} ${level} ${str} ${info[MESSAGE]}`;
    }
    )
);

let transport;

const getTransport = () => {
    if (!transport) {
        transport =    new winston.transports.Console({
            handleExceptions: false,
        });
    }
    return transport;
};


function createLogger(loglevel, name) {
    const logger = new winston.createLogger({
        level:loglevel,
        format: formatter(name),
        transports: [
            getTransport()
        ],
        exitOnError: false
    });
    return logger;
}

const levelMapping = (level) => {
    let loglevel = 'info';
    if (typeof level === 'string') {
        switch (level.toUpperCase()) {
            case 'CRITICAL':
                loglevel = 'fatal';
                break;
            case 'ERROR':
                loglevel = 'error';
                break;
            case 'WARNING':
                loglevel = 'warn';
                break;
            case 'DEBUG':
                loglevel = 'debug';
                break;
            case 'INFO':
                loglevel = 'info';
        }
    }
    return loglevel;
};

module.exports.getLogger = function (name = '') {
    // set the logging level based on the environment variable
    // configured by the peer
    const loglevel = levelMapping(process.env.CORE_CHAINCODE_LOGGING_LEVEL);
    let logger;

    if (loggers[name]) {
        logger = loggers[name];
        logger.level = loglevel;
    } else {
        logger = createLogger(loglevel, name);
        loggers[name] = logger;
    }

    return logger;
};

module.exports.setLevel = (level) => {
    // set the level of all the loggers currently active
    const loglevel = levelMapping(level);
    process.env.CORE_CHAINCODE_LOGGING_LEVEL = loglevel;

    Object.keys(loggers).forEach((name) => {
        loggers[name].level = loglevel;
    });
};

function firstTime() {
    if (!loggers._) {
        const loglevel = levelMapping(process.env.CORE_CHAINCODE_LOGGING_LEVEL);
        loggers._ = new winston.createLogger({
            level:loglevel,
            format: formatter('_'),
            transports: [
                new winston.transports.Console({
                    handleExceptions: true,
                })
            ],
            exitOnError: false
        });


        process.on('unhandledRejection', (reason, p) => {
            loggers._.error('Unhandled Rejection reason ' + reason + ' promise ' +  util.inspect(p));
        });

    }
}
firstTime();