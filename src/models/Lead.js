import mongoose from "mongoose";
import {
  LEAD_STATUS,
  LEAD_SOURCES,
  PIPELINE_STAGES,
  PRIORITY,
} from "../config/constants.js";

const remarkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    // ==========================
    // Customer Details
    // ==========================

    name: String,
    phone: {
      type: String,
      index: true,
    },
    alternatePhone: String,
    email: String,

    company: String,
    companyName: String,

    // ==========================
    // Address
    // ==========================

    address: String,
    city: String,
    district: String,
    state: String,
    country: String,
    countryIso: String,
    pincode: String,

    // ==========================
    // Product Details
    // ==========================

    product: String,
    productId: String,

    category: String,
    categoryId: String,
    subCategory: String,

    subject: String,
    message: String,

    quantity: Number,
    quantityUnit: String,

    expectedValue: Number,

    price: Number,
    priceUnit: String,
    currency: {
      type: String,
      default: "INR",
    },

    material: String,
    brand: String,
    color: String,
    size: String,
    thickness: String,
    finish: String,
    storageRequired: String,

    // ==========================
    // Lead Source
    // ==========================

    source: {
      type: String,
      enum: Object.values(LEAD_SOURCES),
      required: true,
    },

    sourceName: String,
    sourceId: String,

    querySource: String,
    queryType: String,
    queryTime: String,

    enquiryId: String,
    enquiryMessage: String,
    enquiryType: String,

    uniqueId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ==========================
    // Lead Status
    // ==========================

    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.INCOMING,
    },

    priority: {
      type: String,
      enum: Object.values(PRIORITY),
      default: PRIORITY.MEDIUM,
    },

    pipelineStage: {
      type: String,
      enum: Object.values(PIPELINE_STAGES),
      default: PIPELINE_STAGES.NEW_LEAD,
    },

    // ==========================
    // Assignment
    // ==========================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ==========================
    // Follow Up
    // ==========================

    followUpDate: Date,
    followUpTime: String,
    lastContactDate: Date,

    // ==========================
    // Remarks
    // ==========================

    remarks: [remarkSchema],

    // ==========================
    // Tags
    // ==========================

    tags: [String],

    // ==========================
    // Attachments
    // ==========================

    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================
    // IndiaMART Extra
    // ==========================

    receiverMobile: String,
    receiverEmail: String,

    senderGST: String,

    ipAddress: String,
    browser: String,
    device: String,

    latitude: Number,
    longitude: Number,

    callStatus: String,
    callDuration: String,

    // ==========================
    // Activity
    // ==========================

    isRead: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==========================
// Indexes
// ==========================

leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ uniqueId: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ pipelineStage: 1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ city: 1 });
leadSchema.index({ company: 1 });
leadSchema.index({ "remarks.createdAt": -1 });

export default mongoose.model("Lead", leadSchema);