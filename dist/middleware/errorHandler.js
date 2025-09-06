"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    const response = {
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };
    res.status(500).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const response = {
        success: false,
        error: `Route ${req.originalUrl} not found`
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
