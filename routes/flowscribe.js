const express = require('express');
const router = express.Router();
const multer = require('multer');
const flowscribeController = require('../controllers/flowscribe');

const upload = multer({ dest: 'uploads/' });

router.get('/upload', flowscribeController.getUpload);
router.post('/upload', upload.array('files'), flowscribeController.postUpload);
router.post('/filter', flowscribeController.postFilter); // ✅ 꼭 추가
module.exports = router;
