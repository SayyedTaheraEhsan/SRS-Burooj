const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateAdmin = require("../middleware/adminAuth");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "website");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "-");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".webm",
  ".mov",
]);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      allowedExtensions.has(extension) &&
      allowedMimeTypes.has(file.mimetype)
    ) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP, MP4, WEBM and MOV files are allowed."
      )
    );
  },
});

router.post(
  "/upload",
  authenticateAdmin,
  upload.single("media"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file was uploaded.",
        });
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/website/${req.file.filename}`;

      return res.status(201).json({
        success: true,
        message: "Website media uploaded successfully.",
        url: fileUrl,
        fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      console.error("Website media upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to upload website media.",
      });
    }
  }
);

router.use((error, _req, res, _next) => {
  console.error("Website media route error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size must not exceed 50 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid website media file.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Website media upload failed.",
  });
});

module.exports = router;


