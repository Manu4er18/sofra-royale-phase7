import { redirect } from "next/navigation";

export default function RemovedLiveChatPage() {
  redirect("/admin/messages");
}
