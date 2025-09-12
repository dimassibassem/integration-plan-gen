import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Create a plan (for edited plans) or update an existing one
// POST: { type, name, plan: { week1, week2, week3, week4 }, resumeId? }
// PUT:  { id, type?, name?, plan?: { week1?, week2?, week3?, week4? }, resumeId? }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = String(body?.type || "");
    const name = String(body?.name || "");
    const plan = body?.plan || {};
    const resumeId: string | null = (body?.resumeId as string) || null;

    if (!type || !name) {
      return NextResponse.json({ error: "Missing required fields: type, name" }, { status: 400 });
    }

    const saved = await prisma.plan.create({
      data: {
        type,
        name,
        week1: String(plan?.week1 || ""),
        week2: String(plan?.week2 || ""),
        week3: String(plan?.week3 || ""),
        week4: String(plan?.week4 || ""),
        resumeId,
      },
      select: { id: true },
    });

    return NextResponse.json({ planId: saved.id });
  } catch (error) {
    console.error("/api/plan POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || "");
    if (!id) {
      return NextResponse.json({ error: "Missing plan id" }, { status: 400 });
    }
    type PlanUpdate = Partial<{
      type: string;
      name: string;
      resumeId: string | null;
      week1: string;
      week2: string;
      week3: string;
      week4: string;
    }>;
    const data: PlanUpdate = {};
    if (body?.type != null) data.type = String(body.type);
    if (body?.name != null) data.name = String(body.name);
    if (body?.resumeId != null) data.resumeId = String(body.resumeId);

    if (body?.plan) {
      if (body.plan.week1 != null) data.week1 = String(body.plan.week1);
      if (body.plan.week2 != null) data.week2 = String(body.plan.week2);
      if (body.plan.week3 != null) data.week3 = String(body.plan.week3);
      if (body.plan.week4 != null) data.week4 = String(body.plan.week4);
    }

    const updated = await prisma.plan.update({ where: { id }, data, select: { id: true } });
    return NextResponse.json({ planId: updated.id });
  } catch (error) {
    console.error("/api/plan PUT error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
