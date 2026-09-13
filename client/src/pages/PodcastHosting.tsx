import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, FileAudio, Loader2, Play, Plus, Podcast, Radio, Rss, Send, Settings2, ShieldCheck, Trash2, Upload, Youtube } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PublicationStatus = "draft" | "published";
type AudioMimeType = "audio/mpeg" | "audio/mp4" | "audio/ogg" | "audio/wav" | "audio/x-wav";
type DistributionPlatform = "spotify" | "apple_podcasts" | "amazon_music" | "youtube" | "other";
type DistributionStatus = "not_submitted" | "submitted" | "active" | "attention";
type ShowDraft = { title: string; description: string; status: PublicationStatus };
type EpisodeDraft = { title: string; description: string; episodeNumber: string; status: PublicationStatus };
type RssSettingsDraft = { slug: string; authorName: string; ownerEmail: string; language: string; artworkUrl: string; isExplicit: boolean; rssEnabled: boolean };
type DistributionDraft = { status: DistributionStatus; directoryUrl: string; note: string };

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set<AudioMimeType>(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav"]);
const STATUS_META: Record<PublicationStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  published: { label: "已發布", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
};
const DISTRIBUTION_STATUS_META: Record<DistributionStatus, { label: string; className: string }> = {
  not_submitted: { label: "尚未提交", className: "border-slate-400/40 bg-slate-400/10 text-slate-300" },
  submitted: { label: "已提交", className: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  active: { label: "已啟用", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  attention: { label: "需處理", className: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
};
const DISTRIBUTION_PLATFORM_META: Record<DistributionPlatform, { label: string; description: string }> = {
  spotify: { label: "Spotify", description: "以 RSS Feed 首次提交後同步新單集" },
  apple_podcasts: { label: "Apple Podcasts", description: "以 RSS Feed 驗證與審查後同步新單集" },
  amazon_music: { label: "Amazon Music", description: "可使用相同 RSS Feed 提交節目" },
  youtube: { label: "YouTube", description: "待建立頻道與 OAuth 授權後再啟用" },
  other: { label: "其他目錄", description: "記錄其他支援 RSS 的 Podcast 目錄提交狀態" },
};

function blankShowDraft(): ShowDraft {
  return { title: "", description: "", status: "draft" };
}

function blankEpisodeDraft(): EpisodeDraft {
  return { title: "", description: "", episodeNumber: "", status: "draft" };
}

function blankRssSettingsDraft(show?: { slug: string | null; authorName: string | null; ownerEmail: string | null; language: string; artworkUrl: string | null; isExplicit: boolean; rssEnabled: boolean } | null): RssSettingsDraft {
  return {
    slug: show?.slug ?? "",
    authorName: show?.authorName ?? "清水高中媒體服務隊",
    ownerEmail: show?.ownerEmail ?? "",
    language: show?.language ?? "zh-TW",
    artworkUrl: show?.artworkUrl ?? "",
    isExplicit: show?.isExplicit ?? false,
    rssEnabled: show?.rssEnabled ?? false,
  };
}

function blankDistributionDraft(): DistributionDraft {
  return { status: "not_submitted", directoryUrl: "", note: "" };
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: Date | string | null) {
  return value ? new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "未發布";
}

function readAudioAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取音檔"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export default function PodcastHosting() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [showDialogOpen, setShowDialogOpen] = useState(false);
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [showDraft, setShowDraft] = useState<ShowDraft>(blankShowDraft);
  const [episodeDraft, setEpisodeDraft] = useState<EpisodeDraft>(blankEpisodeDraft);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [rssDialogOpen, setRssDialogOpen] = useState(false);
  const [rssDraft, setRssDraft] = useState<RssSettingsDraft>(blankRssSettingsDraft);
  const [targetDialogPlatform, setTargetDialogPlatform] = useState<DistributionPlatform | null>(null);
  const [targetDraft, setTargetDraft] = useState<DistributionDraft>(blankDistributionDraft);
  const [appOrigin] = useState(() => window.location.origin);

  const showsQuery = trpc.podcasts.listShows.useQuery();
  const episodesQuery = trpc.podcasts.listEpisodes.useQuery({ showId: selectedShowId ?? 0 }, { enabled: selectedShowId !== null });
  const createShow = trpc.podcasts.createShow.useMutation();
  const updateShow = trpc.podcasts.updateShow.useMutation();
  const deleteShow = trpc.podcasts.deleteShow.useMutation();
  const uploadEpisode = trpc.podcasts.uploadEpisode.useMutation();
  const updateEpisode = trpc.podcasts.updateEpisode.useMutation();
  const deleteEpisode = trpc.podcasts.deleteEpisode.useMutation();
  const updateRssSettings = trpc.podcasts.updateRssSettings.useMutation();
  const updateDistributionTarget = trpc.podcasts.updateDistributionTarget.useMutation();
  const shows = showsQuery.data ?? [];
  const selectedShow = useMemo(() => shows.find((show) => show.id === selectedShowId) ?? null, [selectedShowId, shows]);
  const episodes = episodesQuery.data ?? [];
  const rssInfoQuery = trpc.podcasts.rssInfo.useQuery({ showId: selectedShowId ?? 0, origin: appOrigin }, { enabled: isStaff && selectedShowId !== null });
  const distributionQuery = trpc.podcasts.listDistributionTargets.useQuery({ showId: selectedShowId ?? 0 }, { enabled: isStaff && selectedShowId !== null });
  const distributionTargets = distributionQuery.data ?? [];

  useEffect(() => {
    if (shows.length === 0) {
      if (selectedShowId !== null) setSelectedShowId(null);
      return;
    }
    if (!shows.some((show) => show.id === selectedShowId)) setSelectedShowId(shows[0].id);
  }, [selectedShowId, shows]);

  const invalidateShows = async () => {
    await utils.podcasts.listShows.invalidate();
    if (selectedShowId !== null) await utils.podcasts.listEpisodes.invalidate({ showId: selectedShowId });
  };

  const invalidateDistribution = async () => {
    if (selectedShowId === null) return;
    await Promise.all([
      utils.podcasts.listShows.invalidate(),
      utils.podcasts.rssInfo.invalidate({ showId: selectedShowId, origin: appOrigin }),
      utils.podcasts.listDistributionTargets.invalidate({ showId: selectedShowId }),
    ]);
  };

  const openCreateShow = () => {
    setShowDraft(blankShowDraft());
    setShowDialogOpen(true);
  };

  const saveShow = async () => {
    if (!showDraft.title.trim()) {
      toast.error("請填寫節目名稱");
      return;
    }
    try {
      const result = await createShow.mutateAsync({ title: showDraft.title.trim(), description: showDraft.description.trim() || null, status: showDraft.status });
      await utils.podcasts.listShows.invalidate();
      setSelectedShowId(result.id);
      setShowDialogOpen(false);
      toast.success(showDraft.status === "published" ? "Podcast 節目已建立並發布" : "Podcast 節目草稿已建立");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法建立 Podcast 節目");
    }
  };

  const changeShowStatus = async (status: PublicationStatus) => {
    if (!selectedShow) return;
    try {
      await updateShow.mutateAsync({ id: selectedShow.id, show: { title: selectedShow.title, description: selectedShow.description, status } });
      await invalidateShows();
      toast.success(status === "published" ? "節目已發布" : "節目已改為草稿" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法更新節目狀態");
    }
  };

  const removeShow = async () => {
    if (!selectedShow || !window.confirm(`確定要刪除節目「${selectedShow.title}」及所有單集嗎？`)) return;
    try {
      await deleteShow.mutateAsync({ id: selectedShow.id });
      setSelectedShowId(null);
      await utils.podcasts.listShows.invalidate();
      toast.success("節目與其單集已刪除，未再被引用的音檔將不會出現在系統中");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法刪除節目");
    }
  };

  const openUploadEpisode = () => {
    if (!selectedShow) return;
    setEpisodeDraft({ ...blankEpisodeDraft(), episodeNumber: String((episodes.at(-1)?.episodeNumber ?? 0) + 1) });
    setAudioFile(null);
    setEpisodeDialogOpen(true);
  };

  const openRssSettings = () => {
    if (!selectedShow) return;
    setRssDraft(blankRssSettingsDraft(selectedShow));
    setRssDialogOpen(true);
  };

  const saveRssSettings = async () => {
    if (!selectedShow) return;
    if (!rssDraft.slug || !rssDraft.authorName.trim()) {
      toast.error("請填寫 RSS 識別碼與 Podcast 作者名稱");
      return;
    }
    try {
      await updateRssSettings.mutateAsync({ id: selectedShow.id, settings: { ...rssDraft, slug: rssDraft.slug.trim().toLowerCase(), authorName: rssDraft.authorName.trim(), ownerEmail: rssDraft.ownerEmail.trim() || null, artworkUrl: rssDraft.artworkUrl.trim() || null } });
      await invalidateDistribution();
      setRssDialogOpen(false);
      toast.success(rssDraft.rssEnabled ? "RSS Feed 已啟用，可提交至 Podcast 平台" : "RSS Feed 設定已儲存，目前維持停用");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "RSS 設定儲存失敗");
    }
  };

  const copyRssFeed = async () => {
    const feedUrl = rssInfoQuery.data?.feedUrl;
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success("RSS Feed 網址已複製，可貼至 Spotify、Apple Podcasts 等平台");
    } catch {
      toast.error("無法自動複製，請手動選取 Feed 網址");
    }
  };

  const openTargetDialog = (platform: DistributionPlatform) => {
    if (platform === "youtube") return;
    const existing = distributionTargets.find((target) => target.platform === platform);
    setTargetDraft(existing ? { status: existing.status as DistributionStatus, directoryUrl: existing.directoryUrl ?? "", note: existing.note ?? "" } : blankDistributionDraft());
    setTargetDialogPlatform(platform);
  };

  const saveDistributionTarget = async () => {
    if (!selectedShow || !targetDialogPlatform || targetDialogPlatform === "youtube") return;
    try {
      await updateDistributionTarget.mutateAsync({ showId: selectedShow.id, target: { platform: targetDialogPlatform, status: targetDraft.status, directoryUrl: targetDraft.directoryUrl.trim() || null, note: targetDraft.note.trim() || null } });
      await invalidateDistribution();
      const platformLabel = DISTRIBUTION_PLATFORM_META[targetDialogPlatform].label;
      setTargetDialogPlatform(null);
      toast.success(`${platformLabel} 的提交狀態已更新`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "平台提交狀態儲存失敗");
    }
  };

  const saveEpisode = async () => {
    if (!selectedShow || !audioFile) {
      toast.error("請選擇要托管的音檔");
      return;
    }
    if (!episodeDraft.title.trim() || !episodeDraft.episodeNumber.trim()) {
      toast.error("請填寫單集名稱與集數");
      return;
    }
    const episodeNumber = Number(episodeDraft.episodeNumber);
    if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) {
      toast.error("單集集數必須是正整數");
      return;
    }
    if (!AUDIO_MIME_TYPES.has(audioFile.type as AudioMimeType) || audioFile.size > MAX_AUDIO_BYTES) {
      toast.error("音檔僅支援 MP3、M4A、OGG、WAV，且大小不得超過 20 MB");
      return;
    }
    try {
      const base64 = await readAudioAsDataUrl(audioFile);
      await uploadEpisode.mutateAsync({
        showId: selectedShow.id,
        title: episodeDraft.title.trim(),
        description: episodeDraft.description.trim() || null,
        episodeNumber,
        status: episodeDraft.status,
        fileName: audioFile.name,
        mimeType: audioFile.type as AudioMimeType,
        base64,
      });
      await utils.podcasts.listEpisodes.invalidate({ showId: selectedShow.id });
      setEpisodeDialogOpen(false);
      toast.success(episodeDraft.status === "published" ? "單集已托管並發布" : "單集音檔已安全托管為草稿" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "音檔托管失敗，請稍後再試");
    }
  };

  const changeEpisodeStatus = async (episode: typeof episodes[number], status: PublicationStatus) => {
    try {
      await updateEpisode.mutateAsync({ id: episode.id, episode: { title: episode.title, description: episode.description, episodeNumber: episode.episodeNumber, status } });
      if (selectedShowId !== null) await utils.podcasts.listEpisodes.invalidate({ showId: selectedShowId });
      toast.success(status === "published" ? "單集已發布" : "單集已改為草稿" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法更新單集狀態");
    }
  };

  const removeEpisode = async (episode: typeof episodes[number]) => {
    if (!window.confirm(`確定要移除單集「${episode.title}」嗎？`)) return;
    try {
      await deleteEpisode.mutateAsync({ id: episode.id });
      if (selectedShowId !== null) await utils.podcasts.listEpisodes.invalidate({ showId: selectedShowId });
      toast.success("單集已移除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法移除單集");
    }
  };

  return <div className="mx-auto max-w-6xl space-y-6" data-testid="podcast-hosting-page">
    <section className="relative overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/10 via-background to-cyan-500/10 p-5 sm:p-7">
      <div className="absolute right-0 top-0 h-44 w-44 bg-fuchsia-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-fuchsia-300"><Podcast size={15} /> MEDIA SERVICE PODCAST</div><h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Podcast 托管</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">在此集中管理媒服節目與單集已發布內容可供全體登入成員播放；教師與管理員可上傳音檔、建立草稿與發布</p></div>{isStaff && <Button onClick={openCreateShow} className="gap-2"><Plus size={16} />新增節目</Button>}</div>
    </section>

    <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1.8fr)]">
      <Card className="border-fuchsia-300/15 bg-card/70"><CardHeader><CardTitle className="flex items-center gap-2"><Radio size={18} className="text-fuchsia-300" />節目清單</CardTitle><CardDescription>{isStaff ? "包含草稿與已發布節目" : "僅顯示已發布節目"}</CardDescription></CardHeader><CardContent className="space-y-2">{showsQuery.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">正在載入節目…</p> : shows.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center"><Podcast className="mx-auto mb-2 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">尚無 Podcast 節目</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{isStaff ? "可建立第一個節目並開始托管單集" : "目前尚無已發布的節目"}</p></div> : shows.map((show) => <button key={show.id} type="button" onClick={() => setSelectedShowId(show.id)} className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 ${selectedShowId === show.id ? "border-fuchsia-300/70 bg-fuchsia-400/10" : "border-border/70 bg-background/25 hover:border-fuchsia-300/35"}`}><div className="flex items-start justify-between gap-2"><span className="min-w-0 font-semibold text-foreground">{show.title}</span><Badge variant="outline" className={STATUS_META[show.status as PublicationStatus].className}>{STATUS_META[show.status as PublicationStatus].label}</Badge></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{show.description || "未提供節目介紹"}</p></button>)}</CardContent></Card>

      <Card className="border-cyan-300/15 bg-card/70"><CardHeader className="gap-4 border-b border-border/60 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{selectedShow?.title ?? "選擇一個節目"}</CardTitle><CardDescription className="mt-1">{selectedShow?.description || "從左側節目清單選擇項目，查看或播放已托管的單集"}</CardDescription></div>{selectedShow && isStaff && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => changeShowStatus(selectedShow.status === "published" ? "draft" : "published")} disabled={updateShow.isPending}>{selectedShow.status === "published" ? "改為草稿" : "發布節目"}</Button><Button size="sm" onClick={openUploadEpisode} className="gap-1.5"><Upload size={14} />托管單集</Button><Button size="sm" variant="ghost" onClick={removeShow} className="gap-1.5 text-destructive hover:text-destructive" disabled={deleteShow.isPending}><Trash2 size={14} />刪除</Button></div>}</CardHeader><CardContent className="p-4 sm:p-6">{!selectedShow ? <div className="py-14 text-center"><Radio className="mx-auto mb-3 text-muted-foreground" /><p className="font-semibold text-foreground">尚未選擇節目</p><p className="mt-1 text-sm text-muted-foreground">選取節目後，即可檢視單集與播放內容</p></div> : episodesQuery.isLoading ? <div className="flex justify-center py-14"><Loader2 className="animate-spin text-cyan-300" /></div> : episodesQuery.error ? <p className="py-14 text-center text-sm text-destructive">單集載入失敗，請重新整理後再試</p> : episodes.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><FileAudio className="mx-auto mb-3 text-muted-foreground" /><p className="font-semibold text-foreground">此節目尚無可播放單集</p><p className="mt-1 text-sm text-muted-foreground">{isStaff ? "可使用「托管單集」上傳 MP3、M4A、OGG 或 WAV 音檔" : "請稍後再回來查看最新發布內容"}</p></div> : <div className="space-y-4">{episodes.map((episode) => <article key={episode.id} className="rounded-xl border border-border/70 bg-background/25 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-cyan-300/35 bg-cyan-300/10 text-cyan-200">EP. {episode.episodeNumber}</Badge><h2 className="font-bold text-foreground">{episode.title}</h2>{isStaff && <Badge variant="outline" className={STATUS_META[episode.status as PublicationStatus].className}>{STATUS_META[episode.status as PublicationStatus].label}</Badge>}</div>{episode.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{episode.description}</p>}</div>{isStaff && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => changeEpisodeStatus(episode, episode.status === "published" ? "draft" : "published")} disabled={updateEpisode.isPending}>{episode.status === "published" ? "改為草稿" : "發布"}</Button><Button size="sm" variant="ghost" onClick={() => removeEpisode(episode)} disabled={deleteEpisode.isPending} className="gap-1.5 text-destructive hover:text-destructive"><Trash2 size={14} />刪除</Button></div>}</div><audio className="mt-4 w-full" controls preload="metadata"><source src={episode.audioUrl} type={episode.audioMimeType} />您的瀏覽器不支援音訊播放</audio><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Play size={12} />{episode.audioFileName}</span><span>{formatBytes(episode.audioSizeBytes)}</span><span>{episode.status === "published" ? `發布於 ${formatDate(episode.publishedAt)}` : "草稿尚未公開"}</span></div></article>)}</div>}</CardContent></Card>
    </div>

    {isStaff && selectedShow && <Card className="border-violet-300/20 bg-violet-400/5" data-testid="podcast-distribution-center">
      <CardHeader className="gap-4 border-b border-border/60 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Send size={18} className="text-violet-300" />多平台分送中心</CardTitle><CardDescription className="mt-1">以一個公開 RSS Feed 作為 Spotify、Apple Podcasts、Amazon Music 與其他 Podcast 目錄的同步來源</CardDescription></div><Button size="sm" variant="outline" onClick={openRssSettings} className="gap-1.5"><Settings2 size={14} />RSS 設定</Button></CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-violet-300/20 bg-background/35 p-4"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold text-foreground"><Rss size={17} className="text-orange-400" />公開 RSS Feed</p><p className="mt-1 text-xs leading-5 text-muted-foreground">啟用後，平台會依自己的更新週期擷取已發布單集</p></div>{rssInfoQuery.data?.canPublishFeed ? <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={12} className="mr-1" />已啟用</Badge> : <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">尚未啟用</Badge>}</div>{rssInfoQuery.isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" />正在準備 Feed 資訊…</div> : rssInfoQuery.data?.canPublishFeed && rssInfoQuery.data.feedUrl ? <div className="mt-4 space-y-3"><code className="block break-all rounded-lg border border-border/70 bg-background/70 p-3 text-xs text-foreground" data-testid="podcast-rss-feed-url">{rssInfoQuery.data.feedUrl}</code><div className="flex flex-wrap gap-2"><Button size="sm" onClick={copyRssFeed} className="gap-1.5"><Copy size={14} />複製 Feed</Button><a href={rssInfoQuery.data.feedUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="gap-1.5"><ExternalLink size={14} />檢視 XML</Button></a></div></div> : <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-sm leading-6 text-muted-foreground">請先將節目設為「已發布」，並在 RSS 設定中填寫識別碼後啟用 Feed</div>}</section>
        <section className="grid gap-3 sm:grid-cols-2">{(["spotify", "apple_podcasts", "amazon_music", "other"] as const).map((platform) => { const target = distributionTargets.find((item) => item.platform === platform); const status = (target?.status ?? "not_submitted") as DistributionStatus; const meta = DISTRIBUTION_PLATFORM_META[platform]; return <article key={platform} className="rounded-xl border border-border/70 bg-background/25 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{meta.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p></div><Badge variant="outline" className={DISTRIBUTION_STATUS_META[status].className}>{DISTRIBUTION_STATUS_META[status].label}</Badge></div>{target?.directoryUrl && <a className="mt-3 inline-flex max-w-full items-center gap-1 truncate text-xs text-cyan-300 underline-offset-4 hover:underline" href={target.directoryUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} />查看平台頁面</a>}<Button size="sm" variant="outline" onClick={() => openTargetDialog(platform)} disabled={!rssInfoQuery.data?.canPublishFeed} className="mt-3 w-full gap-1.5"><Send size={13} />更新提交狀態</Button></article>; })}<article className="rounded-xl border border-dashed border-red-300/25 bg-red-400/5 p-3 sm:col-span-2"><div className="flex gap-3"><Youtube size={20} className="mt-0.5 shrink-0 text-red-400" /><div><p className="font-semibold text-foreground">YouTube</p><p className="mt-1 text-xs leading-5 text-muted-foreground">尚未設定待建立 YouTube 頻道與 OAuth 授權後，才能啟用影音發布；目前不會要求或保存任何 Google 憑證</p></div></div></article></section>
      </CardContent>
    </Card>}

    <Card className="border-cyan-300/15 bg-cyan-400/5"><CardContent className="flex gap-3 p-4 text-sm leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-300" size={18} /><p>音檔會以受管理儲存服務保存，資料庫僅記錄檔案中繼資料與安全儲存參照為維持穩定上傳，本頁目前支援單檔最多 20 MB 的 MP3、M4A、OGG 與 WAV 音檔</p></CardContent></Card>

    <Dialog open={showDialogOpen} onOpenChange={setShowDialogOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>新增 Podcast 節目</DialogTitle><DialogDescription>可先建立草稿，完成內容後再發布給全體登入成員</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="podcast-show-title">節目名稱</Label><Input id="podcast-show-title" value={showDraft.title} onChange={(event) => setShowDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：清水媒服聲音誌" /></div><div className="grid gap-2"><Label htmlFor="podcast-show-description">節目介紹</Label><Textarea id="podcast-show-description" rows={5} value={showDraft.description} onChange={(event) => setShowDraft((current) => ({ ...current, description: event.target.value }))} placeholder="簡要介紹節目主題、製作方向與預期聽眾" /></div><div className="flex flex-wrap gap-2"><Button type="button" variant={showDraft.status === "draft" ? "default" : "outline"} onClick={() => setShowDraft((current) => ({ ...current, status: "draft" }))}>儲存草稿</Button><Button type="button" variant={showDraft.status === "published" ? "default" : "outline"} onClick={() => setShowDraft((current) => ({ ...current, status: "published" }))}>建立並發布</Button></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialogOpen(false)}>取消</Button><Button onClick={saveShow} disabled={createShow.isPending}>{createShow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}建立節目</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>托管 Podcast 單集</DialogTitle><DialogDescription>{selectedShow?.title} · 上傳後可保留為草稿或立即發布</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="podcast-episode-title">單集名稱</Label><Input id="podcast-episode-title" value={episodeDraft.title} onChange={(event) => setEpisodeDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：校園活動幕後製作" /></div><div className="grid gap-2"><Label htmlFor="podcast-episode-number">單集集數</Label><Input id="podcast-episode-number" type="number" min="1" value={episodeDraft.episodeNumber} onChange={(event) => setEpisodeDraft((current) => ({ ...current, episodeNumber: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="podcast-episode-description">單集說明</Label><Textarea id="podcast-episode-description" rows={4} value={episodeDraft.description} onChange={(event) => setEpisodeDraft((current) => ({ ...current, description: event.target.value }))} placeholder="說明本集重點、來賓或製作內容" /></div><div className="grid gap-2"><Label htmlFor="podcast-audio-file">音檔</Label><Input id="podcast-audio-file" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav,.mp3,.m4a,.ogg,.wav" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />{audioFile && <p className="text-xs text-muted-foreground">已選擇：{audioFile.name} · {formatBytes(audioFile.size)}</p>}<p className="text-xs leading-5 text-muted-foreground">支援 MP3、M4A、OGG、WAV，單檔上限 20 MB</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant={episodeDraft.status === "draft" ? "default" : "outline"} onClick={() => setEpisodeDraft((current) => ({ ...current, status: "draft" }))}>托管為草稿</Button><Button type="button" variant={episodeDraft.status === "published" ? "default" : "outline"} onClick={() => setEpisodeDraft((current) => ({ ...current, status: "published" }))}>托管並發布</Button></div></div><DialogFooter><Button variant="outline" onClick={() => setEpisodeDialogOpen(false)}>取消</Button><Button onClick={saveEpisode} disabled={uploadEpisode.isPending}>{uploadEpisode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}上傳並托管</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={rssDialogOpen} onOpenChange={setRssDialogOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>RSS Feed 設定</DialogTitle><DialogDescription>啟用後可將此節目發布至 Spotify、Apple Podcasts 與其他支援 RSS 的 Podcast 目錄</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="podcast-rss-slug">Feed 識別碼</Label><Input id="podcast-rss-slug" value={rssDraft.slug} onChange={(event) => setRssDraft((current) => ({ ...current, slug: event.target.value.toLowerCase() }))} placeholder="例如：qssh-media-voices" /><p className="text-xs text-muted-foreground">僅限小寫英數字與連字號；會成為公開 Feed 網址的一部分</p></div><div className="grid gap-2"><Label htmlFor="podcast-rss-author">Podcast 作者</Label><Input id="podcast-rss-author" value={rssDraft.authorName} onChange={(event) => setRssDraft((current) => ({ ...current, authorName: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="podcast-rss-email">公開聯絡信箱（選填）</Label><Input id="podcast-rss-email" type="email" value={rssDraft.ownerEmail} onChange={(event) => setRssDraft((current) => ({ ...current, ownerEmail: event.target.value }))} placeholder="podcast@example.edu.tw" /></div><div className="grid gap-2"><Label htmlFor="podcast-rss-language">語言</Label><Input id="podcast-rss-language" value={rssDraft.language} onChange={(event) => setRssDraft((current) => ({ ...current, language: event.target.value }))} placeholder="zh-TW" /></div><div className="grid gap-2"><Label htmlFor="podcast-rss-artwork">封面網址（選填）</Label><Input id="podcast-rss-artwork" type="url" value={rssDraft.artworkUrl} onChange={(event) => setRssDraft((current) => ({ ...current, artworkUrl: event.target.value }))} placeholder="https://…" /></div><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3"><input type="checkbox" checked={rssDraft.isExplicit} onChange={(event) => setRssDraft((current) => ({ ...current, isExplicit: event.target.checked }))} className="mt-1" /><span><span className="block text-sm font-medium text-foreground">包含成人內容</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">若節目含有成人內容，需向 Podcast 平台正確標示</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-300/30 bg-violet-400/5 p-3"><input type="checkbox" checked={rssDraft.rssEnabled} onChange={(event) => setRssDraft((current) => ({ ...current, rssEnabled: event.target.checked }))} className="mt-1" /><span><span className="block text-sm font-medium text-foreground">啟用公開 RSS Feed</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">只有已發布的節目及單集會出現在公開 Feed 中</span></span></label></div><DialogFooter><Button variant="outline" onClick={() => setRssDialogOpen(false)}>取消</Button><Button onClick={saveRssSettings} disabled={updateRssSettings.isPending}>{updateRssSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}儲存 RSS 設定</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={targetDialogPlatform !== null} onOpenChange={(open) => { if (!open) setTargetDialogPlatform(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>更新 {targetDialogPlatform ? DISTRIBUTION_PLATFORM_META[targetDialogPlatform].label : "平台"} 提交狀態</DialogTitle><DialogDescription>首次提交會由您在平台帳號中完成；此處用於記錄提交進度、平台頁面網址與後續確認狀態</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="podcast-target-status">提交狀態</Label><select id="podcast-target-status" value={targetDraft.status} onChange={(event) => setTargetDraft((current) => ({ ...current, status: event.target.value as DistributionStatus }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="not_submitted">尚未提交</option><option value="submitted">已提交，等待平台處理</option><option value="active">已啟用並確認</option><option value="attention">需處理</option></select></div><div className="grid gap-2"><Label htmlFor="podcast-target-url">平台節目網址（選填）</Label><Input id="podcast-target-url" type="url" value={targetDraft.directoryUrl} onChange={(event) => setTargetDraft((current) => ({ ...current, directoryUrl: event.target.value }))} placeholder="https://…" /></div><div className="grid gap-2"><Label htmlFor="podcast-target-note">提交備註（選填）</Label><Textarea id="podcast-target-note" rows={4} value={targetDraft.note} onChange={(event) => setTargetDraft((current) => ({ ...current, note: event.target.value }))} placeholder="例如：送審日期、驗證信件或待補資料" /></div></div><DialogFooter><Button variant="outline" onClick={() => setTargetDialogPlatform(null)}>取消</Button><Button onClick={saveDistributionTarget} disabled={updateDistributionTarget.isPending}>{updateDistributionTarget.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}儲存狀態</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
