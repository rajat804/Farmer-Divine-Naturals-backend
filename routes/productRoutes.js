import express from 'express';
import upload from '../config/multer.js';
import cloudinary from '../config/cloudinary.js';
import Product from '../models/Product.js';

const router = express.Router();

// Helper function for Cloudinary upload
const uploadImagesToCloudinary = async (files) => {
  const promises = files.map(file => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'products' }, (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }).end(file.buffer);
    });
  });
  return Promise.all(promises);
};

// ============== SPECIFIC ROUTES MUST COME FIRST ==============

// DELETE SINGLE IMAGE - This MUST come before any route with :id
router.delete('/:id/image/:public_id', async (req, res) => {
  console.log('=== DELETE IMAGE ROUTE HIT ===');
  console.log('Product ID:', req.params.id);
  console.log('Public ID:', req.params.public_id);
  
  try {
    const { id, public_id } = req.params;
    
    // Decode the public_id if it contains special characters
    const decodedPublicId = decodeURIComponent(public_id);
    
    // Validate input
    if (!id || !public_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID and Image Public ID are required' 
      });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      console.log('Product not found:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    console.log('Found product:', product.productName);
    console.log('Current images:', product.images.map(img => img.public_id));
    console.log('Looking for image:', decodedPublicId);

    // Check if image exists in product
    const imageIndex = product.images.findIndex(img => img.public_id === decodedPublicId);
    if (imageIndex === -1) {
      console.log('Image not found in product:', decodedPublicId);
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found in product' 
      });
    }

    // Delete from Cloudinary
    try {
      const cloudinaryResult = await cloudinary.uploader.destroy(decodedPublicId);
      console.log('Cloudinary deletion result:', cloudinaryResult);
      
      if (cloudinaryResult.result !== 'ok') {
        console.warn('Cloudinary deletion may have failed:', cloudinaryResult);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Remove from database
    product.images.splice(imageIndex, 1);
    await product.save();

    console.log(`Image deleted successfully. Remaining images: ${product.images.length}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      remainingImages: product.images,
      remainingCount: product.images.length
    });

  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete image'
    });
  }
});

// GET ALL PRODUCTS
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET SINGLE PRODUCT - This comes after specific routes
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE PRODUCT
router.post('/create', upload.array('images', 10), async (req, res) => {
  try {
    const { productName, productName2, organic, conventional, description, uses, benefits, languages, specs, container } = req.body;

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

    res.status(201).json({ success: true, message: "Product created", product: newProduct });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE PRODUCT
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { productName, productName2, organic, conventional, description, uses, benefits, languages, specs, container } = req.body;

    // Update basic fields
    if (productName) product.productName = productName;
    if (productName2 !== undefined) product.productName2 = productName2;
    product.organic = organic === 'true' || organic === true;
    product.conventional = conventional === 'true' || conventional === true;
    if (description !== undefined) product.description = description;

    // Update JSON fields
    if (specs) product.specs = JSON.parse(specs);
    if (container) product.container = JSON.parse(container);
    if (uses) product.uses = JSON.parse(uses).filter(Boolean);
    if (benefits) product.benefits = JSON.parse(benefits).filter(Boolean);
    if (languages) product.languages = JSON.parse(languages);

    // Add new images
    if (req.files && req.files.length > 0) {
      const newImages = await uploadImagesToCloudinary(req.files);
      product.images = [...product.images, ...newImages];
    }

    await product.save();
    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE ENTIRE PRODUCT - MUST BE LAST
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map(image => 
        image.public_id ? cloudinary.uploader.destroy(image.public_id).catch(console.error) : Promise.resolve()
      );
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Product and images deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;