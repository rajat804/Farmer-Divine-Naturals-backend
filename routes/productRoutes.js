import express from 'express';
import upload from '../config/multer.js';
import cloudinary from '../config/cloudinary.js';
import Product from '../models/Product.js';

const router = express.Router();

// ======================
// GET ALL PRODUCTS
// ======================
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })           // Latest products first
      .select('-__v');                   // Remove version field

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

// ======================
// GET SINGLE PRODUCT (Optional but useful)
// ======================
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ======================
// DELETE PRODUCT
// ======================
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product and associated images deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});



// Helper function to upload images to Cloudinary
const uploadImagesToCloudinary = async (files) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'products' },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  });

  return Promise.all(uploadPromises);
};

// CREATE PRODUCT
router.post('/create', upload.array('images', 10), async (req, res) => {
  try {
    const {
      productName,
      productName2,
      organic,
      conventional,
      description,
      uses,
      benefits,
      languages,
      specs,
      container
    } = req.body;

    // Upload images if any
    let imageData = [];
    if (req.files && req.files.length > 0) {
      imageData = await uploadImagesToCloudinary(req.files);
    }

    const newProduct = new Product({
      productName,
      productName2,
      organic: organic === 'true' || organic === true,
      conventional: conventional === 'true' || conventional === true,
      images: imageData,
      description: description || "",
      specs: specs ? JSON.parse(specs) : {},
      container: container ? JSON.parse(container) : { twenty: "22 MT", forty: "26 MT" },
      uses: uses ? JSON.parse(uses).filter(Boolean) : [],
      benefits: benefits ? JSON.parse(benefits).filter(Boolean) : [],
      languages: languages ? JSON.parse(languages) : [],
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully with images",
      product: newProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;