import multer from 'multer';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../constants.js';
import { AppError } from '../utils/AppError.js';

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError(
        `Invalid file type for ${file.fieldname}. Allowed types: JPG, PNG, WebP.`,
        400,
        [{ field: `image_${file.fieldname}`, message: 'Use a JPG, PNG or WebP image.' }]
      ),
      false
    );
  }
  cb(null, true);
}

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_BYTES,
  },
  fileFilter,
});

export const productUploadMiddleware = multerUpload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 },
]);

export function handleProductUpload(req, res, next) {
  productUploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            `Image size exceeds maximum allowed size of 5 MB.`,
            400,
            [{ field: `image_${err.field || 'upload'}`, message: 'This image is larger than 5 MB.' }]
          )
        );
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(err);
    }
    next();
  });
}
