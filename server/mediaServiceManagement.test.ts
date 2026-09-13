import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("媒服行事曆與企劃申請管理", () => {
  const schema = readFileSync("drizzle/schema.ts", "utf8");
  const db = readFileSync("server/db.ts", "utf8");
  const router = readFileSync("server/routers.ts", "utf8");
  const app = readFileSync("client/src/App.tsx", "utf8");
  const navigation = readFileSync("client/src/components/AppLayout.tsx", "utf8");
  const calendarPage = readFileSync("client/src/pages/MediaCalendar.tsx", "utf8");
  const proposalsPage = readFileSync("client/src/pages/MediaProjectProposals.tsx", "utf8");

  it("建立可追溯的行事曆與企劃申請資料模型及查詢索引", () => {
    expect(schema).toContain('mysqlTable("media_calendar_events"');
    expect(schema).toContain('mysqlEnum("category", ["activity", "duty", "equipment", "meeting", "other"])');
    expect(schema).toContain('index("media_calendar_events_starts_at_index")');
    expect(schema).toContain('mysqlTable("media_project_proposals"');
    expect(schema).toContain('mysqlEnum("status", ["draft", "submitted", "approved", "returned", "rejected"])');
    expect(schema).toContain('index("media_project_proposals_applicant_status_index")');
    expect(db).toContain("getMediaCalendarEvents");
    expect(db).toContain("getMediaProjectProposalsByApplicant");
    expect(db).toContain("reviewMediaProjectProposal");
  });

  it("讓所有登入者可查閱或提出企劃，並限制行程維護與企劃審核給教師及管理員", () => {
    expect(router).toContain('const staffProcedure = protectedProcedure.use');
    expect(router).toContain('mediaCalendar: router({');
    expect(router).toContain('list: protectedProcedure');
    expect(router).toContain('create: staffProcedure');
    expect(router).toContain('update: staffProcedure');
    expect(router).toContain('delete: staffProcedure');
    expect(router).toContain('mediaProjectProposals: router({');
    expect(router).toContain('return canReview ? getMediaProjectProposals() : getMediaProjectProposalsByApplicant(ctx.user.id)');
    expect(router).toContain('if (existing.applicantId !== ctx.user.id)');
    expect(router).toContain('review: staffProcedure');
    expect(router).toContain('createMediaCalendarEvent');
    expect(router).toContain('reviewMediaProjectProposal');
    expect(router).toContain('logOperation(ctx.user.id');
  });

  it("提供兩個選單入口、受保護路由與響應式互動頁面", () => {
    expect(navigation).toContain('{ label: "媒服行事曆", path: "/media-calendar"');
    expect(navigation).toContain('{ label: "企劃申請", path: "/media-project-proposals"');
    expect(app).toContain('path="/media-calendar"');
    expect(app).toContain('path="/media-project-proposals"');
    expect(calendarPage).toContain('data-testid="media-calendar-page"');
    expect(calendarPage).toContain("trpc.mediaCalendar.list.useQuery");
    expect(calendarPage).toContain("trpc.mediaCalendar.create.useMutation");
    expect(calendarPage).toContain("月曆檢視與媒服工作排程");
    expect(proposalsPage).toContain('data-testid="media-project-proposals-page"');
    expect(proposalsPage).toContain("trpc.mediaProjectProposals.create.useMutation");
    expect(proposalsPage).toContain("trpc.mediaProjectProposals.review.useMutation");
    expect(proposalsPage).toContain("送交審核");
  });
});
