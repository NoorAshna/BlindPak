const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (filePath) => {
  try {
    // Process image with sharp (strip metadata, resize)
    const buffer = await sharp(filePath)
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
      .withMetadata({ density: undefined }) // Strip metadata
      .toBuffer();

    // Upload to Cloudinary using stream
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });

  } catch (error) {
    throw error;
  } finally {
      // Clean up temp file
      if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
      }
  }
};

module.exports = { uploadImage };
