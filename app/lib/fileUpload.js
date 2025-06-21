import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Ensure URLs are HTTPS
});

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer to upload.
 * @param {Object} options - Upload options for Cloudinary.
 * @param {string} options.folder - The folder in Cloudinary to store the file.
 * @param {string} options.public_id - A unique identifier for the file.
 * @returns {Promise<Object>} - A promise that resolves with the Cloudinary upload result.
 */
export async function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    // Create an upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'neetcode_uploads', // Default folder
        public_id: options.public_id,
        // Automatically detect resource type (image, video, raw file)
        resource_type: 'auto', 
      },
      (error, result) => {
        if (error) {
          // If there's an error, reject the promise
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        // If successful, resolve the promise with the result
        resolve(result);
      }
    );

    // Pipe the buffer to the upload stream
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
} 
