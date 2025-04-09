const express = require('express');
const multer = require('multer');
const flowscribeController = require('../controllers/flowscribe');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/upload', flowscribeController.getUpload);
router.post('/upload', upload.single('sourceFile'), flowscribeController.postUpload);

module.exports = router;
