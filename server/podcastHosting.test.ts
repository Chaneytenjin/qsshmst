import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaPath = new URL("../drizzle/schema.ts", import.meta.url);
const dbPath = new URL("./db.ts", import.meta.url);
const routerPath = new URL("./routers.ts", import.meta.url);
const appPath = new URL("../client/src/App.tsx", import.meta.url);
const navigationPath = new URL("../client/src/components/AppLayout.tsx", import.meta.url);
const pagePath = new URL("../client/src/pages/PodcastHosting.tsx", import.meta.url);
const rssPath = new URL("./podcastRssFeed.ts", import.meta.url);
const serverIndexPath = new URL("./_core/index.ts", import.meta.url);

describe("Podcast 托管系統", () => {
  it("保存節目與單集的發布狀態、音檔儲存參照和必要的資料庫索引", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const db = readFileSync(dbPath, "utf8");

    expect(schema).toContain('mysqlTable("podcast_shows"');
    expect(schema).toContain('mysqlTable("podcast_episodes"');
    expect(schema).toContain('audioStorageKey: varchar("audioStorageKey"');
    expect(schema).toContain('audioUrl: text("audioUrl").notNull()');
    expect(schema).toContain('uniqueIndex("podcast_episodes_show_episode_number_unique")');
    expect(db).toContain("getPodcastShows(includeDrafts = false)");
    expect(db).toContain("getPodcastEpisodes(showId: number, includeDrafts = false)");
    expect(db).toContain("createPodcastShow");
    expect(db).toContain("createPodcastEpisode");
    expect(db).toContain("deletePodcastEpisode");
  });

  it("讓所有登入者僅播放已發布內容，並限制教師與管理員托管、發布及刪除音檔", () => {
    const router = readFileSync(routerPath, "utf8");

    expect(router).toContain("podcasts: router({");
    expect(router).toContain("listShows: protectedProcedure");
    expect(router).toContain("return getPodcastShows(canManage)");
    expect(router).toContain("if (show.status !== \"published\" && !canManage)");
    expect(router).toContain("createShow: staffProcedure");
    expect(router).toContain("uploadEpisode: staffProcedure");
    expect(router).toContain("deleteEpisode: staffProcedure");
    expect(router).toContain("PODCAST_AUDIO_MAX_BYTES = 20 * 1024 * 1024");
    expect(router).toContain("storagePut(`podcasts/${show.id}/episodes/");
    expect(router).toContain("sanitizePodcastAudioFileName");
    expect(router).toContain("uploadPodcastEpisode");
  });

  it("在選單與受保護路由提供 Podcast 入口，並在頁面提供播放與受控音檔上傳", () => {
    const app = readFileSync(appPath, "utf8");
    const navigation = readFileSync(navigationPath, "utf8");
    const page = readFileSync(pagePath, "utf8");

    expect(navigation).toContain('{ label: "Podcast", path: "/podcasts", icon: Podcast, roles: ["admin", "teacher", "student"] }');
    expect(app).toContain('import PodcastHosting from "./pages/PodcastHosting"');
    expect(app).toContain('path="/podcasts"');
    expect(app).toContain("<ProtectedRoute component={PodcastHosting} />");
    expect(page).toContain('data-testid="podcast-hosting-page"');
    expect(page).toContain("trpc.podcasts.listShows.useQuery");
    expect(page).toContain("trpc.podcasts.uploadEpisode.useMutation");
    expect(page).toContain("accept=\"audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav");
    expect(page).toContain("<audio");
    expect(page).toContain("MAX_AUDIO_BYTES = 20 * 1024 * 1024");
  });

  it("建立標準公開 RSS Feed 與平台提交狀態，並將 YouTube 維持為尚未設定入口", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const db = readFileSync(dbPath, "utf8");
    const router = readFileSync(routerPath, "utf8");
    const page = readFileSync(pagePath, "utf8");
    const rss = readFileSync(rssPath, "utf8");
    const serverIndex = readFileSync(serverIndexPath, "utf8");

    expect(schema).toContain('slug: varchar("slug", { length: 180 }).unique()');
    expect(schema).toContain('rssEnabled: boolean("rssEnabled")');
    expect(schema).toContain('mysqlTable("podcast_distribution_targets"');
    expect(db).toContain("getPublicPodcastRssFeed");
    expect(db).toContain("upsertPodcastDistributionTarget");
    expect(router).toContain("updateRssSettings: staffProcedure");
    expect(router).toContain("updateDistributionTarget: staffProcedure");
    expect(rss).toContain('application/rss+xml; charset=utf-8');
    expect(rss).toContain("<itunes:author>");
    expect(rss).toContain("<enclosure");
    expect(serverIndex).toContain('app.get("/podcasts/:slug/feed.xml", servePodcastRssFeed)');
    expect(page).toContain('data-testid="podcast-distribution-center"');
    expect(page).toContain("trpc.podcasts.updateRssSettings.useMutation");
    expect(page).toContain("Spotify");
    expect(page).toContain("Apple Podcasts");
    expect(page).toContain("YouTube");
    expect(page).toContain("目前不會要求或保存任何 Google 憑證");
  });
});
