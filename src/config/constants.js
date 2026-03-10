// src/config/constants.js

// ========== LEAD STATUS ==========
export const LEAD_STATUS = {
    INCOMING: 'Incoming',
    INTERESTED: 'Interested',
    ONGOING: 'Ongoing',
    COLD: 'Cold',
    WON: 'Won',
    LOST: 'Lost',
    NEXT_FOLLOW_UP: 'Next Follow Up',
    NO_RESPONSE: 'No Response'
};

export const LEAD_STATUS_LIST = Object.values(LEAD_STATUS);

export const LEAD_STATUS_COLORS = {
    [LEAD_STATUS.INCOMING]: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500', badge: 'bg-blue-500' },
    [LEAD_STATUS.INTERESTED]: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500', badge: 'bg-green-500' },
    [LEAD_STATUS.ONGOING]: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500', badge: 'bg-purple-500' },
    [LEAD_STATUS.COLD]: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500', badge: 'bg-gray-500' },
    [LEAD_STATUS.WON]: { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-500', badge: 'bg-emerald-500' },
    [LEAD_STATUS.LOST]: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500', badge: 'bg-red-500' },
    [LEAD_STATUS.NEXT_FOLLOW_UP]: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500', badge: 'bg-yellow-500' },
    [LEAD_STATUS.NO_RESPONSE]: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500', badge: 'bg-orange-500' }
};

// ========== LEAD SOURCES ==========
export const LEAD_SOURCES = {
    INDIA_MART: 'IndiaMART',
    WEBSITE: 'Website',
    META: 'Meta Platforms',
    WHATSAPP: 'WhatsApp Chatbot',
    MANUAL: 'Manual Entry',
    REFERENCE: 'Reference',
    PHONE_CALL: 'Phone Call',
    EMAIL_CAMPAIGN: 'Email Campaign',
    SOCIAL_MEDIA: 'Social Media',
    TRADE_SHOW: 'Trade Show',
    WALK_IN: 'Walk-in',
    PARTNER: 'Partner Referral',
    EXISTING_CUSTOMER: 'Existing Customer',
    ONLINE_AD: 'Online Advertisement',
    COLD_CALL: 'Cold Call'
};

export const LEAD_SOURCES_LIST = Object.values(LEAD_SOURCES);

export const LEAD_SOURCES_COLORS = {
    [LEAD_SOURCES.INDIA_MART]: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '🛒' },
    [LEAD_SOURCES.WEBSITE]: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '🌐' },
    [LEAD_SOURCES.META]: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: '📱' },
    [LEAD_SOURCES.WHATSAPP]: { bg: 'bg-green-100', text: 'text-green-600', icon: '💬' },
    [LEAD_SOURCES.MANUAL]: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '📝' },
    [LEAD_SOURCES.REFERENCE]: { bg: 'bg-purple-100', text: 'text-purple-600', icon: '👥' },
    [LEAD_SOURCES.PHONE_CALL]: { bg: 'bg-teal-100', text: 'text-teal-600', icon: '📞' },
    [LEAD_SOURCES.EMAIL_CAMPAIGN]: { bg: 'bg-red-100', text: 'text-red-600', icon: '✉️' },
    [LEAD_SOURCES.SOCIAL_MEDIA]: { bg: 'bg-pink-100', text: 'text-pink-600', icon: '📱' },
    [LEAD_SOURCES.TRADE_SHOW]: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '🎪' },
    [LEAD_SOURCES.WALK_IN]: { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: '🚶' },
    [LEAD_SOURCES.PARTNER]: { bg: 'bg-lime-100', text: 'text-lime-600', icon: '🤝' },
    [LEAD_SOURCES.EXISTING_CUSTOMER]: { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: '⭐' },
    [LEAD_SOURCES.ONLINE_AD]: { bg: 'bg-amber-100', text: 'text-amber-600', icon: '📢' },
    [LEAD_SOURCES.COLD_CALL]: { bg: 'bg-slate-100', text: 'text-slate-600', icon: '❄️' }
};

// ========== PIPELINE STAGES ==========
export const PIPELINE_STAGES = {
    NEW_LEAD: 'New Lead',
    CONTACTED: 'Contacted',
    REQUIREMENT_IDENTIFIED: 'Requirement Identified',
    QUOTATION_SENT: 'Quotation Sent',
    FOLLOW_UP: 'Follow-Up',
    NEGOTIATION: 'Negotiation',
    WON: 'Won',
    LOST: 'Lost'
};

export const PIPELINE_STAGES_LIST = Object.values(PIPELINE_STAGES);

export const PIPELINE_STAGES_COLORS = {
    [PIPELINE_STAGES.NEW_LEAD]: { bg: 'bg-blue-50', header: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200' },
    [PIPELINE_STAGES.CONTACTED]: { bg: 'bg-purple-50', header: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200' },
    [PIPELINE_STAGES.REQUIREMENT_IDENTIFIED]: { bg: 'bg-indigo-50', header: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200' },
    [PIPELINE_STAGES.QUOTATION_SENT]: { bg: 'bg-orange-50', header: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200' },
    [PIPELINE_STAGES.FOLLOW_UP]: { bg: 'bg-yellow-50', header: 'bg-yellow-600', text: 'text-yellow-600', border: 'border-yellow-200' },
    [PIPELINE_STAGES.NEGOTIATION]: { bg: 'bg-pink-50', header: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-200' },
    [PIPELINE_STAGES.WON]: { bg: 'bg-green-50', header: 'bg-green-600', text: 'text-green-600', border: 'border-green-200' },
    [PIPELINE_STAGES.LOST]: { bg: 'bg-red-50', header: 'bg-red-600', text: 'text-red-600', border: 'border-red-200' }
};

export const PIPELINE_STAGES_ORDER = [
    PIPELINE_STAGES.NEW_LEAD,
    PIPELINE_STAGES.CONTACTED,
    PIPELINE_STAGES.REQUIREMENT_IDENTIFIED,
    PIPELINE_STAGES.QUOTATION_SENT,
    PIPELINE_STAGES.FOLLOW_UP,
    PIPELINE_STAGES.NEGOTIATION,
    PIPELINE_STAGES.WON,
    PIPELINE_STAGES.LOST
];

// ========== PRIORITY LEVELS ==========
export const PRIORITY = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
};

export const PRIORITY_LIST = Object.values(PRIORITY);

export const PRIORITY_COLORS = {
    [PRIORITY.HIGH]: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500', badge: 'bg-red-500' },
    [PRIORITY.MEDIUM]: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500', badge: 'bg-yellow-500' },
    [PRIORITY.LOW]: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500', badge: 'bg-green-500' }
};

// ========== EXECUTIVE ROLES ==========
export const EXECUTIVE_ROLES = {
    EXECUTIVE: 'Sales Executive',
    SENIOR: 'Senior Sales Executive',
    MANAGER: 'Sales Manager',
    TEAM_LEAD: 'Team Lead',
    DIRECTOR: 'Sales Director',
    VP: 'VP of Sales'
};

export const EXECUTIVE_ROLES_LIST = Object.values(EXECUTIVE_ROLES);

export const EXECUTIVE_ROLES_COLORS = {
    [EXECUTIVE_ROLES.EXECUTIVE]: { bg: 'bg-blue-100', text: 'text-blue-600' },
    [EXECUTIVE_ROLES.SENIOR]: { bg: 'bg-green-100', text: 'text-green-600' },
    [EXECUTIVE_ROLES.MANAGER]: { bg: 'bg-purple-100', text: 'text-purple-600' },
    [EXECUTIVE_ROLES.TEAM_LEAD]: { bg: 'bg-orange-100', text: 'text-orange-600' },
    [EXECUTIVE_ROLES.DIRECTOR]: { bg: 'bg-red-100', text: 'text-red-600' },
    [EXECUTIVE_ROLES.VP]: { bg: 'bg-indigo-100', text: 'text-indigo-600' }
};

// ========== EXECUTIVE STATUS ==========
export const EXECUTIVE_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ON_LEAVE: 'on-leave',
    TERMINATED: 'terminated',
    PROBATION: 'probation'
};

export const EXECUTIVE_STATUS_LIST = Object.values(EXECUTIVE_STATUS);

export const EXECUTIVE_STATUS_COLORS = {
    [EXECUTIVE_STATUS.ACTIVE]: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
    [EXECUTIVE_STATUS.INACTIVE]: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' },
    [EXECUTIVE_STATUS.ON_LEAVE]: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
    [EXECUTIVE_STATUS.TERMINATED]: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
    [EXECUTIVE_STATUS.PROBATION]: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' }
};

// ========== FOLLOW-UP TYPES ==========
export const FOLLOW_UP_TYPES = {
    CALL: 'call',
    MEETING: 'meeting',
    WHATSAPP: 'whatsapp',
    EMAIL: 'email',
    VISIT: 'visit',
    VIDEO_CALL: 'video-call',
    DEMO: 'demo',
    PRESENTATION: 'presentation'
};

export const FOLLOW_UP_TYPES_LIST = Object.values(FOLLOW_UP_TYPES);

export const FOLLOW_UP_TYPES_COLORS = {
    [FOLLOW_UP_TYPES.CALL]: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '📞' },
    [FOLLOW_UP_TYPES.MEETING]: { bg: 'bg-purple-100', text: 'text-purple-600', icon: '🤝' },
    [FOLLOW_UP_TYPES.WHATSAPP]: { bg: 'bg-green-100', text: 'text-green-600', icon: '💬' },
    [FOLLOW_UP_TYPES.EMAIL]: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '✉️' },
    [FOLLOW_UP_TYPES.VISIT]: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '🏢' },
    [FOLLOW_UP_TYPES.VIDEO_CALL]: { bg: 'bg-pink-100', text: 'text-pink-600', icon: '📹' },
    [FOLLOW_UP_TYPES.DEMO]: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: '🎯' },
    [FOLLOW_UP_TYPES.PRESENTATION]: { bg: 'bg-teal-100', text: 'text-teal-600', icon: '📊' }
};

// ========== FOLLOW-UP STATUS ==========
export const FOLLOW_UP_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled'
};

export const FOLLOW_UP_STATUS_LIST = Object.values(FOLLOW_UP_STATUS);

export const FOLLOW_UP_STATUS_COLORS = {
    [FOLLOW_UP_STATUS.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
    [FOLLOW_UP_STATUS.COMPLETED]: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
    [FOLLOW_UP_STATUS.OVERDUE]: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
    [FOLLOW_UP_STATUS.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' },
    [FOLLOW_UP_STATUS.RESCHEDULED]: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' }
};

// ========== TIMELINE TYPES ==========
export const TIMELINE_TYPES = {
    LEAD: 'lead',
    CALL: 'call',
    WHATSAPP: 'whatsapp',
    EMAIL: 'email',
    NOTE: 'note',
    MEETING: 'meeting',
    TASK: 'task',
    SYSTEM: 'system',
    QUOTATION: 'quotation',
    PAYMENT: 'payment',
    DOCUMENT: 'document',
    COMMENT: 'comment'
};

export const TIMELINE_TYPES_LIST = Object.values(TIMELINE_TYPES);

export const TIMELINE_TYPES_COLORS = {
    [TIMELINE_TYPES.LEAD]: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '👤' },
    [TIMELINE_TYPES.CALL]: { bg: 'bg-green-100', text: 'text-green-600', icon: '📞' },
    [TIMELINE_TYPES.WHATSAPP]: { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: '💬' },
    [TIMELINE_TYPES.EMAIL]: { bg: 'bg-purple-100', text: 'text-purple-600', icon: '✉️' },
    [TIMELINE_TYPES.NOTE]: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '📝' },
    [TIMELINE_TYPES.MEETING]: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '🤝' },
    [TIMELINE_TYPES.TASK]: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '✅' },
    [TIMELINE_TYPES.SYSTEM]: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: '⚙️' },
    [TIMELINE_TYPES.QUOTATION]: { bg: 'bg-pink-100', text: 'text-pink-600', icon: '📄' },
    [TIMELINE_TYPES.PAYMENT]: { bg: 'bg-teal-100', text: 'text-teal-600', icon: '💰' },
    [TIMELINE_TYPES.DOCUMENT]: { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: '📁' },
    [TIMELINE_TYPES.COMMENT]: { bg: 'bg-lime-100', text: 'text-lime-600', icon: '💭' }
};

// ========== NOTIFICATION TYPES ==========
export const NOTIFICATION_TYPES = {
    LEAD_ASSIGNED: 'lead-assigned',
    LEAD_UPDATED: 'lead-updated',
    FOLLOW_UP: 'follow-up',
    REMINDER: 'reminder',
    SYSTEM: 'system',
    TASK: 'task',
    MENTION: 'mention',
    COMMENT: 'comment'
};

export const NOTIFICATION_TYPES_LIST = Object.values(NOTIFICATION_TYPES);

// ========== USER ROLES ==========
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EXECUTIVE: 'executive'
};

export const USER_ROLES_LIST = Object.values(USER_ROLES);

// ========== PRODUCT CATEGORIES ==========
export const PRODUCT_CATEGORIES = {
    FURNITURE: 'Furniture',
    ELECTRONICS: 'Electronics',
    APPLIANCES: 'Appliances',
    FASHION: 'Fashion',
    BOOKS: 'Books',
    SERVICES: 'Services',
    SOFTWARE: 'Software',
    HARDWARE: 'Hardware'
};

export const PRODUCT_CATEGORIES_LIST = Object.values(PRODUCT_CATEGORIES);

// ========== PAYMENT STATUS ==========
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    PARTIALLY_PAID: 'partially-paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
};

export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

export const PAYMENT_STATUS_COLORS = {
    [PAYMENT_STATUS.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    [PAYMENT_STATUS.PAID]: { bg: 'bg-green-100', text: 'text-green-600' },
    [PAYMENT_STATUS.PARTIALLY_PAID]: { bg: 'bg-blue-100', text: 'text-blue-600' },
    [PAYMENT_STATUS.OVERDUE]: { bg: 'bg-red-100', text: 'text-red-600' },
    [PAYMENT_STATUS.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-600' },
    [PAYMENT_STATUS.REFUNDED]: { bg: 'bg-purple-100', text: 'text-purple-600' }
};

// ========== BLOOD GROUPS ==========
export const BLOOD_GROUPS = [
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
];

// ========== API RESPONSE CODES ==========
export const API_RESPONSE_CODES = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    SERVER_ERROR: 500
};

// ========== PAGINATION DEFAULTS ==========
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};

// ========== DATE FORMATS ==========
export const DATE_FORMATS = {
    DISPLAY: 'DD MMM YYYY',
    DISPLAY_TIME: 'DD MMM YYYY, hh:mm A',
    API: 'YYYY-MM-DD',
    API_TIME: 'YYYY-MM-DD HH:mm:ss',
    FILENAME: 'YYYYMMDD_HHmmss'
};

// ========== FILE UPLOAD ==========
export const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx']
};

// ========== CACHE KEYS ==========
export const CACHE_KEYS = {
    DASHBOARD_STATS: 'dashboard:stats',
    PIPELINE: 'pipeline',
    LEAD_STATS: 'lead:stats',
    EXECUTIVE_LIST: 'executive:list'
};

// ========== CACHE TTL ==========
export const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    DAY: 86400 // 24 hours
};

// ========== SOCKET EVENTS ==========
export const SOCKET_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    JOIN_LEAD_ROOM: 'join-lead-room',
    LEAVE_LEAD_ROOM: 'leave-lead-room',
    JOIN_EXECUTIVE_ROOM: 'join-executive-room',
    NEW_LEAD: 'new-lead',
    UPDATE_LEAD: 'update-lead',
    NEW_FOLLOW_UP: 'new-followup',
    UPDATE_FOLLOW_UP: 'update-followup',
    NEW_TIMELINE: 'new-timeline',
    NOTIFICATION: 'notification'
};

// ========== REGEX PATTERNS ==========
export const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[6-9]\d{9}$/,
    PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    AADHAR: /^\d{12}$/,
    GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/,
    PINCODE: /^\d{6}$/,
    IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    ACCOUNT_NUMBER: /^\d{9,18}$/
};

// ========== ERROR MESSAGES ==========
export const ERROR_MESSAGES = {
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    TOKEN_EXPIRED: 'Your session has expired. Please login again',
    TOKEN_INVALID: 'Invalid authentication token',

    // Validation
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid 10-digit phone number',
    INVALID_PAN: 'Please enter a valid PAN number',
    INVALID_AADHAR: 'Please enter a valid 12-digit Aadhar number',
    INVALID_GST: 'Please enter a valid GST number',
    INVALID_PINCODE: 'Please enter a valid 6-digit pincode',
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
    PASSWORDS_DONT_MATCH: 'Passwords do not match',

    // Resources
    NOT_FOUND: 'Resource not found',
    DUPLICATE_ENTRY: 'Record already exists',

    // Leads
    LEAD_NOT_FOUND: 'Lead not found',
    LEAD_ASSIGNED: 'Lead has been assigned successfully',

    // Executives
    EXECUTIVE_NOT_FOUND: 'Executive not found',
    EXECUTIVE_EXISTS: 'Executive with this email or phone already exists',
    EXECUTIVE_HAS_LEADS: 'Cannot delete executive with assigned leads',

    // Follow-ups
    FOLLOW_UP_NOT_FOUND: 'Follow-up not found',

    // File upload
    FILE_TOO_LARGE: 'File size should not exceed 5MB',
    INVALID_FILE_TYPE: 'Invalid file type. Allowed types: images, PDF, DOC, DOCX, XLS, XLSX',

    // General
    SERVER_ERROR: 'Something went wrong. Please try again later'
};

// ========== SUCCESS MESSAGES ==========
export const SUCCESS_MESSAGES = {
    // Authentication
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',

    // Leads
    LEAD_CREATED: 'Lead created successfully',
    LEAD_UPDATED: 'Lead updated successfully',
    LEAD_DELETED: 'Lead deleted successfully',
    LEAD_ASSIGNED: 'Lead assigned successfully',

    // Executives
    EXECUTIVE_CREATED: 'Executive created successfully',
    EXECUTIVE_UPDATED: 'Executive updated successfully',
    EXECUTIVE_DELETED: 'Executive deleted successfully',

    // Follow-ups
    FOLLOW_UP_CREATED: 'Follow-up scheduled successfully',
    FOLLOW_UP_UPDATED: 'Follow-up updated successfully',
    FOLLOW_UP_COMPLETED: 'Follow-up marked as completed',
    FOLLOW_UP_DELETED: 'Follow-up deleted successfully',

    // Timeline
    TIMELINE_CREATED: 'Timeline entry created successfully',

    // File upload
    FILE_UPLOADED: 'File uploaded successfully',

    // General
    OPERATION_SUCCESS: 'Operation completed successfully'
};

// ========== TIME PERIODS ==========
export const TIME_PERIODS = {
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    THIS_WEEK: 'this-week',
    LAST_WEEK: 'last-week',
    THIS_MONTH: 'this-month',
    LAST_MONTH: 'last-month',
    THIS_QUARTER: 'this-quarter',
    LAST_QUARTER: 'last-quarter',
    THIS_YEAR: 'this-year',
    LAST_YEAR: 'last-year',
    CUSTOM: 'custom'
};

// ========== REPORT TYPES ==========
export const REPORT_TYPES = {
    LEAD_REPORT: 'lead-report',
    EXECUTIVE_PERFORMANCE: 'executive-performance',
    PIPELINE_ANALYSIS: 'pipeline-analysis',
    REVENUE_REPORT: 'revenue-report',
    CONVERSION_REPORT: 'conversion-report',
    ACTIVITY_REPORT: 'activity-report'
};

// ========== EXPORT FORMATS ==========
export const EXPORT_FORMATS = {
    CSV: 'csv',
    EXCEL: 'excel',
    PDF: 'pdf',
    JSON: 'json'
};

// ========== DEFAULT SETTINGS ==========
export const DEFAULT_SETTINGS = {
    THEME: 'light',
    LANGUAGE: 'en',
    CURRENCY: 'INR',
    TIMEZONE: 'Asia/Kolkata',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: '12h'
};

// ========== ACTIVITY TYPES ==========
export const ACTIVITY_TYPES = {
    LEAD_CREATED: 'lead-created',
    LEAD_UPDATED: 'lead-updated',
    LEAD_DELETED: 'lead-deleted',
    LEAD_ASSIGNED: 'lead-assigned',
    LEAD_MOVED: 'lead-moved',
    FOLLOW_UP_CREATED: 'followup-created',
    FOLLOW_UP_COMPLETED: 'followup-completed',
    FOLLOW_UP_RESCHEDULED: 'followup-rescheduled',
    NOTE_ADDED: 'note-added',
    CALL_LOGGED: 'call-logged',
    EMAIL_SENT: 'email-sent',
    WHATSAPP_SENT: 'whatsapp-sent',
    QUOTATION_SENT: 'quotation-sent',
    PAYMENT_RECEIVED: 'payment-received'
};

// ========== CHART TYPES ==========
export const CHART_TYPES = {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    DOUGHNUT: 'doughnut',
    AREA: 'area',
    RADAR: 'radar'
};

// ========== SORT ORDERS ==========
export const SORT_ORDERS = {
    ASC: 'asc',
    DESC: 'desc'
};

// ========== FILTER OPERATORS ==========
export const FILTER_OPERATORS = {
    EQUALS: 'eq',
    NOT_EQUALS: 'ne',
    GREATER_THAN: 'gt',
    GREATER_THAN_EQUALS: 'gte',
    LESS_THAN: 'lt',
    LESS_THAN_EQUALS: 'lte',
    IN: 'in',
    NOT_IN: 'nin',
    LIKE: 'like',
    BETWEEN: 'between'
};

// ========== HTTP METHODS ==========
export const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
};

// ========== ENVIRONMENT ==========
export const ENVIRONMENT = {
    DEVELOPMENT: 'development',
    TESTING: 'testing',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

// Export all constants as a single object
export default {
    // Lead
    LEAD_STATUS,
    LEAD_STATUS_LIST,
    LEAD_STATUS_COLORS,
    LEAD_SOURCES,
    LEAD_SOURCES_LIST,
    LEAD_SOURCES_COLORS,

    // Pipeline
    PIPELINE_STAGES,
    PIPELINE_STAGES_LIST,
    PIPELINE_STAGES_COLORS,
    PIPELINE_STAGES_ORDER,

    // Priority
    PRIORITY,
    PRIORITY_LIST,
    PRIORITY_COLORS,

    // Executive
    EXECUTIVE_ROLES,
    EXECUTIVE_ROLES_LIST,
    EXECUTIVE_ROLES_COLORS,
    EXECUTIVE_STATUS,
    EXECUTIVE_STATUS_LIST,
    EXECUTIVE_STATUS_COLORS,

    // Follow-up
    FOLLOW_UP_TYPES,
    FOLLOW_UP_TYPES_LIST,
    FOLLOW_UP_TYPES_COLORS,
    FOLLOW_UP_STATUS,
    FOLLOW_UP_STATUS_LIST,
    FOLLOW_UP_STATUS_COLORS,

    // Timeline
    TIMELINE_TYPES,
    TIMELINE_TYPES_LIST,
    TIMELINE_TYPES_COLORS,

    // Notification
    NOTIFICATION_TYPES,
    NOTIFICATION_TYPES_LIST,

    // User
    USER_ROLES,
    USER_ROLES_LIST,

    // Product
    PRODUCT_CATEGORIES,
    PRODUCT_CATEGORIES_LIST,

    // Payment
    PAYMENT_STATUS,
    PAYMENT_STATUS_LIST,
    PAYMENT_STATUS_COLORS,

    // General
    BLOOD_GROUPS,
    API_RESPONSE_CODES,
    PAGINATION,
    DATE_FORMATS,
    FILE_UPLOAD,
    CACHE_KEYS,
    CACHE_TTL,
    SOCKET_EVENTS,
    REGEX,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    TIME_PERIODS,
    REPORT_TYPES,
    EXPORT_FORMATS,
    DEFAULT_SETTINGS,
    ACTIVITY_TYPES,
    CHART_TYPES,
    SORT_ORDERS,
    FILTER_OPERATORS,
    HTTP_METHODS,
    ENVIRONMENT
};