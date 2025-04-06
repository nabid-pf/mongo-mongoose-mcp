export default {
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: String,
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
};
