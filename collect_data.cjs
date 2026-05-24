const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ASIN = 'B07PQFT83F';
const PRODUCT_URL = `https://www.amazon.com/dp/${ASIN}`;
const MARKETPLACE = 'US';
const TODAY = new Date().toISOString().split('T')[0];
const OUTPUT_DIR = path.join(__dirname, 'reports', `${TODAY}_${ASIN}`);

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractProductInfo(page) {
  console.log('=== Extracting product info ===');
  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(3000);

  // Scroll to trigger lazy loading
  await page.evaluate(() => window.scrollTo(0, 500));
  await sleep(2000);

  const productData = await page.evaluate(() => {
    const data = {};

    // Title
    const titleEl = document.getElementById('productTitle');
    data.title = titleEl ? titleEl.innerText.trim() : 'N/A';

    // Price
    const priceWhole = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction');
    data.price = 'N/A';
    if (priceWhole) {
      data.price = priceWhole.innerText.trim();
      if (priceFraction) data.price += '.' + priceFraction.innerText.trim();
    }

    // Also check for other price formats
    const priceOffscreen = document.querySelector('.a-price .a-offscreen');
    if (data.price === 'N/A' && priceOffscreen) {
      data.price = priceOffscreen.innerText.trim();
    }

    // Rating
    const ratingEl = document.querySelector('.a-icon-star .a-icon-alt');
    data.rating = ratingEl ? ratingEl.innerText.trim() : 'N/A';

    // Review count
    const reviewCountEl = document.getElementById('acrCustomerReviewText');
    data.reviewCount = reviewCountEl ? reviewCountEl.innerText.trim() : 'N/A';

    // Brand/Byline
    const bylineEl = document.getElementById('bylineInfo');
    data.brand = bylineEl ? bylineEl.innerText.trim() : 'N/A';

    // Bullet points
    const bulletPoints = document.querySelectorAll('#feature-bullets ul li span');
    data.bulletPoints = [];
    bulletPoints.forEach(bp => {
      const text = bp.innerText.trim();
      if (text) data.bulletPoints.push(text);
    });

    // Image count (exclude video thumbnails)
    const altImages = document.querySelectorAll('#altImages img');
    data.imageCount = 0;
    data.hasVideo = false;
    altImages.forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src.includes('.SS40') || src.includes('SX')) {
        // Could be a video thumbnail
      } else {
        data.imageCount++;
      }
    });

    // Check for video
    const videoThumbs = document.querySelectorAll('img[src*="video"]');
    data.hasVideo = videoThumbs.length > 0;

    // A+ Content
    const aplusEl = document.querySelector('#aplus') || document.querySelector('.aplus-v2');
    data.hasAPlus = !!aplusEl;
    if (aplusEl) {
      data.aplusText = aplusEl.innerText.substring(0, 1500).trim();
    } else {
      data.aplusText = 'N/A';
    }

    // Product details table
    const detailTables = document.querySelectorAll('table.productDetails, table.a-keyvalue');
    data.productDetails = {};
    detailTables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (th && td) {
          data.productDetails[th.innerText.trim()] = td.innerText.trim();
        }
      });
    });

    // Also get details from detail bullet points
    const detailBullets = document.querySelectorAll('#detailBullets_feature_div li span');
    detailBullets.forEach(span => {
      const text = span.innerText.trim();
      if (text.includes(':')) {
        const colonIdx = text.indexOf(':');
        const key = text.substring(0, colonIdx).trim();
        const val = text.substring(colonIdx + 1).trim();
        data.productDetails[key] = val;
      }
    });

    // BSR - look for Best Sellers Rank
    const bsrEl = document.querySelector('#productDetails_detailBullets_sections1 tr:has(th:contains("Best Sellers Rank")) td, #detailBullets_feature_div li:contains("Best Sellers Rank")');
    data.bsr = 'N/A';
    const allText = document.body.innerText;
    const bsrMatch = allText.match(/Best Sellers Rank[^]*?(?:#[\d,]+[^]*?in[\s]*[^(]+)/);
    if (bsrMatch) {
      data.bsr = bsrMatch[0].trim().substring(0, 200);
    }

    // Category breadcrumb
    const breadcrumbs = document.querySelectorAll('#wayfinding-breadcrumbs_container a, #wayfinding-breadcrumbs_feature_div a');
    data.breadcrumbs = [];
    breadcrumbs.forEach(a => {
      data.breadcrumbs.push(a.innerText.trim());
    });

    // Important information / warnings
    const warningsEl = document.querySelector('#importantInformation_feature_div');
    data.warnings = warningsEl ? warningsEl.innerText.trim().substring(0, 500) : 'N/A';

    // Feature details (dimensions, weight, etc.)
    const featureDetails = document.querySelectorAll('#productDetails_techSpec_section_1 tr');
    featureDetails.forEach(row => {
      const th = row.querySelector('th');
      const td = row.querySelector('td');
      if (th && td) {
        data.productDetails[th.innerText.trim()] = td.innerText.trim();
      }
    });

    return data;
  });

  return productData;
}

async function extractReviews(page) {
  console.log('=== Extracting reviews ===');
  const reviews = { all: [], positive: [], negative: [], critical: [], recent: [] };

  // Try to get reviews from the main page first
  try {
    // Scroll to reviews section
    await page.evaluate(() => {
      const reviewsEl = document.querySelector('#customerReviews');
      if (reviewsEl) reviewsEl.scrollIntoView();
    });
    await sleep(2000);

    const mainReviews = await page.evaluate(() => {
      const reviews = [];
      const reviewEls = document.querySelectorAll('[data-hook="review"]');
      reviewEls.forEach(el => {
        const body = el.querySelector('[data-hook="review-body"] span');
        const date = el.querySelector('[data-hook="review-date"]');
        const rating = el.querySelector('.a-icon-star .a-icon-alt');
        const author = el.querySelector('.a-profile-name');
        const verified = el.querySelector('[data-hook="avp-badge"]');
        const helpful = el.querySelector('[data-hook="helpful-vote-statement"]');
        const formatStrip = el.querySelector('[data-hook="format-strip"]');

        reviews.push({
          body: body ? body.innerText.trim().substring(0, 300) : 'N/A',
          date: date ? date.innerText.trim() : 'N/A',
          rating: rating ? rating.innerText.trim() : 'N/A',
          author: author ? author.innerText.trim() : 'N/A',
          verified: !!verified,
          helpful: helpful ? helpful.innerText.trim() : '0',
          variant: formatStrip ? formatStrip.innerText.trim() : 'N/A'
        });
      });
      return reviews;
    });

    reviews.all = mainReviews;

  } catch (e) {
    console.log('Error extracting main reviews:', e.message);
  }

  // Try to get star distribution
  try {
    const starDist = await page.evaluate(() => {
      const dist = {};
      const histoBars = document.querySelectorAll('.a-star-bar-breakdown');
      histoBars.forEach(bar => {
        // Try to find star percentage
      });
      // Alternative: look for text pattern like "86%"
      const bodyText = document.body.innerText;
      const patterns = bodyText.match(/(\d+)%(?:\s*\([\d,]+\))?/g);
      if (patterns) {
        dist.percentages = patterns.slice(0, 5);
      }
      return dist;
    });
    reviews.starDistribution = starDist;
  } catch (e) {
    console.log('Error extracting star distribution:', e.message);
  }

  return reviews;
}

async function keywordResearch(page) {
  console.log('=== Keyword Research ===');
  const keywords = [
    'buzz lightyear toy',
    'buzz lightyear action figure',
    'disney pixar lightyear toy',
    'talking action figure toy',
    'interactive buzz lightyear'
  ];

  const results = [];

  for (const kw of keywords) {
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(kw)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await sleep(2000);

      const searchData = await page.evaluate(() => {
        const data = {};

        // Search results count
        const bodyText = document.body.innerText;
        const resultMatch = bodyText.match(/([\d,]+)\s*(?:results|result)/i);
        data.totalResults = resultMatch ? resultMatch[1] : 'N/A';

        // Top products
        const products = [];
        const items = document.querySelectorAll('[data-asin]');
        items.forEach(item => {
          const asin = item.getAttribute('data-asin');
          if (asin && asin.length === 10) {
            const title = item.querySelector('h2 a, h2 span');
            const price = item.querySelector('.a-price .a-offscreen');
            const rating = item.querySelector('.a-icon-star .a-icon-alt');
            const reviews = item.querySelector('.a-size-small .a-size-base');
            products.push({
              asin,
              title: title ? title.innerText.trim().substring(0, 100) : 'N/A',
              price: price ? price.innerText.trim() : 'N/A',
              rating: rating ? rating.innerText.trim() : 'N/A',
              reviews: reviews ? reviews.innerText.trim() : 'N/A'
            });
          }
        });

        data.products = products.slice(0, 10);
        return data;
      });

      results.push({
        keyword: kw,
        totalResults: searchData.totalResults,
        products: searchData.products
      });

      console.log(`Keyword "${kw}": ${searchData.totalResults} results`);
    } catch (e) {
      console.log(`Error searching keyword "${kw}":`, e.message);
      results.push({ keyword: kw, totalResults: 'Error', products: [] });
    }
  }

  return results;
}

async function findCompetitors(page) {
  console.log('=== Finding Competitors ===');
  const competitors = [];

  // Search for the main keyword to find direct competitors
  try {
    await page.goto(`https://www.amazon.com/s?k=buzz+lightyear+talking+action+figure`, {
      waitUntil: 'networkidle', timeout: 60000
    });
    await sleep(2000);

    const competitorASINs = await page.evaluate(() => {
      const asins = [];
      const items = document.querySelectorAll('[data-asin]');
      items.forEach(item => {
        const asin = item.getAttribute('data-asin');
        if (asin && asin.length === 10 && asin !== 'B07PQFT83F') {
          asins.push(asin);
        }
      });
      return asins.slice(0, 5); // Get top 5 competitors
    });

    console.log(`Found ${competitorASINs.length} potential competitor ASINs`);

    for (const compASIN of competitorASINs) {
      try {
        await page.goto(`https://www.amazon.com/dp/${compASIN}`, {
          waitUntil: 'networkidle', timeout: 60000
        });
        await sleep(2000);

        const compData = await page.evaluate((asin) => {
          const data = { asin };

          data.title = document.getElementById('productTitle') ? document.getElementById('productTitle').innerText.trim() : 'N/A';

          const priceWhole = document.querySelector('.a-price-whole');
          const priceFraction = document.querySelector('.a-price-fraction');
          data.price = 'N/A';
          if (priceWhole) {
            data.price = priceWhole.innerText.trim();
            if (priceFraction) data.price += '.' + priceFraction.innerText.trim();
          }
          const priceOffscreen = document.querySelector('.a-price .a-offscreen');
          if (data.price === 'N/A' && priceOffscreen) data.price = priceOffscreen.innerText.trim();

          const ratingEl = document.querySelector('.a-icon-star .a-icon-alt');
          data.rating = ratingEl ? ratingEl.innerText.trim() : 'N/A';

          const reviewCountEl = document.getElementById('acrCustomerReviewText');
          data.reviewCount = reviewCountEl ? reviewCountEl.innerText.trim() : 'N/A';

          const bulletPoints = document.querySelectorAll('#feature-bullets ul li span');
          data.bulletPoints = [];
          bulletPoints.forEach(bp => {
            const text = bp.innerText.trim();
            if (text) data.bulletPoints.push(text);
          });

          // Product details
          data.productDetails = {};
          const detailBullets = document.querySelectorAll('#detailBullets_feature_div li span');
          detailBullets.forEach(span => {
            const text = span.innerText.trim();
            if (text.includes(':')) {
              const colonIdx = text.indexOf(':');
              data.productDetails[text.substring(0, colonIdx).trim()] = text.substring(colonIdx + 1).trim();
            }
          });

          // BSR
          const allText = document.body.innerText;
          const bsrMatch = allText.match(/Best Sellers Rank[^]*?(?:#[\d,]+[^]*?in[\s]*[^(]+)/);
          data.bsr = bsrMatch ? bsrMatch[0].trim().substring(0, 200) : 'N/A';

          // Brand
          const bylineEl = document.getElementById('bylineInfo');
          data.brand = bylineEl ? bylineEl.innerText.trim() : 'N/A';

          // A+ Content
          const aplusEl = document.querySelector('#aplus') || document.querySelector('.aplus-v2');
          data.hasAPlus = !!aplusEl;

          return data;
        }, compASIN);

        competitors.push(compData);
        console.log(`Competitor ${compASIN}: ${compData.title?.substring(0, 50)}...`);
      } catch (e) {
        console.log(`Error extracting competitor ${compASIN}:`, e.message);
      }
    }
  } catch (e) {
    console.log('Error in competitor search:', e.message);
  }

  return competitors;
}

async function extractImages(page) {
  console.log('=== Extracting Image Info ===');

  const imageData = await page.evaluate(() => {
    const images = [];
    const imgEls = document.querySelectorAll('#altImages img');
    imgEls.forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt');
      if (src && !src.includes('.SS40') && alt !== 'Video Player') {
        images.push({ src, alt: alt || '' });
      }
    });

    // Main image
    const mainImg = document.getElementById('landingImage');
    const mainSrc = mainImg ? mainImg.getAttribute('src') : 'N/A';

    return { mainImage: mainSrc, altImages: images };
  });

  return imageData;
}

async function main() {
  console.log(`Starting data collection for ASIN: ${ASIN}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const allData = {};

  try {
    // Step 1: Extract product info
    allData.productInfo = await extractProductInfo(page);
    console.log('Product info extracted successfully');

    // Step 2: Extract reviews
    allData.reviews = await extractReviews(page);
    console.log('Reviews extracted');

    // Step 3: Extract images
    allData.images = await extractImages(page);
    console.log('Images info extracted');

    // Step 4: Keyword research
    allData.keywords = await keywordResearch(page);
    console.log('Keyword research completed');

    // Step 5: Find competitors
    allData.competitors = await findCompetitors(page);
    console.log(`Competitor analysis completed: ${allData.competitors.length} competitors`);

    // Save raw data
    const rawDataPath = path.join(OUTPUT_DIR, 'raw_data.json');
    fs.writeFileSync(rawDataPath, JSON.stringify(allData, null, 2));
    console.log(`Raw data saved to ${rawDataPath}`);

  } catch (e) {
    console.error('Error during data collection:', e);
  } finally {
    await browser.close();
  }

  return allData;
}

main()
  .then(data => {
    console.log('\n=== Data Collection Complete ===');
    console.log(`Product title: ${data.productInfo?.title?.substring(0, 80)}`);
    console.log(`Price: ${data.productInfo?.price}`);
    console.log(`Rating: ${data.productInfo?.rating}`);
    console.log(`Reviews: ${data.productInfo?.reviewCount}`);
    console.log(`Competitors found: ${data.competitors?.length}`);
    console.log(`Keywords searched: ${data.keywords?.length}`);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
