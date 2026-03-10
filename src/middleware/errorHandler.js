// src/middleware/errorHandler.js
import mongoose from 'mongoose';

// Custom error classes
export class AppError extends Error {
    constructor(message, statusCode, errorCode = 'APP_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'Not authorized to access this resource') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    }
}

export class DuplicateError extends AppError {
    constructor(message = 'Duplicate entry found') {
        super(message, 409, 'DUPLICATE_ERROR');
    }
}

export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

// Main error handler middleware
export const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?._id,
        timestamp: new Date().toISOString()
    });

    // Default error
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    error.errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

    // Mongoose validation error
    if (err instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));

        error = new ValidationError('Validation failed', errors);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const value = err.keyValue[field];

        error = new DuplicateError(
            `${field} with value '${value}' already exists`
        );
        error.errors = [{
            field,
            message: `${field} already exists`,
            value
        }];
    }

    // Mongoose cast error (invalid ID)
    if (err instanceof mongoose.Error.CastError) {
        error = new NotFoundError(`${err.path} with id ${err.value}`);
        error.errorCode = 'INVALID_ID_ERROR';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = new ValidationError('File too large. Maximum size is 5MB');
        error.errorCode = 'FILE_SIZE_ERROR';
    }

    if (err.code === 'LIMIT_FILE_TYPE') {
        error = new ValidationError('Invalid file type');
        error.errorCode = 'FILE_TYPE_ERROR';
    }

    // Send error response
    res.status(error.statusCode).json({
        success: false,
        error: {
            code: error.errorCode,
            message: error.message,
            ...(error.errors && { errors: error.errors }),
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err
            })
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
};

// 404 handler for undefined routes
export const notFound = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};

// Async error wrapper to catch errors in async routes
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Rate limit error handler
export const rateLimitHandler = (req, res) => {
    res.status(429).json({
        success: false,
        error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many requests from this IP, please try again later'
        },
        timestamp: new Date().toISOString()
    });
};

// Database connection error handler
export const dbErrorHandler = (err) => {
    console.error('Database connection error:', err);

    const errorMessages = {
        'ECONNREFUSED': 'Database connection refused. Please check if MongoDB is running.',
        'ENOTFOUND': 'Database host not found. Please check your connection string.',
        'ETIMEDOUT': 'Database connection timeout. Please check your network.',
        'MongooseServerSelectionError': 'Could not connect to any database server.'
    };

    const errorCode = err.code || err.name;
    const message = errorMessages[errorCode] || 'Database connection error';

    return new AppError(message, 500, 'DATABASE_ERROR');
};

// Socket error handler
export const socketErrorHandler = (socket, err) => {
    console.error('Socket error:', err);

    socket.emit('error', {
        code: err.errorCode || 'SOCKET_ERROR',
        message: err.message || 'An error occurred',
        timestamp: new Date().toISOString()
    });
};

// Unhandled rejection handler
export const unhandledRejectionHandler = (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);

    // Graceful shutdown
    process.exit(1);
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);

    // Graceful shutdown
    process.exit(1);
};

// Graceful shutdown handler
export const gracefulShutdownHandler = (server) => {
    console.log('Received kill signal, shutting down gracefully...');

    server.close(() => {
        console.log('Closed out remaining connections');

        // Close database connection
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });

    // Force shutdown after timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Export all handlers
export default {
    errorHandler,
    notFound,
    catchAsync,
    rateLimitHandler,
    dbErrorHandler,
    socketErrorHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler,
    gracefulShutdownHandler,
    // AppError,
    // ValidationError,
    // AuthenticationError,
    // AuthorizationError,
    // NotFoundError,
    // DuplicateError,
    // RateLimitError
};