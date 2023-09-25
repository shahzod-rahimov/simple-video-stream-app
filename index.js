const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 7788;

const maxSize = 100 * 1000_000;

const storage = multer.diskStorage({
  destination: path.resolve(path.basename("/"), "uploads"),
  // Rename the uploaded file with a timestamp
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "video/mp4") {
      cb(null, true);
    } else {
      cb(new Error("Invalid mimetype"));
    }
  },
});

const uploadVideo = upload.single("video");

// Upload video
app.post("/upload", async (req, res) => {
  uploadVideo(req, res, (err) => {
    if (err) {
      return res.status(400).send({ success: false, message: err.message });
    }

    // Everything went fine.
    const file = req.file;
    res.status(200).send({
      success: true,
      message: "Video uploaded successfully!",
      video_path: `http://localhost:7788/stream/${file.filename}`,
    });
  });
});

// Stream video
app.get("/stream/:name", (req, res) => {
  const videoPath = `uploads/${req.params.name}`;

  const videoStat = fs.statSync(videoPath);

  const fileSize = videoStat.size;

  const videoRange = req.headers.range;

  if (videoRange) {
    const parts = videoRange.replace(/bytes=/, "").split("-");

    const start = parseInt(parts[0], 10);

    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;

    const file = fs.createReadStream(videoPath, { start, end });

    const header = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,

      "Accept-Ranges": "bytes",

      "Content-Length": chunksize,

      "Content-Type": "video/mp4",
    };

    res.writeHead(206, header);

    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,

      "Content-Type": "video/mp4",
    };

    res.writeHead(200, head);

    fs.createReadStream(videoPath).pipe(res);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  return res.status(500).json({ success: false, message: "Unexpected error" });
});

app.listen(PORT, () => console.log(`Server running on PORT -> ${PORT}`));