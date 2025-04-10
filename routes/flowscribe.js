const express = require('express');
const router = express.Router();
const multer = require('multer');
const flowscribeController = require('../controllers/flowscribe');

const upload = multer({ dest: 'uploads/' });

router.get('/upload', flowscribeController.getUpload);
router.post('/upload', upload.array('files'), flowscribeController.postUpload);

module.exports = router;
