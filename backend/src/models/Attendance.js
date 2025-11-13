import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    time: {
      type: Date
    },
    location: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String
    },
    deviceInfo: {
      type: String
    }
  },
  checkOut: {
    time: {
      type: Date
    },
    location: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String
    },
    deviceInfo: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave'],
    default: 'present'
  },
  workingHours: {
    type: Number, // in minutes
    default: 0
  },
  overtime: {
    type: Number, // in minutes
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate working hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkIn.time && this.checkOut.time) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);
    const diffInMs = checkOutTime - checkInTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    this.workingHours = Math.max(0, diffInMinutes);
    
    // Calculate overtime (assuming 8 hours = 480 minutes is standard)
    const standardHours = 480;
    this.overtime = Math.max(0, diffInMinutes - standardHours);
  }
  next();
});

// Index for efficient queries
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// Add pagination plugin
attendanceSchema.plugin(mongoosePaginate);

export default mongoose.model('Attendance', attendanceSchema);