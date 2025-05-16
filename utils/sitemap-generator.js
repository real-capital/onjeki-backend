// utils/sitemap-generator.js
import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import PropertyModel from '../../models/property.model.js';

export const generateSitemap = async () => {
  try {
    const smStream = new SitemapStream({
      hostname: process.env.WEBSITE_URL,
    });
    const pipeline = smStream.pipe(createGzip());

    // Add static pages
    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/search', changefreq: 'daily', priority: 0.8 });

    // Add dynamic property pages
    const properties = await PropertyModel.find({ listStatus: 'APPROVED' }).select(
      '_id updatedAt'
    );

    properties.forEach((property) => {
      smStream.write({
        url: `/property/${property._id}`,
        changefreq: 'daily',
        priority: 0.7,
        lastmod: property.updatedAt.toISOString(),
      });
    });

    smStream.end();
    return await streamToPromise(pipeline);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    throw error;
  }
  
};
