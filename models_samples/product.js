import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: String,
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
});

// Add any pre/post hooks or methods if needed
productSchema.pre('find', function() {
  // By default, exclude deleted documents from queries
  if (!this._conditions.includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;
