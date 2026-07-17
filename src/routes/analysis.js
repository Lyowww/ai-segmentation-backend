import { Router } from 'express';

import {
  singleImageUpload,
  dualImageUpload,
  multiImage1Upload,
  multiImage2Upload,
  optionalMultipart
} from '../middleware/upload.js';
import { analyzeSingleImage } from '../controllers/singleImage.js';
import {
  analyzeMultiObject,
  analyzeMultiObjectImage1,
  analyzeMultiObjectImage2
} from '../controllers/multiObject.js';
import { analyzeFoodWaste } from '../controllers/foodWaste.js';
import { analyzeRecyclables } from '../controllers/recyclables.js';

const router = Router();

router.post('/analyze/single', optionalMultipart(singleImageUpload), analyzeSingleImage);
router.post('/analyze/multi/image1', optionalMultipart(multiImage1Upload), analyzeMultiObjectImage1);
router.post('/analyze/multi/image2', optionalMultipart(multiImage2Upload), analyzeMultiObjectImage2);
router.post('/analyze/multi', optionalMultipart(dualImageUpload), analyzeMultiObject);
router.post('/analyze/food-waste', optionalMultipart(singleImageUpload), analyzeFoodWaste);
router.post('/analyze/recyclables', optionalMultipart(singleImageUpload), analyzeRecyclables);

export default router;
