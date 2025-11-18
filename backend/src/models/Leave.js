import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Reason cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comments cannot be more than 500 characters']
  },
  attachments: [{
    type: String // URLs to attached files
  }],
  isPaid: {
    type: Boolean,
    default: true // Default to paid leave
  }
}, {
  timestamps: true
});

// Calculate total days before saving (runs before validation)
leaveSchema.pre('save', function(next) {
  try {
    // Always recalculate if dates are present
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      
      // Ensure dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new Error('Invalid date values for startDate or endDate'));
      }
      
      // Calculate difference in days (inclusive of both start and end dates)
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.totalDays = diffDays;
    } else {
      // If dates are missing, this shouldn't happen but set to 0 as fallback
      this.totalDays = 0;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Index for efficient queries
leaveSchema.index({ employee: 1, startDate: -1 })
leaveSchema.index({ status: 1, startDate: -1 })
leaveSchema.index({ appliedDate: -1 })

// Add pagination plugin
leaveSchema.plugin(mongoosePaginate);

const Leave = mongoose.model('Leave', leaveSchema)

export default Leave

