import {
  parseJsonResponse,
  extractArray,
  numberOr
} from './common.js';

const UNKNOWN = 'unknown';

const normalizeProduct = (raw, index, sourcePrefix) => ({
  id: typeof raw?.id === 'string' && raw.id.trim().length > 0
    ? raw.id
    : `${sourcePrefix}_product_${index + 1}`,
  brand: raw?.brand || UNKNOWN,
  brand_confidence: numberOr(raw?.brand_confidence, 0),
  category: raw?.category || UNKNOWN,
  category_confidence: numberOr(raw?.category_confidence, 0),
  material: raw?.material || UNKNOWN,
  material_confidence: numberOr(raw?.material_confidence, 0),
  cap_color: raw?.cap_color || UNKNOWN,
  cap_color_confidence: numberOr(raw?.cap_color_confidence, 0),
  color: raw?.color || UNKNOWN,
  color_confidence: numberOr(raw?.color_confidence, 0),
  zindex: raw?.zindex || UNKNOWN,
  zindex_confidence: numberOr(raw?.zindex_confidence, 0),
  visible_part: raw?.visible_part !== undefined ? raw.visible_part : 1.0,
  bbox: raw?.bbox || null
});

/**
 * Parses one image response into a normalized product list. The
 * `sourcePrefix` is used to mint stable fallback IDs (e.g. `img1_product_1`).
 */
export const parseMultiObjectImageResponse = (content, sourcePrefix) => {
  const parsed = parseJsonResponse(content);
  const rawProducts = extractArray(parsed);
  return rawProducts.map((raw, index) => normalizeProduct(raw, index, sourcePrefix));
};

/**
 * Parses the v4 capsule-counting response into the exact shape the UI's
 * capsule group panel renders.
 */
export const parseCapsuleGroupResponse = (content) => {
  const parsed = parseJsonResponse(content);

  return {
    approx_count: Number.isFinite(parsed.approx_count) ? parsed.approx_count : null,
    count_range: parsed.count_range || null,
    brand: parsed.brand || UNKNOWN,
    brand_confidence: numberOr(parsed.brand_confidence, 0),
    category: parsed.category || 'coffee_capsule',
    category_confidence: numberOr(parsed.category_confidence, 0),
    material: parsed.material || UNKNOWN,
    material_confidence: numberOr(parsed.material_confidence, 0)
  };
};

/* -------------------------------------------------------------------------- */
/* Merge logic — ported verbatim from MultiObjectIdentification.js so the     */
/* product de-duplication semantics stay identical.                           */
/* -------------------------------------------------------------------------- */

const normalizeString = (str) => (str ? String(str).toLowerCase().trim() : '');

const areSameProduct = (p1, p2) => {
  const brand1 = normalizeString(p1.brand);
  const brand2 = normalizeString(p2.brand);
  const category1 = normalizeString(p1.category);
  const category2 = normalizeString(p2.category);
  const material1 = normalizeString(p1.material);
  const material2 = normalizeString(p2.material);
  const color1 = normalizeString(p1.color);
  const color2 = normalizeString(p2.color);
  const cap_color1 = normalizeString(p1.cap_color);
  const cap_color2 = normalizeString(p2.cap_color);
  const zindex1 = normalizeString(p1.zindex);
  const zindex2 = normalizeString(p2.zindex);

  const brandMatch = brand1 === brand2
    || (brand1 && brand2 && (brand1.includes(brand2) || brand2.includes(brand1)));
  const categoryMatch = category1 === category2;
  const materialMatch = material1 === material2;
  const colorMatch = color1 === color2;
  const cap_colorMatch = cap_color1 === cap_color2;

  const zindexMatch = (zindex1 === 'front' && zindex2 === 'back')
    || (zindex1 === 'back' && zindex2 === 'front')
    || (zindex1 === 'middle' && zindex2 === 'middle')
    || (zindex1 === 'side' && zindex2 === 'side');
  const zindexMatchFrontBack = (zindex1 === 'front' && zindex2 === 'back')
    || (zindex1 === 'back' && zindex2 === 'front');

  if (brandMatch && brand1 !== UNKNOWN
    && categoryMatch && category1 !== UNKNOWN
    && materialMatch && material1 !== UNKNOWN
    && colorMatch && color1 !== UNKNOWN
    && cap_colorMatch && cap_color1 === UNKNOWN) {
    return true;
  }

  if (brandMatch && brand1 !== UNKNOWN
    && categoryMatch && category1 !== UNKNOWN
    && materialMatch && material1 !== UNKNOWN
    && colorMatch && color1 !== UNKNOWN
    && (cap_color1 === UNKNOWN || cap_color2 === UNKNOWN)
    && cap_color1 !== cap_color2) {
    return true;
  }

  if (brandMatch && brand1 === UNKNOWN
    && categoryMatch && category1 !== UNKNOWN
    && materialMatch && material1 !== UNKNOWN
    && colorMatch && color1 !== UNKNOWN
    && cap_colorMatch && cap_color1 === UNKNOWN
    && zindexMatch) {
    return true;
  }

  if (brandMatch && brand1 === UNKNOWN
    && categoryMatch && category1 !== UNKNOWN
    && materialMatch && material1 !== UNKNOWN
    && colorMatch && color1 !== UNKNOWN
    && cap_colorMatch && cap_color1 !== UNKNOWN) {
    return true;
  }

  if (!brandMatch
    && categoryMatch && category1 !== UNKNOWN
    && materialMatch && material1 !== UNKNOWN
    && colorMatch && color1 !== UNKNOWN
    && cap_colorMatch && cap_color1 === UNKNOWN
    && zindexMatchFrontBack) {
    return true;
  }

  return brandMatch && categoryMatch && materialMatch && colorMatch && cap_colorMatch;
};

const mergePair = (a, b, index) => ({
  id: a.id || `merged_${index}`,
  brand: a.brand || b.brand,
  brand_confidence: Math.max(a.brand_confidence || 0, b.brand_confidence || 0),
  category: a.category || b.category,
  category_confidence: Math.max(a.category_confidence || 0, b.category_confidence || 0),
  material: a.material || b.material,
  material_confidence: Math.max(a.material_confidence || 0, b.material_confidence || 0),
  cap_color: a.cap_color || b.cap_color,
  cap_color_confidence: Math.max(a.cap_color_confidence || 0, b.cap_color_confidence || 0),
  color: a.color || b.color,
  color_confidence: Math.max(a.color_confidence || 0, b.color_confidence || 0),
  zindex: a.zindex || b.zindex,
  zindex_confidence: Math.max(a.zindex_confidence || 0, b.zindex_confidence || 0),
  visible_part: Math.max(
    a.visible_part !== undefined ? a.visible_part : 1.0,
    b.visible_part !== undefined ? b.visible_part : 1.0
  ),
  bbox: a.bbox || b.bbox,
  source: 'both_images',
  image1_bbox: a.bbox,
  image2_bbox: b.bbox
});

/**
 * Merge two product lists into a single deduplicated list. Each product in
 * the result carries a `source` field of `both_images`, `image1_only`, or
 * `image2_only`.
 */
export const mergeProducts = (products1, products2) => {
  const merged = [];
  const consumedFromImage2 = new Set();

  products1.forEach((product, index) => {
    const matchIndex = products2.findIndex(
      (p2, i) => !consumedFromImage2.has(i) && areSameProduct(product, p2)
    );

    if (matchIndex >= 0) {
      const matched = products2[matchIndex];
      consumedFromImage2.add(matchIndex);
      merged.push(mergePair(product, matched, index));
    } else {
      merged.push({
        ...product,
        id: product.id || `img1_${index}`,
        source: 'image1_only'
      });
    }
  });

  products2.forEach((product, index) => {
    if (consumedFromImage2.has(index)) return;
    merged.push({
      ...product,
      id: product.id || `img2_${index}`,
      source: 'image2_only'
    });
  });

  return merged;
};
