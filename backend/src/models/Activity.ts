import mongoose, { Schema, Document } from 'mongoose';

interface IActivity extends Document {
  inquiry: mongoose.Types.ObjectId;
  action: 'created' | 'claimed' | 'assigned' | 'reassigned' | 'forwarded_to_sales';
  actor: mongoose.Types.ObjectId;
  targetUser?: mongoose.Types.ObjectId;
  details?: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  inquiry: { type: Schema.Types.ObjectId, ref: 'Inquiry', required: true },
  action: { 
    type: String, 
    enum: ['created', 'claimed', 'assigned', 'reassigned', 'forwarded_to_sales'], 
    required: true 
  },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  details: { type: String, trim: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model<IActivity>('Activity', activitySchema);


