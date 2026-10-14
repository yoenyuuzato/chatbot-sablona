import { ChatClient } from "@/components/ChatClient";

/** Stránka, která se načítá v iframe widgetu na webu zákazníka. */
export default function EmbedPage() {
  return <ChatClient embedded />;
}
