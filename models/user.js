import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: Number,
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
});

// Add any pre/post hooks or methods if needed
userSchema.pre('find', function() {
  // By default, exclude deleted documents from queries
  if (!this._conditions.includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const User = mongoose.model('User', userSchema);

export default User;
