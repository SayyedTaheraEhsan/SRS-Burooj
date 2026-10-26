
const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");
const db = require("../db");

const router = express.Router();

// Cloudinary configuration from backend .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Keep the local uploads folder for existing media.
// New uploads will go to Cloudinary.
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store uploaded files in memory before sending them to Cloudinary.
const storage = multer.memoryStorage();

const allowedImages = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const allowedVideos = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const fileFilter = (req, file, cb) => {
  if (
    allowedImages.includes(file.mimetype) ||
    allowedVideos.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  return cb(
    new Error("Only JPG, PNG, WEBP images and supported video files are allowed.")
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// Upload a file buffer to Cloudinary.
const uploadToCloudinary = (file, projectId, mediaType) => {
  return new Promise((resolve, reject) => {
    const isVideo = mediaType === "video";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `srs-burooj/projects/${projectId}`,
        resource_type: isVideo ? "video" : "image",
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result || !result.secure_url || !result.public_id) {
          return reject(new Error("Cloudinary did not return a valid upload URL."));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    stream.on("error", reject);
    stream.end(file.buffer);
  });
};

// Identify Cloudinary assets from their stored delivery URLs.
// Old /uploads/... URLs are deliberately left untouched.
const getCloudinaryAsset = (mediaUrl) => {
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    return null;
  }

  try {
    const parsedUrl = new URL(mediaUrl);
    const isCloudinary = parsedUrl.hostname === "res.cloudinary.com";

    if (!isCloudinary) {
      return null;
    }

    const match = parsedUrl.pathname.match(
      /\/(image|video|raw)\/upload\/(?:[^/]+\/)*(v\d+\/)?(.+)$/
    );

    if (!match) {
      return null;
    }

    let publicId = match[3];

    // Remove file extension from the public ID.
    publicId = publicId.replace(/\.[^/.]+$/, "");

    if (!publicId) {
      return null;
    }

    return {
      publicId,
      resourceType: match[1] === "raw" ? "raw" : match[1],
    };
  } catch (error) {
    console.error("Could not parse Cloudinary URL:", error.message);
    return null;
  }
};

// Delete an asset only if its URL belongs to Cloudinary.
const deleteCloudinaryAsset = async (mediaUrl) => {
  const asset = getCloudinaryAsset(mediaUrl);

  if (!asset) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true,
    });
  } catch (error) {
    // Keep database operations independent from cleanup failures.
    console.error("Cloudinary cleanup failed:", error.message || error);
  }
};

// GET PROJECT MEDIA
router.get("/:projectId", (req, res) => {
  const sql = `
    SELECT *
    FROM project_media
    WHERE project_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [req.params.projectId], (err, results) => {
    if (err) {
      console.error("Error fetching project media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch project media",
      });
    }

    return res.json({
      success: true,
      media: results,
    });
  });
});

// UPLOAD PROJECT PHOTOS
router.post(
  "/:projectId/photos",
  authenticateAdmin,
  upload.array("photos", 20),
  async (req, res) => {
    const projectId = req.params.projectId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo.",
      });
    }

    const uploadedAssets = [];

    try {
      for (const file of req.files) {
        const asset = await uploadToCloudinary(
          file,
          projectId,
          "photo"
        );

        uploadedAssets.push(asset);
      }
    } catch (error) {
      console.error("Cloudinary photo upload failed:", error.message || error);

      // Clean up assets uploaded during this failed request.
      await Promise.all(
        uploadedAssets.map((asset) =>
          cloudinary.uploader
            .destroy(asset.publicId, {
              resource_type: asset.resourceType,
            })
            .catch((cleanupError) => {
              console.error("Failed to clean up photo:", cleanupError.message);
            })
        )
      );

      return res.status(502).json({
        success: false,
        message: "Photo upload failed. Please check Cloudinary configuration and try again.",
      });
    }

    const values = uploadedAssets.map((asset) => [
      projectId,
      "photo",
      asset.url,
    ]);

    const sql = `
      INSERT INTO project_media
      (project_id, media_type, media_url)
      VALUES ?
    `;

    db.query(sql, [values], async (err) => {
      if (err) {
        console.error("Error saving project photos:", err);

        await Promise.all(
          uploadedAssets.map((asset) =>
            cloudinary.uploader
              .destroy(asset.publicId, {
                resource_type: asset.resourceType,
              })
              .catch((cleanupError) => {
                console.error("Failed to clean up photo:", cleanupError.message);
              })
          )
        );

        return res.status(500).json({
          success: false,
          message: "Photos uploaded but database saving failed.",
        });
      }

      return res.json({
        success: true,
        message: "Project photos uploaded successfully",
      });
    });
  }
);

// UPLOAD / REPLACE PROJECT VIDEO
router.post(
  "/:projectId/video",
  authenticateAdmin,
  upload.single("video"),
  async (req, res) => {
    const projectId = req.params.projectId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a video.",
      });
    }

    let newAsset;

    try {
      newAsset = await uploadToCloudinary(
        req.file,
        projectId,
        "video"
      );
    } catch (error) {
      console.error("Cloudinary video upload failed:", error.message || error);

      return res.status(502).json({
        success: false,
        message: "Video upload failed. Please check Cloudinary configuration and try again.",
      });
    }

    const selectSql = `
      SELECT *
      FROM project_media
      WHERE project_id = ?
      AND media_type = 'video'
    `;

    db.query(selectSql, [projectId], (err, existingVideos) => {
      if (err) {
        console.error("Error checking existing video:", err);

        cloudinary.uploader
          .destroy(newAsset.publicId, {
            resource_type: newAsset.resourceType,
          })
          .catch((cleanupError) => {
            console.error("Failed to clean up new video:", cleanupError.message);
          });

        return res.status(500).json({
          success: false,
          message: "Failed to check existing video",
        });
      }

      const deleteSql = `
        DELETE FROM project_media
        WHERE project_id = ?
        AND media_type = 'video'
      `;

      db.query(deleteSql, [projectId], (deleteErr) => {
        if (deleteErr) {
          console.error("Error deleting old project video records:", deleteErr);

          cloudinary.uploader
            .destroy(newAsset.publicId, {
              resource_type: newAsset.resourceType,
            })
            .catch((cleanupError) => {
              console.error("Failed to clean up new video:", cleanupError.message);
            });

          return res.status(500).json({
            success: false,
            message: "Failed to replace project video",
          });
        }

        const insertSql = `
          INSERT INTO project_media
          (project_id, media_type, media_url)
          VALUES (?, 'video', ?)
        `;

        db.query(
          insertSql,
          [projectId, newAsset.url],
          async (insertErr) => {
            if (insertErr) {
              console.error("Error saving project video:", insertErr);

              cloudinary.uploader
                .destroy(newAsset.publicId, {
                  resource_type: newAsset.resourceType,
                })
                .catch((cleanupError) => {
                  console.error("Failed to clean up new video:", cleanupError.message);
                });

              return res.status(500).json({
                success: false,
                message: "Failed to save project video",
              });
            }

            // Remove old Cloudinary videos after the replacement is saved.
            // Legacy /uploads/... files are intentionally preserved.
            await Promise.all(
              existingVideos.map((video) =>
                deleteCloudinaryAsset(video.media_url)
              )
            );

            return res.json({
              success: true,
              message: "Project video uploaded successfully",
            });
          }
        );
      });
    });
  }
);

// DELETE MEDIA
router.delete("/:mediaId", authenticateAdmin, (req, res) => {
  const selectSql = `
    SELECT *
    FROM project_media
    WHERE id = ?
  `;

  db.query(selectSql, [req.params.mediaId], (err, results) => {
    if (err) {
      console.error("Error finding media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to find media",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const media = results[0];

    const deleteSql = `
      DELETE FROM project_media
      WHERE id = ?
    `;

    db.query(deleteSql, [req.params.mediaId], async (deleteErr) => {
      if (deleteErr) {
        console.error("Error deleting media:", deleteErr);

        return res.status(500).json({
          success: false,
          message: "Failed to delete media",
        });
      }

      // Delete Cloudinary assets only.
      // Local legacy files remain untouched.
      await deleteCloudinaryAsset(media.media_url);

      return res.json({
        success: true,
        message: "Media deleted successfully",
      });
    });
  });
});

// Handle upload validation and Multer errors.
router.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  console.error("Project media request error:", err.message || err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File size must not exceed 50 MB."
          : err.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Project media request failed.",
  });
});

module.exports = router;