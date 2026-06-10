import { Router } from 'express';

import { singleImageUpload, dualImageUpload } from '../middleware/upload.js';
import { analyzeSingleImage } from '../controllers/singleImage.js';
import { analyzeMultiObject } from '../controllers/multiObject.js';
import { analyzeFoodWaste } from '../controllers/foodWaste.js';
import { analyzeRecyclables } from '../controllers/recyclables.js';

const router = Router();

router.post('/analyze/single', singleImageUpload, analyzeSingleImage);
router.post('/analyze/multi', dualImageUpload, analyzeMultiObject);
router.post('/analyze/food-waste', singleImageUpload, analyzeFoodWaste);
router.post('/analyze/recyclables', singleImageUpload, analyzeRecyclables);

export default router;
