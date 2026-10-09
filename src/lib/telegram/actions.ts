"use server";

export async function reportIssueToTelegramAction(issueText: string, context: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { success: false, message: "Telegram is not configured." };
  }

  const text = `🚨 *Báo lỗi mới*\n\n*Ngữ cảnh:* ${context}\n*Nội dung:* ${issueText}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      throw new Error(`Telegram API error: ${res.statusText}`);
    }

    return { success: true, message: "Đã gửi báo lỗi thành công." };
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return { success: false, message: "Không thể gửi báo lỗi lúc này." };
  }
}
