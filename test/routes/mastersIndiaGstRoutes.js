/**
 * Masters India GST API proxy routes (GSTIN-scoped).
 */
const { Router } = require('express');
const {
    handleGetGstrData,
    handleUploadGstr3b,
    handleUploadGstr1,
    handlePeriodDefault,
} = require('../controllers/mastersIndiaGstController');

const router = Router();

router.get('/gst/masters-india/period-default', handlePeriodDefault);
router.get('/gst/masters-india/data', handleGetGstrData);
router.post('/gst/masters-india/upload-gstr3b', handleUploadGstr3b);
router.post('/gst/masters-india/upload-gstr1', handleUploadGstr1);

module.exports = router;
