import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const groupUploadsDir = path.join(uploadsDir, 'groups');

// Ensure directories exist
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(groupUploadsDir)) {
    fs.mkdirSync(groupUploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('Error creating uploads directories:', err);
}

/**
 * Save a file to the local filesystem
 * @param {Buffer} buffer - The file buffer
 * @param {Object} options - Upload options
 * @param {string} options.folder - The subfolder within uploads (e.g., 'groups')
 * @param {string} options.filename - The filename to use (will be made unique)
 * @returns {Object} - Object with the file URL
 */
export async function saveFileLocally(buffer, options = {}) {
  try {
    const { folder = 'misc', filename = 'file' } = options;
    
    // Generate unique filename
    const fileExt = path.extname(filename) || '.jpg';
    const baseName = path.basename(filename, fileExt);
    const uniqueFilename = `${baseName}_${uuidv4()}${fileExt}`;
    
    // Create folder path
    const folderPath = path.join(uploadsDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Full path for the file
    const filePath = path.join(folderPath, uniqueFilename);
    
    // Write the file
    fs.writeFileSync(filePath, buffer);
    
    // Return the URL (relative to public directory)
    const fileUrl = `/uploads/${folder}/${uniqueFilename}`;
    
    return {
      secure_url: fileUrl,
      public_id: uniqueFilename,
      success: true
    };
  } catch (error) {
    console.error('Error saving file locally:', error);
    throw error;
  }
} 