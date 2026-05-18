import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://easyshop-mongodb:27017/easyshop';
const scriptDir = path.resolve(path.dirname(''));

const productSchema = new mongoose.Schema({
  _id: { type: String },
  originalId: { type: String },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  oldPrice: Number,
  categories: [String],
  image: [String],
  rating: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  shop_category: { type: String, required: true },
  unit_of_measure: String,
  colors: [String],
  sizes: [String]
}, {
  timestamps: true,
  _id: false
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

function getImagePath(originalPath: string, shopCategory: string): string {
  const fileName = path.basename(originalPath);
  const categoryMap: { [key: string]: string } = {
    electronics: 'gadgetsImages',
    medicine: 'medicineImages',
    grocery: 'groceryImages',
    clothing: 'clothingImages',
    furniture: 'furnitureImages',
    books: 'books',
    beauty: 'makeupImages',
    snacks: 'groceryImages',
    bakery: 'bakeryImages',
    bags: 'bagsImages'
  };
  
  const imageDir = categoryMap[shopCategory] || shopCategory + 'Images';
  return `/${imageDir}/${fileName}`;
}

async function migrateData() {
  try {
    console.log('Attempting to connect to MongoDB at:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Successfully connected to MongoDB');

    const projectRoot = path.resolve(__dirname, '..');
    
    const jsonData = await fs.readFile(
      path.join(projectRoot, '.db', 'db.json'),
      'utf-8'
    );
    const data = JSON.parse(jsonData);

    await Product.deleteMany({});
    console.log('Cleared existing products');

    const usedIds = new Set<string>();

    const products = data.products.map((product: any) => {
      let paddedId = product.id.padStart(10, '0');
      while (usedIds.has(paddedId)) {
        const num = parseInt(paddedId);
        paddedId = (num + 1).toString().padStart(10, '0');
      }
      usedIds.add(paddedId);

      const fixedImages = product.image.map((img: string) => 
        getImagePath(img, product.shop_category)
      );

      return {
        _id: paddedId,
        originalId: paddedId,
        ...product,
        image: fixedImages
      };
    });

    await Product.insertMany(products);
    console.log(`Migrated ${products.length} products`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();
