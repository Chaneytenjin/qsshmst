import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type CalendarCategory = "activity" | "duty" | "equipment" | "meeting" | "other";

const CATEGORY_META: Record<CalendarCategory, { label: string; className: string }> = {
  activity: { label: "活動", className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
  duty: { label: "值勤", className: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  equipment: { label: "器材", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  meeting: { label: "會議", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  other: { label: "其他", className: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
};

type EventDraft = {
  title: string;
  category: CalendarCategory;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
};

function toDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createDraft(event?: { title: string; category: CalendarCategory; startsAt: Date; endsAt: Date | null; allDay: boolean; location: string | null; description: string | null }): EventDraft {
  return {
    title: event?.title ?? "",
    category: event?.category ?? "activity",
    start: toDateTimeInput(event?.startsAt ?? new Date()),
    end: toDateTimeInput(event?.endsAt),
    allDay: event?.allDay ?? false,
    location: event?.location ?? "",
    description: event?.description ?? "",
  };
}

function monthRange(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { rangeStart: start, rangeEnd: end };
}

function monthDays(cursor: Date) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function eventOccursOnDay(event: { startsAt: Date; endsAt: Date | null }, day: Date) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : start;
  const targetStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const targetEnd = targetStart + 86_399_999;
  return start.getTime() <= targetEnd && end.getTime() >= targetStart;
}

function formatEventTime(event: { startsAt: Date; endsAt: Date | null; allDay: boolean }) {
  if (event.allDay) return "全天";
  const formatter = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  const start = formatter.format(new Date(event.startsAt));
  return event.endsAt ? `${start}–${formatter.format(new Date(event.endsAt))}` : start;
}

export default function MediaCalendar() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [cursor, setCursor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EventDraft>(() => createDraft());
  const range = useMemo(() => monthRange(cursor), [cursor]);
  const days = useMemo(() => monthDays(cursor), [cursor]);
  const eventsQuery = trpc.mediaCalendar.list.useQuery(range);
  const createEvent = trpc.mediaCalendar.create.useMutation();
  const updateEvent = trpc.mediaCalendar.update.useMutation();
  const deleteEvent = trpc.mediaCalendar.delete.useMutation();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const events = eventsQuery.data ?? [];
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? null, [events, selectedEventId]);

  const invalidateEvents = async () => utils.mediaCalendar.list.invalidate();
  const openCreate = () => {
    setSelectedEventId(null);
    setDraft(createDraft());
    setDialogOpen(true);
  };
  const openEdit = (event: NonNullable<typeof selectedEvent>) => {
    setSelectedEventId(event.id);
    setDraft(createDraft(event));
    setDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!draft.title.trim() || !draft.start) {
      toast.error("請填寫行程名稱與開始時間");
      return;
    }
    const input = {
      title: draft.title.trim(),
      category: draft.category,
      startsAt: new Date(draft.start),
      endsAt: draft.end ? new Date(draft.end) : null,
      allDay: draft.allDay,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
    };
    try {
      if (selectedEventId) {
        await updateEvent.mutateAsync({ id: selectedEventId, event: input });
        toast.success("行程已更新");
      } else {
        await createEvent.mutateAsync(input);
        toast.success("媒服行程已建立");
      }
      await invalidateEvents();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法儲存行程，請稍後再試");
    }
  };

  const removeEvent = async (event: NonNullable<typeof selectedEvent>) => {
    if (!window.confirm(`確定要刪除「${event.title}」嗎？`)) return;
    try {
      await deleteEvent.mutateAsync({ id: event.id });
      await invalidateEvents();
      setSelectedEventId(null);
      toast.success("行程已刪除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法刪除行程，請稍後再試");
    }
  };

  const monthLabel = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" }).format(cursor);
  const today = new Date();

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="media-calendar-page">
      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 via-background to-violet-500/10 p-5 sm:p-7">
        <div className="absolute right-0 top-0 h-40 w-40 bg-cyan-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-cyan-300"><CalendarDays size={15} /> MEDIA SERVICE CALENDAR</div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">媒服行事曆</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">整合媒服活動、值勤、器材安排與會議時程所有成員都可查看，管理員與教師可維護行程</p>
          </div>
          {isStaff && <Button onClick={openCreate} className="gap-2"><Plus size={16} />新增行程</Button>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="overflow-hidden border-cyan-300/15 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
            <div>
              <CardTitle className="text-xl">{monthLabel}</CardTitle>
              <CardDescription className="mt-1">月曆檢視與媒服工作排程</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="上一個月"><ChevronLeft size={17} /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>本月</Button>
              <Button variant="outline" size="icon" onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="下一個月"><ChevronRight size={17} /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
              {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => <div key={weekday} className="py-2">週{weekday}</div>)}
            </div>
            {eventsQuery.isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">正在載入行程…</div> : eventsQuery.error ? <div className="p-10 text-center text-sm text-destructive">行程載入失敗，請重新整理後再試</div> : (
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const dayEvents = events.filter((event) => eventOccursOnDay(event, day));
                  const inMonth = day.getMonth() === cursor.getMonth();
                  return <div key={day.toISOString()} className={`min-h-28 border-b border-r border-border/60 p-1.5 sm:min-h-32 sm:p-2 ${inMonth ? "bg-card/20" : "bg-muted/25 text-muted-foreground"}`}>
                    <div className="mb-1 flex items-center justify-between"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${isSameDay(day, today) ? "bg-cyan-400 font-bold text-slate-950" : ""}`}>{day.getDate()}</span>{isStaff && inMonth && <button type="button" onClick={openCreate} className="hidden text-cyan-300 hover:text-cyan-100 sm:inline" aria-label={`在 ${day.toLocaleDateString("zh-TW")} 新增行程`}><Plus size={13} /></button>}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => <button key={`${event.id}-${day.toISOString()}`} type="button" onClick={() => setSelectedEventId(event.id)} className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[10px] font-semibold transition hover:brightness-125 ${CATEGORY_META[event.category as CalendarCategory].className}`} title={event.title}>{event.allDay ? "全天" : formatEventTime(event)} {event.title}</button>)}
                      {dayEvents.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">另有 {dayEvents.length - 3} 項</p>}
                    </div>
                  </div>;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit border-cyan-300/15 bg-card/70">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UsersRound size={17} className="text-cyan-300" />本月行程</CardTitle><CardDescription>{events.length ? `共 ${events.length} 項排程` : "尚未建立行程"}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">本月尚無媒服行程{isStaff ? "可由右上角新增活動、值勤或器材安排" : "請留意後續公告"}</p> : events.slice(0, 8).map((event) => <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className="w-full rounded-lg border border-border/70 p-3 text-left transition hover:border-cyan-300/45 hover:bg-cyan-300/5"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-semibold text-foreground">{event.title}</p><Badge variant="outline" className={`shrink-0 text-[10px] ${CATEGORY_META[event.category as CalendarCategory].className}`}>{CATEGORY_META[event.category as CalendarCategory].label}</Badge></div><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={12} />{new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(new Date(event.startsAt))} · {formatEventTime(event)}</p></button>)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedEvent) && !dialogOpen} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2">{selectedEvent && <Badge variant="outline" className={CATEGORY_META[selectedEvent.category as CalendarCategory].className}>{CATEGORY_META[selectedEvent.category as CalendarCategory].label}</Badge>}{selectedEvent?.title}</DialogTitle><DialogDescription>{selectedEvent && new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date(selectedEvent.startsAt))}</DialogDescription></DialogHeader>{selectedEvent && <div className="space-y-3 text-sm"><p className="flex items-center gap-2 text-muted-foreground"><Clock3 size={15} />{formatEventTime(selectedEvent)}</p>{selectedEvent.location && <p className="flex items-center gap-2 text-muted-foreground"><MapPin size={15} />{selectedEvent.location}</p>}{selectedEvent.description && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 leading-6 text-foreground">{selectedEvent.description}</p>}</div>}<DialogFooter>{isStaff && selectedEvent && <><Button variant="outline" onClick={() => openEdit(selectedEvent)} className="gap-2"><Pencil size={15} />編輯</Button><Button variant="destructive" onClick={() => removeEvent(selectedEvent)} className="gap-2"><Trash2 size={15} />刪除</Button></>}</DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{selectedEventId ? "編輯媒服行程" : "新增媒服行程"}</DialogTitle><DialogDescription>建立活動、值勤、器材安排或會議時程</DialogDescription></DialogHeader><div className="grid gap-4 py-1"><div className="grid gap-2"><Label htmlFor="calendar-title">行程名稱</Label><Input id="calendar-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：校慶舞台音控值勤" /></div><div className="grid gap-2"><Label>分類</Label><Select value={draft.category} onValueChange={(value) => setDraft((current) => ({ ...current, category: value as CalendarCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_META).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="calendar-start">開始時間</Label><Input id="calendar-start" type="datetime-local" value={draft.start} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="calendar-end">結束時間</Label><Input id="calendar-end" type="datetime-local" value={draft.end} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} /></div></div><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={draft.allDay} onChange={(event) => setDraft((current) => ({ ...current, allDay: event.target.checked }))} />全天行程</label><div className="grid gap-2"><Label htmlFor="calendar-location">地點</Label><Input id="calendar-location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="例如：演藝廳、視聽教室" /></div><div className="grid gap-2"><Label htmlFor="calendar-description">說明</Label><Textarea id="calendar-description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="記錄集合時間、工作分配或器材需求" rows={4} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={saveEvent} disabled={createEvent.isPending || updateEvent.isPending}>{selectedEventId ? "儲存變更" : "建立行程"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
