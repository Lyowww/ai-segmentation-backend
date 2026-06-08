import { Router } from 'express';

import {
  singleImageUpload,
  dualImageUpload,
  optionalMultipart
} from '../middleware/upload.js';
import { analyzeSingleImage } from '../controllers/singleImage.js';
import { analyzeMultiObject } from '../controllers/multiObject.js';
import { analyzeFoodWaste } from '../controllers/foodWaste.js';
import { analyzeRecyclables } from '../controllers/recyclables.js';

const router = Router();

router.post('/analyze/single', optionalMultipart(singleImageUpload), analyzeSingleImage);
router.post('/analyze/multi', optionalMultipart(dualImageUpload), analyzeMultiObject);
router.post('/analyze/food-waste', optionalMultipart(singleImageUpload), analyzeFoodWaste);
router.post('/analyze/recyclables', optionalMultipart(singleImageUpload), analyzeRecyclables);

export default router;
