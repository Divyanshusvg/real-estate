import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';
// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/public/temp'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1e6); // Random number between 0 and 999999
    const uniqueSuffix = `${timestamp}-${randomNum}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/public/temp/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1e6); // Random number between 0 and 999999
    const uniqueSuffix = `${timestamp}-${randomNum}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif','image/svg','image/avif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
    cb(null, true);
  }
});

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mkv', 'video/avi']; // Add other video formats if needed
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Invalid file type. Only MP4, MKV, and AVI are allowed.'));
    }
    cb(null, true);
  }
});

export const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        statusCode: 400,
        data: null,
        success: false,
        errors: `File size exceeds the limit of ${err.limit} bytes.`
      });
    }
    // Handle other Multer errors here if needed
    return res.status(400).json({
      statusCode: 400,
      data: null,
      success: false,
      errors: `Multer error: ${err.message}`
    });
  }
  // Handle other errors that are not Multer errors
  next(err);
};




