import type { Request, Response } from "express";
import type { PodcastEpisode, PodcastShow } from "../drizzle/schema";
import { getPublicPodcastRssFeed } from "./db";

function escapeXml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asAbsoluteHttpUrl(origin: string, value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function toRfc822(value: Date | string | null | undefined): string {
  return new Date(value ?? Date.now()).toUTCString();
}

function createRssDocument(origin: string, slug: string, show: PodcastShow, episodes: PodcastEpisode[]): string {
  const feedUrl = `${origin}/podcasts/${encodeURIComponent(slug)}/feed.xml`;
  const artworkUrl = asAbsoluteHttpUrl(origin, show.artworkUrl);
  const lastBuildDate = episodes.reduce<Date | string | null>((latest, episode) => {
    const candidate = episode.updatedAt ?? episode.publishedAt ?? episode.createdAt;
    return !latest || new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, show.updatedAt ?? show.publishedAt ?? show.createdAt);
  const items = episodes.map((episode) => {
    const audioUrl = asAbsoluteHttpUrl(origin, episode.audioUrl);
    if (!audioUrl) return "";
    return `
    <item>
      <title>${escapeXml(episode.title)}</title>
      <description>${escapeXml(episode.description || show.description)}</description>
      <guid isPermaLink="false">qssh-podcast-${show.id}-episode-${episode.id}</guid>
      <pubDate>${toRfc822(episode.publishedAt ?? episode.createdAt)}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" length="${episode.audioSizeBytes}" type="${escapeXml(episode.audioMimeType)}" />
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
      <itunes:explicit>${show.isExplicit ? "true" : "false"}</itunes:explicit>
    </item>`;
  }).filter(Boolean).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(show.title)}</title>
    <description>${escapeXml(show.description || "清水高中媒體服務隊 Podcast")}</description>
    <link>${escapeXml(origin)}</link>
    <language>${escapeXml(show.language)}</language>
    <lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>
    <generator>QSSH Media Service Management System</generator>
    <itunes:author>${escapeXml(show.authorName || "清水高中媒體服務隊")}</itunes:author>
    <itunes:summary>${escapeXml(show.description || "清水高中媒體服務隊 Podcast")}</itunes:summary>
    <itunes:explicit>${show.isExplicit ? "true" : "false"}</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <itunes:category text="Education" />
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    ${artworkUrl ? `<itunes:image href="${escapeXml(artworkUrl)}" />` : ""}
    ${show.ownerEmail ? `<itunes:owner><itunes:email>${escapeXml(show.ownerEmail)}</itunes:email><itunes:name>${escapeXml(show.authorName || "清水高中媒體服務隊")}</itunes:name></itunes:owner>` : ""}
    ${items}
  </channel>
</rss>`;
}

export async function servePodcastRssFeed(req: Request, res: Response) {
  const slug = req.params.slug?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]{3,180}$/.test(slug)) {
    res.status(404).type("text/plain").send("Podcast feed not found");
    return;
  }
  const feed = await getPublicPodcastRssFeed(slug);
  if (!feed) {
    res.status(404).type("text/plain").send("Podcast feed not found");
    return;
  }
  const origin = `${req.protocol}://${req.get("host")}`;
  res.set("Content-Type", "application/rss+xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300, s-maxage=300");
  res.send(createRssDocument(origin, slug, feed.show, feed.episodes));
}
