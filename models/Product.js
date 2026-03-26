import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productName2: {
    type: String,
    trim: true
  },

  organic: {
    type: Boolean,
    default: false
  },
  conventional: {
    type: Boolean,
    default: false
  },

  images: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  }],

  description: {
    type: String
  },

  specs: {
    origin: String,
    harvest: String,
    color: String,
    packaging: String,
    labeling: String,
    shelfLife: String,
    gmo: String,
    specification: String,
  },

  container: {
    twenty: { type: String, default: "22 MT" },
    forty: { type: String, default: "26 MT" },
  },

  uses: [String],
  benefits: [String],

  languages: [{
    language: String,
    value: String
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;