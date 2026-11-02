import { redirect } from 'next/navigation';
import { CHAT_ENABLED } from '@/lib/features';
import ChatView from './ChatView';

export default function ChatPage() {
  if (!CHAT_ENABLED) {
    redirect('/home');
  }
  return <ChatView />;
}
