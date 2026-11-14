import { admin } from "@/server/lib/admin";
import { handler, ok, hcmToday } from "@/server/lib/http";
import { OPEN, CLOSE, pricingData, buildSchedule } from "@/server/lib/bookings";

type Topic = "price" | "hours" | "availability" | "cancel" | "address" | "payment";
type Line = { key: string; params?: Record<string, string | number> };

async function hotline(): Promise<string> {
  const { data } = await admin().from("cau_hinh").select("hotline").maybeSingle();
  return data?.hotline ?? "";
}

async function answer(topic: Topic): Promise<Line[]> {
  switch (topic) {
    case "hours":
      return [{ key: "aHours", params: { open: OPEN, close: CLOSE } }];

    case "price": {
      const { pricing } = await pricingData();
      const lines: Line[] = [{ key: "aPriceIntro" }];
      for (const band of pricing.bands) {
        const label = `${band.start}–${band.end}`;
        for (const [group, pick] of [["T2-T6", "weekday"], ["T7-CN", "weekend"]] as const) {
          const prices = Array.from(
            new Set(pricing.courts.map((c) => c.prices[band.id]?.[pick] ?? 0).filter((p) => p > 0)),
          ).sort((a, b) => a - b);
          for (const price of prices) lines.push({ key: "aPriceRow", params: { group, band: label, price } });
        }
      }
      return lines.length > 1 ? lines : [{ key: "fallback", params: { hotline: await hotline() } }];
    }

    case "availability": {
      const date = hcmToday();
      const schedule = await buildSchedule(date);
      const rows = schedule.courts
        .map((c) => ({ name: c.name, free: c.slots.filter((s) => s.status === "free").length }))
        .filter((r) => r.free > 0);
      if (rows.length === 0) return [{ key: "aAvailNone", params: { date } }];
      return [
        { key: "aAvailIntro", params: { date } },
        ...rows.map((r) => ({ key: "aAvailRow", params: { court: r.name, slots: r.free } })),
      ];
    }

    case "cancel":
      return [{ key: "aCancel" }];

    case "address":
      return [{ key: "aAddress", params: { address: "" } }];

    case "payment":
      return [{ key: "aPayment" }];
  }
}

const MATCH: Array<{ topic: Topic; re: RegExp }> = [
  { topic: "price", re: /giá|bảng giá|price|cost|bao nhiêu|phí/i },
  { topic: "hours", re: /giờ|mở cửa|đóng cửa|hour|open|close|mấy giờ/i },
  { topic: "availability", re: /trống|còn sân|đặt được|available|free|slot|khung giờ/i },
  { topic: "cancel", re: /hủy|huỷ|hoàn tiền|cancel|refund|đổi lịch|dời/i },
  { topic: "address", re: /địa chỉ|ở đâu|address|location|đường|chỗ nào/i },
  { topic: "payment", re: /thanh toán|chuyển khoản|trả tiền|pay|payment|vietqr|qr/i },
];

export async function POST(req: Request) {
  return handler(async () => {
    const body = (await req.json().catch(() => ({}))) as { topic?: Topic; text?: string };
    let topic: Topic | null = body.topic ?? null;
    if (!topic && body.text) topic = MATCH.find((m) => m.re.test(body.text as string))?.topic ?? null;
    if (!topic) return ok({ topic: "fallback", lines: [{ key: "fallback", params: { hotline: await hotline() } }] });
    return ok({ topic, lines: await answer(topic) });
  });
}
