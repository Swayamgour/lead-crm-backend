const schema = new mongoose.Schema({

    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead"
    },

    oldRemark: String,

    newRemark: String,

    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps: true })

export default mongoose.model("RemarkHistory", schema)