import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/constants';

export async function GET(context: { site: URL }) {
  const posts = await getCollection('blog');
  const published = posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site || SITE.siteUrl,
    items: published.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
