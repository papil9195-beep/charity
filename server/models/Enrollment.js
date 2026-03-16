import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    uploadedFiles: {
      type: [
        new mongoose.Schema(
          {
            fieldName: { type: String, required: true },
            fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
            filename: { type: String, required: true },
            contentType: { type: String, default: 'application/octet-stream' },
            size: { type: Number, required: true },
            uploadedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
)

export default mongoose.model('Enrollment', enrollmentSchema)
